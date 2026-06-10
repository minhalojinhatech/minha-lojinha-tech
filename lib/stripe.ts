import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_NOT_CONFIGURED");

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "Minha Lojinha Tech",
      version: "1.0.0"
    }
  });

  return stripeClient;
}

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) throw new Error("SITE_URL_NOT_CONFIGURED");
  return configuredUrl.replace(/\/+$/, "");
}
