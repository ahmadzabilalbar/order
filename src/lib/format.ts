import type { OrderLine, Seller } from "./types";

const currency = process.env.NEXT_PUBLIC_CURRENCY || "MYR";
const locale = process.env.NEXT_PUBLIC_LOCALE || "en-MY";
const timeZone = process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Kuala_Lumpur";

const money = new Intl.NumberFormat(locale, { style: "currency", currency });

export const formatPrice = (n: number) => money.format(n);

/** e.g. "2× Sosej Pintal (2 pcs/pack)" */
export const formatLine = (l: OrderLine) => `${l.qty}× ${l.name}${l.unit ? ` (${l.unit})` : ""}`;

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

/** Today's date as YYYY-MM-DD in the app's time zone. Call only at request time. */
export const todayISO = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** Formats a YYYY-MM-DD date, e.g. "21 Oct". */
export const formatDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

export type SellerStatus = "open" | "upcoming" | "ended" | "inactive";

/** Whether a seller is taking orders on `today`; start and end dates are inclusive. */
export function sellerStatus(s: Seller, today: string): SellerStatus {
  if (!s.active) return "inactive";
  if (s.startDate && today < s.startDate) return "upcoming";
  if (s.endDate && today > s.endDate) return "ended";
  return "open";
}

/** Short human description of a seller's ordering window, or "" when it has none. */
export function sellerWindow(s: Seller) {
  if (s.startDate && s.endDate) return `${formatDay(s.startDate)} – ${formatDay(s.endDate)}`;
  if (s.startDate) return `from ${formatDay(s.startDate)}`;
  if (s.endDate) return `until ${formatDay(s.endDate)}`;
  return "";
}
