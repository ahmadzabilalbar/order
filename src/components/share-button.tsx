"use client";

import { shareOrder } from "@/lib/share";
import type { Order } from "@/lib/types";

/** Sends one order (and its seller's payment QR, if any) to WhatsApp. */
export function ShareButton({ order, qr, className = "" }: { order: Order; qr?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => shareOrder(order, qr ?? "")}
      aria-label={`Share order ${order.id} to WhatsApp`}
      title={qr ? "Share to WhatsApp with payment QR" : "Share to WhatsApp"}
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z" />
      </svg>
      <span>Share</span>
    </button>
  );
}
