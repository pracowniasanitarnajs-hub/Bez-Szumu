import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bs_admin";

function expectedToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("bez-szumu-admin-session").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return safeEqual(input, pw);
}

export function sessionToken(): string {
  const t = expectedToken();
  if (!t) throw new Error("Brak ADMIN_PASSWORD");
  return t;
}

export async function isAdmin(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const given = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  return safeEqual(given, expected);
}
