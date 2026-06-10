import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function fulfillStripeCheckout(session: Stripe.Checkout.Session) {
  const orderId = String(session.metadata?.order_id || session.client_reference_id || "");
  if (!orderId) throw new Error("STRIPE_ORDER_NOT_FOUND");

  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new Error("STRIPE_ORDER_NOT_FOUND");

    const order = orderSnapshot.data()!;
    if (order.status === "Pagamento confirmado") return;

    const expectedAmount = Math.round(Number(order.total || 0) * 100);
    const amountMatches = expectedAmount === Number(session.amount_total || 0);
    const paid = session.payment_status === "paid" && session.currency === "brl" && amountMatches;
    if (!paid) throw new Error("STRIPE_PAYMENT_NOT_PAID");

    transaction.update(orderRef, {
      status: "Pagamento confirmado",
      paymentStatus: session.payment_status,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
      paidAmount: Number(session.amount_total || 0) / 100,
      paymentApprovedAt: FieldValue.serverTimestamp(),
      paymentAmountMismatch: false,
      updatedAt: FieldValue.serverTimestamp()
    });

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item) => {
      if (!item?.productId) return;
      transaction.update(db.collection("products").doc(String(item.productId)), {
        available: false,
        status: "Vendido",
        reservedOrderId: orderId,
        reservedUntil: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });
  });

  return orderId;
}
