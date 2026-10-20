"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { store } from "@/lib/store";
import type { ActionResult, Order } from "@/lib/types";

type PlaceOrderInput = {
  name: string;
  note: string;
  sellerId: string;
  cart: Record<string, number>;
};

export async function placeOrder(input: PlaceOrderInput): Promise<ActionResult<Order>> {
  const name = String(input.name ?? "").trim().slice(0, 60);
  const note = String(input.note ?? "").trim().slice(0, 300);
  if (!name) return { ok: false, error: "Please choose your name." };

  try {
    // Re-read the menu uncached so prices and availability come from the sheet,
    // never from the client.
    const [allItems, sellers] = await Promise.all([store.listItems(), store.listSellers()]);

    // When sellers are set up, the order must be for an active seller and may only
    // contain that seller's items (or items shared by all sellers).
    let seller = "";
    if (sellers.length) {
      const chosen = sellers.find((s) => s.id === input.sellerId);
      if (!chosen?.active) return { ok: false, error: "Please choose an open seller." };
      seller = chosen.name;
    }
    const sellsItem = (sellerOfItem: string) =>
      !sellers.length || !sellerOfItem || sellerOfItem === input.sellerId;

    const items = new Map(allItems.map((i) => [i.id, i]));
    const lines = Object.entries(input.cart ?? {})
      .map(([id, qty]) => ({ item: items.get(id), qty: Math.floor(Number(qty)) }))
      .filter(({ item, qty }) => item?.available && sellsItem(item.seller) && qty > 0 && qty <= 99)
      .map(({ item, qty }) => ({ itemId: item!.id, name: item!.name, price: item!.price, qty }));

    if (!lines.length) {
      return { ok: false, error: "Your cart is empty or items are no longer available." };
    }

    const order: Order = {
      id: randomUUID().slice(0, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      name,
      note,
      seller,
      lines,
      total: Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100,
    };
    await store.addOrder(order);
    updateTag("orders");
    return { ok: true, data: order };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't place your order. Please try again." };
  }
}
