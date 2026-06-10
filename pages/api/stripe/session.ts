import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStripe } from "@/lib/stripe";
import { fulfillStripeCheckout } from "@/lib/stripeOrders";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  try {
    const sessionId = Array.isArray(req.query.session_id) ? req.query.session_id[0] : req.query.session_id;
    if (!sessionId?.startsWith("cs_")) return res.status(400).json({ error: "Sessão inválida." });

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const orderId = String(session.metadata?.order_id || session.client_reference_id || "");
    if (!orderId) return res.status(404).json({ error: "Pedido não encontrado." });

    if (session.payment_status === "paid") {
      await fulfillStripeCheckout(session);
    }

    const orderSnapshot = await getAdminDb().collection("orders").doc(orderId).get();
    if (!orderSnapshot.exists) return res.status(404).json({ error: "Pedido não encontrado." });

    const order = orderSnapshot.data()!;
    return res.status(200).json({
      orderId,
      orderCode: String(order.orderCode || orderId),
      paymentStatus: session.payment_status,
      paid: session.payment_status === "paid" && order.status === "Pagamento confirmado"
    });
  } catch (error) {
    console.error("Failed to retrieve Stripe Checkout Session", error);
    return res.status(500).json({ error: "Não foi possível confirmar o pagamento agora." });
  }
}
