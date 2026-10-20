import "server-only";
import type { Item, Order, Seller, Store } from "./types";

/**
 * In-memory demo store used when Google Sheets credentials are not set.
 * Data resets whenever the server restarts — local development only.
 */

type Db = { items: Item[]; sellers: Seller[]; names: string[]; orders: Order[] };

const g = globalThis as unknown as { __orderDb?: Db };
const db: Db = (g.__orderDb ??= {
  items: [
    { id: "latte", name: "Caffè Latte", price: 9.5, category: "Drinks", available: true, seller: "kopi", unit: "1 cup" },
    { id: "mocha", name: "Mocha", price: 10.5, category: "Drinks", available: true, seller: "kopi", unit: "1 cup" },
    { id: "teh-tarik", name: "Teh Tarik", price: 4.5, category: "Drinks", available: true, seller: "kopi", unit: "1 cup" },
    { id: "nasi-lemak", name: "Nasi Lemak", price: 8, category: "Food", available: true, seller: "dapur", unit: "1 pack" },
    { id: "croissant", name: "Butter Croissant", price: 6.9, category: "Food", available: true, seller: "dapur", unit: "2 pcs/pack" },
    { id: "brownie", name: "Fudge Brownie", price: 5.5, category: "Dessert", available: false, seller: "", unit: "1 pc" },
  ],
  sellers: [
    { id: "kopi", name: "Kopi Sini", active: true, startDate: "", endDate: "", deliveryDate: "" },
    { id: "dapur", name: "Dapur Sini", active: true, startDate: "2026-01-01", endDate: "2030-12-31", deliveryDate: "2031-01-03" },
    { id: "kerabu", name: "Nasi Kerabu Pak Su", active: true, startDate: "2030-01-01", endDate: "", deliveryDate: "" },
    { id: "roti", name: "Roti Corner", active: false, startDate: "", endDate: "", deliveryDate: "" },
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
  async listSellers() {
    return structuredClone(db.sellers);
  },
  async addSeller(seller) {
    db.sellers.push(seller);
  },
  async updateSeller(id, patch) {
    const seller = db.sellers.find((s) => s.id === id);
    if (!seller) throw new Error("Seller not found");
    Object.assign(seller, patch);
  },
  async deleteSeller(id) {
    db.sellers = db.sellers.filter((s) => s.id !== id);
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
