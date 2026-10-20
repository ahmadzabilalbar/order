"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { canEditOrder, orderSeller, sameName, sellerStatus, todayISO } from "@/lib/format";
import { store } from "@/lib/store";
import type { ActionResult, Order } from "@/lib/types";

type OrderInput = {
  name: string;
  note: string;
  sellerId: string;
  cart: Record<string, number>;
};

type Built = Pick<Order, "name" | "note" | "seller" | "sellerId" | "deliveryDate" | "lines" | "total">;

/**
 * Validates an order against the sheet: the seller must be taking orders and
 * prices/availability always come from the sheet, never from the client.
 */
async function buildOrder(input: OrderInput): Promise<{ ok: true; data: Built } | { ok: false; error: string }> {
  const name = String(input.name ?? "").trim().slice(0, 60);
  const note = String(input.note ?? "").trim().slice(0, 300);
  if (!name) return { ok: false, error: "Please choose your name." };

  const [allItems, sellers] = await Promise.all([store.listItems(), store.listSellers()]);

  // When sellers are set up, the order must be for an open seller and may only
  // contain that seller's items (or items shared by all sellers).
  let seller = "";
  let sellerId = "";
  let deliveryDate = "";
  if (sellers.length) {
    const chosen = sellers.find((s) => s.id === input.sellerId);
    if (!chosen || sellerStatus(chosen, todayISO()) !== "open") {
      return { ok: false, error: "This seller isn't taking orders right now." };
    }
    seller = chosen.name;
    sellerId = chosen.id;
    deliveryDate = chosen.deliveryDate;
  }
  const sellsItem = (sellerOfItem: string) => !sellers.length || !sellerOfItem || sellerOfItem === sellerId;

  const items = new Map(allItems.map((i) => [i.id, i]));
  const lines = Object.entries(input.cart ?? {})
    .map(([id, qty]) => ({ item: items.get(id), qty: Math.floor(Number(qty)) }))
    .filter(({ item, qty }) => item?.available && sellsItem(item.seller) && qty > 0 && qty <= 99)
    .map(({ item, qty }) => ({ itemId: item!.id, name: item!.name, price: item!.price, unit: item!.unit, qty }));

  if (!lines.length) return { ok: false, error: "Your cart is empty or items are no longer available." };

  const total = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;
  return { ok: true, data: { name, note, seller, sellerId, deliveryDate, lines, total } };
}

/**
 * An order already placed under this name for the same seller in its current
 * ordering window (or anywhere, when there are no sellers). One order per name.
 */
async function existingOrder(name: string, sellerId: string) {
  const [orders, sellers] = await Promise.all([store.listOrders(Infinity), store.listSellers()]);
  const seller = sellers.find((s) => s.id === sellerId);
  return orders.find(
    (o) =>
      sameName(o.name, name) &&
      (!seller ||
        (orderSeller(o, sellers)?.id === seller.id &&
          (!seller.startDate || todayISO(new Date(o.createdAt)) >= seller.startDate))),
  );
}

export async function placeOrder(
  input: OrderInput,
): Promise<ActionResult<Order> | { ok: false; error: string; existingId: string }> {
  try {
    const built = await buildOrder(input);
    if (!built.ok) return built;
    const existing = await existingOrder(built.data.name, built.data.sellerId);
    if (existing) {
      return {
        ok: false,
        error: `${existing.name} already has an order (#${existing.id}).`,
        existingId: existing.id,
      };
    }
    const order: Order = {
      id: randomUUID().slice(0, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: "",
      ...built.data,
    };
    await store.addOrder(order);
    updateTag("orders");
    return { ok: true, data: order };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't place your order. Please try again." };
  }
}

/**
 * Loads an order and checks it can still be changed: the caller must confirm the
 * name it was placed under, and its seller must still be taking orders.
 */
async function editableOrder(id: string, confirmName: string) {
  const [orders, sellers] = await Promise.all([store.listOrders(Infinity), store.listSellers()]);
  const order = orders.find((o) => o.id === id);
  if (!order) return { ok: false as const, error: "This order no longer exists." };
  if (!sameName(String(confirmName ?? ""), order.name)) {
    return { ok: false as const, error: "That name doesn't match this order." };
  }
  if (!canEditOrder(order, sellers, todayISO())) {
    return { ok: false as const, error: "Orders for this seller are closed, so it can't be changed." };
  }
  return { ok: true as const, order, sellerId: orderSeller(order, sellers)?.id ?? "" };
}

export async function updateOrder(
  id: string,
  input: { confirmName: string; note: string; cart: Record<string, number> },
): Promise<ActionResult<Order>> {
  try {
    const found = await editableOrder(id, input.confirmName);
    if (!found.ok) return found;
    // The name and seller of an order stay the same; edits are re-validated like a new order.
    const built = await buildOrder({
      name: found.order.name,
      note: input.note,
      cart: input.cart,
      sellerId: found.sellerId,
    });
    if (!built.ok) return built;
    const order: Order = { ...found.order, ...built.data, updatedAt: new Date().toISOString() };
    await store.updateOrder(order);
    updateTag("orders");
    return { ok: true, data: order };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't save your changes. Please try again." };
  }
}

export async function cancelOrder(id: string, confirmName: string): Promise<ActionResult> {
  try {
    const found = await editableOrder(id, confirmName);
    if (!found.ok) return found;
    await store.deleteOrder(id);
    updateTag("orders");
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't cancel the order. Please try again." };
  }
}
