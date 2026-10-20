export type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  /** Seller id; empty means the item is offered by every seller. */
  seller: string;
};

export type Seller = {
  id: string;
  name: string;
  active: boolean;
};

export type OrderLine = {
  itemId: string;
  name: string;
  price: number;
  qty: number;
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
  listOrders(limit: number): Promise<Order[]>;
}
