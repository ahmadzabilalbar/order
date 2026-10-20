import "server-only";
import type { Item, Order, Store } from "./types";

/**
 * In-memory demo store used when Google Sheets credentials are not set.
 * Data resets whenever the server restarts — local development only.
 */

type Db = { items: Item[]; names: string[]; orders: Order[] };

const g = globalThis as unknown as { __orderDb?: Db };
const db: Db = (g.__orderDb ??= {
  items: [
    { id: "latte", name: "Caffè Latte", price: 9.5, category: "Drinks", available: true },
    { id: "mocha", name: "Mocha", price: 10.5, category: "Drinks", available: true },
    { id: "teh-tarik", name: "Teh Tarik", price: 4.5, category: "Drinks", available: true },
    { id: "nasi-lemak", name: "Nasi Lemak", price: 8, category: "Food", available: true },
    { id: "croissant", name: "Butter Croissant", price: 6.9, category: "Food", available: true },
    { id: "brownie", name: "Fudge Brownie", price: 5.5, category: "Dessert", available: false },
  ],
  names: ["Aina", "Daniel", "Farah", "Hafiz", "Mei Ling"],
  orders: [],
});

export const memoryStore: Store = {
  async listItems() {
    return structuredClone(db.items);
  },
  async addItem(item) {
    db.items.push(item);
  },
  async updateItem(id, patch) {
    const item = db.items.find((i) => i.id === id);
    if (!item) throw new Error("Item not found");
    Object.assign(item, patch);
  },
  async deleteItem(id) {
    db.items = db.items.filter((i) => i.id !== id);
  },
  async listNames() {
    return [...db.names];
  },
  async addName(name) {
    db.names.push(name);
  },
  async deleteName(name) {
    db.names = db.names.filter((n) => n !== name);
  },
  async addOrder(order) {
    db.orders.push(order);
  },
  async listOrders(limit) {
    return structuredClone(db.orders).reverse().slice(0, limit);
  },
};
