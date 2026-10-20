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
async function guarded(tag: string, fn: () => Promise<void>): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Session expired. Please sign in again." };
  try {
    await fn();
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
  updateTag(tag);
  refresh();
  return { ok: true };
}

function parseItem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const category = String(formData.get("category") ?? "").trim().slice(0, 40);
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!name) throw new Error("Item name is required.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
  return { name, category, price: Math.round(price * 100) / 100 };
}

export async function addItem(_: unknown, formData: FormData) {
  return guarded("items", async () => {
    const fields = parseItem(formData);
    const slug = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await store.addItem({
      id: `${slug || "item"}-${randomUUID().slice(0, 4)}`,
      available: true,
      ...fields,
    });
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
