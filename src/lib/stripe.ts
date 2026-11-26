import { createHmac, timingSafeEqual } from "node:crypto";

// Minimalny klient Stripe przez REST (bez dodatkowych zależności).
export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim() && !!process.env.STRIPE_PRICE_MONTHLY?.trim() && !!process.env.STRIPE_PRICE_YEARLY?.trim();
}

export function priceFor(plan: string): string | null {
  if (plan === "monthly") return process.env.STRIPE_PRICE_MONTHLY?.trim() || null;
  if (plan === "yearly") return process.env.STRIPE_PRICE_YEARLY?.trim() || null;
  return null;
}

export async function stripeApi<T = any>(method: "GET" | "POST" | "DELETE", path: string, params?: Record<string, string>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Brak STRIPE_SECRET_KEY");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json?.error?.message ?? "błąd"}`);
  return json as T;
}

// Weryfikacja podpisu webhooka (nagłówek Stripe-Signature: t=...,v1=...).
export function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = parts["t"];
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const candidates = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return candidates.some((c) => {
    const a = Buffer.from(c, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export function siteBase(request: Request): string {
  const u = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? u.host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
