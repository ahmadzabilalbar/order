import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { memoryStore } from "./memory";
import { sheetsConfigured, sheetsStore } from "./sheets";

export const store = sheetsConfigured() ? sheetsStore : memoryStore;
export const isDemo = !sheetsConfigured();

/** Cached menu + names for the order page. Admin actions expire these tags. */
export async function getMenu() {
  "use cache";
  cacheTag("items");
  cacheLife("minutes"); // also picks up edits made directly in the sheet
  return (await store.listItems()).filter((i) => i.available);
}

export async function getNames() {
  "use cache";
  cacheTag("names");
  cacheLife("minutes");
  return (await store.listNames()).sort((a, b) => a.localeCompare(b));
}

export async function getOrders() {
  "use cache";
  cacheTag("orders");
  cacheLife("minutes");
  return store.listOrders(Infinity);
}
