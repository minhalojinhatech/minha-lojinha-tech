import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { createOrderCode } from "@/lib/orderCode";

type CheckoutPayload = {
  items?: Array<{ productId?: string; quantity?: number }>;
  couponCode?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  delivery?: {
    method?: string;
    pickupPoint?: string;
    pickupSchedule?: string;
    address?: string;
    addressData?: Record<string, string>;
    notes?: string;
  };
  paymentMethod?: "checkout" | "presencial";
};

type PreparedOrder = {
  orderId: string;
  orderCode: string;
  total: number;
  payerEmail: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; image: string }>;
};

const PAYMENT_RESERVATION_MS = 10 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const token = readBearerToken(req);
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const payload = req.body as CheckoutPayload;
    validatePayload(payload);

    const prepared = await createReservedOrder(decodedToken.uid, decodedToken.email || "", payload);

    if (payload.paymentMethod === "presencial") {
      return res.status(201).json({
        orderId: prepared.orderId,
        orderCode: prepared.orderCode
      });
    }

    let stripeSessionId = "";
    try {
      const siteUrl = getSiteUrl();
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        locale: "pt-BR",
        client_reference_id: prepared.orderId,
        customer_email: prepared.payerEmail,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: Math.round(prepared.total * 100),
            product_data: {
              name: `Pedido ${prepared.orderCode}`,
              description: prepared.items.map((item) => item.name).join(", ").slice(0, 250)
            }
          }
        }],
        metadata: {
          order_id: prepared.orderId,
          order_code: prepared.orderCode
        },
        payment_intent_data: {
          metadata: {
            order_id: prepared.orderId,
            order_code: prepared.orderCode
          }
        },
        branding_settings: {
          display_name: "Minha Lojinha Tech",
          background_color: "#ffffff",
          button_color: "#111827",
          border_style: "rectangular",
          font_family: "inter"
        },
        success_url: `${siteUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pagamento/cancelado?pedido=${encodeURIComponent(prepared.orderCode)}`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60
      }, {
        idempotencyKey: prepared.orderId
      });
      stripeSessionId = session.id;

      if (!session.url) {
        throw new Error("STRIPE_INVALID_SESSION");
      }

      await getAdminDb().collection("orders").doc(prepared.orderId).update({
        stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url,
        updatedAt: FieldValue.serverTimestamp()
      });

      return res.status(201).json({
        orderId: prepared.orderId,
        orderCode: prepared.orderCode,
        checkoutUrl: session.url
      });
    } catch (error) {
      if (stripeSessionId) {
        await getStripe().checkout.sessions.expire(stripeSessionId).catch(() => undefined);
      }
      await rollbackOrder(prepared.orderId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "INVALID_AUTH_TOKEN") return res.status(401).json({ error: "Entre novamente na sua conta." });
    if (message === "INVALID_CHECKOUT") return res.status(400).json({ error: "Revise os dados do checkout." });
    if (message === "PRODUCT_UNAVAILABLE") return res.status(409).json({ error: "Um dos produtos não está mais disponível." });
    if (message === "COUPON_UNAVAILABLE") return res.status(409).json({ error: "Este cupom não está mais disponível." });
    if (message === "COUPON_USER_LIMIT") return res.status(409).json({ error: "Você já atingiu o limite de uso deste cupom." });
    if (message === "FIREBASE_ADMIN_NOT_CONFIGURED" || message === "FIREBASE_ADMIN_INVALID_CREDENTIAL") {
      console.error("Firebase Admin configuration error", error);
      return res.status(503).json({
        error: "O checkout ainda não está conectado ao servidor da loja. A configuração administrativa do Firebase está incompleta."
      });
    }
    if (message === "STRIPE_NOT_CONFIGURED" || message === "SITE_URL_NOT_CONFIGURED") {
      console.error("Stripe configuration error", error);
      return res.status(503).json({
        error: "A configuração da Stripe está incompleta no servidor."
      });
    }

    console.error("Failed to create order", error);
    return res.status(500).json({ error: "Não foi possível iniciar o pagamento agora." });
  }
}

function readBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("INVALID_AUTH_TOKEN");
  return authorization.slice(7);
}

function validatePayload(payload: CheckoutPayload) {
  const hasItems = Array.isArray(payload.items) && payload.items.length > 0;
  const hasCustomer = Boolean(payload.customer?.name && payload.customer?.email && payload.customer?.phone);
  const validPayment = payload.paymentMethod === "checkout" || payload.paymentMethod === "presencial";
  const hasDelivery = Boolean(payload.delivery?.method);
  const validPayOnPickup =
    payload.paymentMethod !== "presencial" ||
    payload.delivery?.method?.toLowerCase().includes("retirar");

  if (!hasItems || !hasCustomer || !validPayment || !hasDelivery || !validPayOnPickup) {
    throw new Error("INVALID_CHECKOUT");
  }
}

async function createReservedOrder(uid: string, authenticatedEmail: string, payload: CheckoutPayload): Promise<PreparedOrder> {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc();
  const orderCode = createOrderCode(`CLI-${uid.slice(0, 6).toUpperCase()}`);
  const requestedItems = payload.items!.map((item) => ({
    productId: String(item.productId || ""),
    quantity: 1
  })).filter((item) => item.productId);

  if (!requestedItems.length) throw new Error("INVALID_CHECKOUT");

  const productRefs = requestedItems.map((item) => db.collection("products").doc(item.productId));
  const initialProducts = await db.getAll(...productRefs);
  const expiredOrderIds = [...new Set(initialProducts.flatMap((snapshot) => {
    const data = snapshot.data();
    const expired = data?.reservedUntil?.toMillis instanceof Function && data.reservedUntil.toMillis() <= Date.now();
    return expired && data?.reservedOrderId ? [String(data.reservedOrderId)] : [];
  }))];

  await Promise.all(expiredOrderIds.map(rollbackOrder));

  return db.runTransaction(async (transaction) => {
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const products = productSnapshots.map((snapshot, index) => {
      const data = snapshot.data();
      const reservationExpired =
        data?.reservedUntil?.toMillis instanceof Function &&
        data.reservedUntil.toMillis() <= Date.now();
      if (!snapshot.exists || (data?.available === false && !reservationExpired)) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }
      return {
        productId: snapshot.id,
        name: String(data?.name || "Produto"),
        quantity: requestedItems[index].quantity,
        price: Number(data?.price || 0),
        image: String(data?.image || "")
      };
    });

    const subtotal = roundCurrency(products.reduce((sum, item) => sum + item.price * item.quantity, 0));
    let coupon: Record<string, unknown> | null = null;
    let discount = 0;
    let couponRef: FirebaseFirestore.DocumentReference | null = null;
    let usageRef: FirebaseFirestore.DocumentReference | null = null;

    if (payload.couponCode) {
      const normalizedCode = normalizeCouponCode(payload.couponCode);
      const couponQuery = await db.collection("coupons").where("code", "==", normalizedCode).limit(1).get();
      const couponMatch = couponQuery.docs[0];
      if (!couponMatch) throw new Error("COUPON_UNAVAILABLE");

      couponRef = couponMatch.ref;
      const couponSnapshot = await transaction.get(couponRef);
      if (!couponSnapshot.exists) throw new Error("COUPON_UNAVAILABLE");
      const couponData = couponSnapshot.data()!;
      usageRef = db.collection("couponUsages").doc(`${uid}_${couponSnapshot.id}`);
      const usageSnapshot = await transaction.get(usageRef);
      const currentUsage = Number(usageSnapshot.data()?.count || 0);
      const today = new Date().toISOString().slice(0, 10);
      const usageLimit = Number(couponData.usageLimit || 0);
      const perUserLimit = Number(couponData.perUserLimit || 0);
      const usedCount = Number(couponData.usedCount || 0);
      const unavailable =
        couponData.active === false ||
        (couponData.startsAt && String(couponData.startsAt) > today) ||
        (couponData.endsAt && String(couponData.endsAt) < today) ||
        (usageLimit > 0 && usedCount >= usageLimit) ||
        subtotal < Number(couponData.minSubtotal || 0);

      if (unavailable) throw new Error("COUPON_UNAVAILABLE");
      if (perUserLimit > 0 && currentUsage >= perUserLimit) throw new Error("COUPON_USER_LIMIT");

      const value = Number(couponData.value || 0);
      const rawDiscount = couponData.type === "Valor fixo" ? value : subtotal * (value / 100);
      discount = roundCurrency(Math.max(0, Math.min(subtotal, rawDiscount)));
      coupon = {
        id: couponSnapshot.id,
        code: normalizedCode,
        title: String(couponData.title || normalizedCode),
        type: String(couponData.type || "Percentual"),
        value,
        discount
      };

      transaction.set(usageRef, {
        couponId: couponSnapshot.id,
        couponCode: normalizedCode,
        customerId: uid,
        count: currentUsage + 1,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.update(couponRef, {
        usedCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    const total = roundCurrency(subtotal - discount);
    if (total <= 0) throw new Error("INVALID_CHECKOUT");

    transaction.set(orderRef, {
      orderCode,
      customerId: uid,
      customer: {
        name: String(payload.customer!.name),
        email: authenticatedEmail || String(payload.customer!.email),
        phone: String(payload.customer!.phone),
        document: String(payload.customer!.document || "")
      },
      items: products,
      subtotal,
      discount,
      total,
      coupon,
      status: payload.paymentMethod === "checkout" ? "Aguardando pagamento" : "Pedido recebido",
      paymentMethod: payload.paymentMethod === "checkout" ? "Stripe Checkout" : "Pagar na retirada",
      paymentProvider: payload.paymentMethod === "checkout" ? "stripe" : "presencial",
      deliveryMethod: String(payload.delivery!.method),
      pickupPoint: String(payload.delivery!.pickupPoint || ""),
      pickupSchedule: String(payload.delivery!.pickupSchedule || ""),
      deliveryAddress: String(payload.delivery!.address || ""),
      deliveryAddressData: payload.delivery!.addressData || {},
      deliveryNotes: String(payload.delivery!.notes || ""),
      ...(payload.paymentMethod === "checkout" ? {
        reservationExpiresAt: Timestamp.fromMillis(Date.now() + PAYMENT_RESERVATION_MS)
      } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    productRefs.forEach((productRef) => {
      transaction.update(productRef, {
        available: false,
        status: "Reservado",
        reservedOrderId: orderRef.id,
        reservedUntil: payload.paymentMethod === "checkout"
          ? Timestamp.fromMillis(Date.now() + PAYMENT_RESERVATION_MS)
          : FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return {
      orderId: orderRef.id,
      orderCode,
      total,
      payerEmail: authenticatedEmail || String(payload.customer!.email),
      items: products
    };
  });
}

async function rollbackOrder(orderId: string) {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(orderId);
  const initialOrder = await orderRef.get();
  const stripeSessionId = initialOrder.data()?.stripeCheckoutSessionId;

  if (stripeSessionId) {
    await getStripe().checkout.sessions.expire(String(stripeSessionId)).catch(() => undefined);
  }

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return;

    const order = orderSnapshot.data()!;
    const items = Array.isArray(order.items) ? order.items : [];
    const productRefs = items.map((item) => db.collection("products").doc(String(item.productId)));
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    const couponRef = order.coupon?.id ? db.collection("coupons").doc(String(order.coupon.id)) : null;
    const usageRef = order.coupon?.id ? db.collection("couponUsages").doc(`${order.customerId}_${order.coupon.id}`) : null;
    const usageSnapshot = usageRef ? await transaction.get(usageRef) : null;

    productSnapshots.forEach((snapshot) => {
      if (snapshot.data()?.reservedOrderId !== orderId) return;
      transaction.update(snapshot.ref, {
        available: true,
        status: "Disponível",
        reservedOrderId: FieldValue.delete(),
        reservedUntil: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    if (couponRef && usageRef && usageSnapshot) {
      const nextCount = Math.max(0, Number(usageSnapshot.data()?.count || 0) - 1);

      transaction.update(couponRef, {
        usedCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp()
      });
      if (nextCount === 0) transaction.delete(usageRef);
      else transaction.update(usageRef, { count: nextCount, updatedAt: FieldValue.serverTimestamp() });
    }

    transaction.delete(orderRef);
  });
}

function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
