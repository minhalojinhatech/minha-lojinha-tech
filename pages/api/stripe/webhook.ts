import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillStripeCheckout } from "@/lib/stripeOrders";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];
    if (!webhookSecret || !signature) throw new Error("STRIPE_WEBHOOK_NOT_CONFIGURED");

    const rawBody = await readRawBody(req);
    const event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") await fulfillStripeCheckout(session);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook rejected", error);
    return res.status(400).json({ error: "Notificação inválida." });
  }
}

async function readRawBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
