import { formatDay, formatPrice } from "./format";
import { dataUrlToFile } from "./qr";
import type { Order } from "./types";

/** WhatsApp-formatted summary of one order (*bold* is WhatsApp markup). */
export function orderText(o: Order, hasQr: boolean) {
  return [
    `*Order #${o.id}*${o.seller ? ` · ${o.seller}` : ""}`,
    `Name: ${o.name}`,
    ...(o.deliveryDate ? [`Delivery: ${formatDay(o.deliveryDate)}`] : []),
    "",
    ...o.lines.map((l) => `${l.qty}× ${l.name}${l.unit ? ` (${l.unit})` : ""} — ${formatPrice(l.price * l.qty)}`),
    "",
    `*Total: ${formatPrice(o.total)}*`,
    ...(hasQr ? ["Please pay using the QR code."] : []),
  ].join("\n");
}

/**
 * Shares an order with the payment QR attached through the device share sheet
 * (pick WhatsApp there). Where files can't be shared, opens WhatsApp with the
 * text and downloads the QR so it can be attached by hand.
 * Must run straight from a click: no awaits before share/open.
 */
export function shareOrder(o: Order, qr: string) {
  const text = orderText(o, !!qr);
  const file = qr ? dataUrlToFile(qr, `payment-qr-${o.id}`) : undefined;

  if (file && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], text }).catch(() => {}); // dismissed or failed: nothing to do
    return;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  if (qr) {
    const a = document.createElement("a");
    a.href = qr;
    a.download = file!.name;
    a.click();
  }
}
