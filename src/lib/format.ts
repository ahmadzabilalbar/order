const currency = process.env.NEXT_PUBLIC_CURRENCY || "MYR";
const locale = process.env.NEXT_PUBLIC_LOCALE || "en-MY";

const money = new Intl.NumberFormat(locale, { style: "currency", currency });

export const formatPrice = (n: number) => money.format(n);

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: process.env.NEXT_PUBLIC_TIMEZONE || "Asia/Kuala_Lumpur",
  });
