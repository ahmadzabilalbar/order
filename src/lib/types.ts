export type Item = {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
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
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface Store {
  listItems(): Promise<Item[]>;
  addItem(item: Item): Promise<void>;
  updateItem(id: string, patch: Partial<Omit<Item, "id">>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  listNames(): Promise<string[]>;
  addName(name: string): Promise<void>;
  deleteName(name: string): Promise<void>;
  addOrder(order: Order): Promise<void>;
  listOrders(limit: number): Promise<Order[]>;
}
