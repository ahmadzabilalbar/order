export type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  /** Seller id; empty means the item is offered by every seller. */
  seller: string;
  /** What one unit is, e.g. "1 pc", "2 pcs/pack", "500 g"; empty = not stated. */
  unit: string;
};

export type Seller = {
  id: string;
  name: string;
  active: boolean;
  /** First day orders are accepted (YYYY-MM-DD); empty = no start limit. */
  startDate: string;
  /** Last day orders are accepted (YYYY-MM-DD); empty = no end limit. */
  endDate: string;
  /** When orders are delivered (YYYY-MM-DD); empty = not announced. */
  deliveryDate: string;
  /** Payment QR code as an image data URL; empty = none uploaded. */
  qr: string;
};

export type OrderLine = {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  /** Item unit at the time of ordering (may be missing on older orders). */
  unit?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  name: string;
  lines: OrderLine[];
  total: number;
  note: string;
  /** Seller name at the time of ordering (empty when sellers aren't used). */
  seller: string;
  /** Seller's delivery date at the time of ordering (YYYY-MM-DD or empty). */
  deliveryDate: string;
  /** Seller id (empty on orders made before this was recorded). */
  sellerId: string;
  /** ISO time of the last edit; empty if never edited. */
  updatedAt: string;
  /** Marked by the admin once the buyer has paid (QR or cash). */
  paid: boolean;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface Store {
  listItems(): Promise<Item[]>;
  addItem(item: Item): Promise<void>;
  updateItem(id: string, patch: Partial<Omit<Item, "id">>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  listSellers(): Promise<Seller[]>;
  addSeller(seller: Seller): Promise<void>;
  updateSeller(id: string, patch: Partial<Omit<Seller, "id">>): Promise<void>;
  deleteSeller(id: string): Promise<void>;
  listNames(): Promise<string[]>;
  addName(name: string): Promise<void>;
  deleteName(name: string): Promise<void>;
  addOrder(order: Order): Promise<void>;
  updateOrder(order: Order): Promise<void>;
  deleteOrder(id: string): Promise<void>;
  listOrders(limit: number): Promise<Order[]>;
}
