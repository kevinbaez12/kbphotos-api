import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { items = [], tax_cents = 0, metadata = {} } = req.body || {};
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });

    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const line_items = [];
    for (const it of items) {
      if (!it?.name || typeof it?.amount_cents !== "number") continue;
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: it.name },
          unit_amount: Math.max(0, Math.round(it.amount_cents))
        },
        quantity: 1
      });
    }
    if (tax_cents > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Sales Tax (8%)" },
          unit_amount: Math.round(tax_cents)
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: "https://kevinbaezphotos.com/thanks",
      cancel_url: "https://kevinbaezphotos.com/cancel",
      metadata
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error", err);
    return res.status(500).json({ error: "Checkout creation failed" });
  }
}
