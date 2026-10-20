import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not set");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && safeEqual(input, expected!);
}

export async function createSession() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}
