"use server";

import { randomUUID } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { checkPassword, createSession, destroySession, isAdmin } from "@/lib/auth";
import { store } from "@/lib/store";
import type { ActionResult } from "@/lib/types";

export async function login(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, error: "ADMIN_PASSWORD is not configured on the server." };
  }
  // Small fixed delay blunts brute-force attempts.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    return { ok: false, error: "Incorrect password." };
  }
  await createSession();
  refresh();
  return { ok: true };
}

export async function logout() {
  await destroySession();
  refresh();
}

/** Wraps an admin mutation with an auth check, error handling and cache refresh. */
async function guarded(tags: string | string[], fn: () => Promise<void>): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Session expired. Please sign in again." };
  try {
    await fn();
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
  for (const tag of [tags].flat()) updateTag(tag);
  refresh();
  return { ok: true };
}

function parseItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const category = String(formData.get("category") ?? "").trim().slice(0, 40);
  const seller = String(formData.get("seller") ?? "").trim();
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!name) throw new Error("Item name is required.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
  return { name, category, seller, price: Math.round(price * 100) / 100 };
}

const slugify = (text: string, fallback: string) =>
  `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback}-${randomUUID().slice(0, 4)}`;

export async function addItem(_: unknown, formData: FormData) {
  return guarded("items", async () => {
    const fields = parseItem(formData);
    await store.addItem({ id: slugify(fields.name, "item"), available: true, ...fields });
  });
}

export async function updateItem(id: string, _: unknown, formData: FormData) {
  return guarded("items", () => store.updateItem(id, parseItem(formData)));
}

export async function setAvailable(id: string, available: boolean) {
  return guarded("items", () => store.updateItem(id, { available }));
}

export async function deleteItem(id: string) {
  return guarded("items", () => store.deleteItem(id));
}

function parseSeller(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const date = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Dates must be YYYY-MM-DD.");
    return v;
  };
  const startDate = date("startDate");
  const endDate = date("endDate");
  const deliveryDate = date("deliveryDate");
  if (!name) throw new Error("Seller name is required.");
  if (startDate && endDate && endDate < startDate) throw new Error("End date must be on or after the start date.");
  if (deliveryDate && startDate && deliveryDate < startDate) {
    throw new Error("Delivery date can't be before the start date.");
  }
  return { name, startDate, endDate, deliveryDate };
}

async function assertUniqueSeller(name: string, exceptId?: string) {
  const existing = await store.listSellers();
  if (existing.some((s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" already exists.`);
  }
}

export async function addSeller(_: unknown, formData: FormData) {
  return guarded("sellers", async () => {
    const fields = parseSeller(formData);
    await assertUniqueSeller(fields.name);
    await store.addSeller({ id: slugify(fields.name, "seller"), active: true, ...fields });
  });
}

export async function updateSeller(id: string, _: unknown, formData: FormData) {
  return guarded("sellers", async () => {
    const fields = parseSeller(formData);
    await assertUniqueSeller(fields.name, id);
    await store.updateSeller(id, fields);
  });
}

export async function setSellerActive(id: string, active: boolean) {
  return guarded("sellers", () => store.updateSeller(id, { active }));
}

/** Deletes the seller and its own items. Past orders keep the seller's name. */
export async function deleteSeller(id: string) {
  return guarded(["sellers", "items"], async () => {
    const own = (await store.listItems()).filter((i) => i.seller === id);
    for (const item of own) await store.deleteItem(item.id);
    await store.deleteSeller(id);
  });
}

export async function addName(_: unknown, formData: FormData) {
  return guarded("names", async () => {
    const name = String(formData.get("name") ?? "").trim().slice(0, 60);
    if (!name) throw new Error("Name is required.");
    const existing = await store.listNames();
    if (existing.some((n) => n.toLowerCase() === name.toLowerCase())) {
      throw new Error(`"${name}" is already on the list.`);
    }
    await store.addName(name);
  });
}

export async function deleteName(name: string) {
  return guarded("names", () => store.deleteName(name));
}
