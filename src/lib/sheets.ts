import "server-only";
import { JWT } from "google-auth-library";
import type { Item, Order, OrderLine, Seller, Store } from "./types";

/**
 * Google Sheets-backed store. One spreadsheet, four tabs:
 *   Items:   id | name | price | category | available | seller
 *   Sellers: id | name | active
 *   Names:   name
 *   Orders:  id | created_at | name | items | total | note | lines_json | seller
 * Missing tabs and header rows are created automatically on first use, and
 * headers from an older version gain the new columns.
 */

const TABS = {
  Items: ["id", "name", "price", "category", "available", "seller"],
  Sellers: ["id", "name", "active"],
  Names: ["name"],
  Orders: ["id", "created_at", "name", "items", "total", "note", "lines_json", "seller"],
} as const;

type Tab = keyof typeof TABS;
type Cell = string | number | boolean;

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export function sheetsConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

let jwt: JWT | undefined;
function client() {
  jwt ??= new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Vercel / .env store the key with literal "\n" sequences.
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return jwt;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = await client().getAccessToken();
  const res = await fetch(`${BASE}/${process.env.GOOGLE_SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google Sheets API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Tab name -> numeric sheetId (needed for row deletion).
let schema: Promise<Record<string, number>> | undefined;

function ensureSchema() {
  schema ??= (async () => {
    const meta = await api<{
      sheets: { properties: { title: string; sheetId: number } }[];
    }>("?fields=sheets.properties(title,sheetId)");
    const ids: Record<string, number> = {};
    for (const s of meta.sheets) ids[s.properties.title] = s.properties.sheetId;

    const tabs = Object.keys(TABS) as Tab[];
    const missing = tabs.filter((t) => !(t in ids));
    if (missing.length) {
      const res = await api<{
        replies: { addSheet: { properties: { title: string; sheetId: number } } }[];
      }>(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      });
      for (const r of res.replies) {
        ids[r.addSheet.properties.title] = r.addSheet.properties.sheetId;
      }
    }

    // Write headers for new tabs, and extend headers that are a prefix of the
    // current columns (sheets created by an older version). Custom headers are left alone.
    const ranges = tabs.map((t) => `ranges=${t}!1:1`).join("&");
    const current = await api<{ valueRanges: { values?: Cell[][] }[] }>(`/values:batchGet?${ranges}`);
    const outdated = tabs.filter((t, i) => {
      const have = (current.valueRanges[i]?.values?.[0] ?? []).map(String);
      const want: readonly string[] = TABS[t];
      return have.length < want.length && have.every((h, j) => h === want[j]);
    });
    if (outdated.length) {
      await api("/values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: outdated.map((t) => ({ range: `${t}!A1`, values: [TABS[t]] })),
        }),
      });
    }
    return ids;
  })().catch((err) => {
    schema = undefined; // retry on next call
    throw err;
  });
  return schema;
}

/** Returns data rows (header excluded) with their 1-based sheet row number. */
async function readRows(tab: Tab) {
  await ensureSchema();
  const res = await api<{ values?: Cell[][] }>(
    `/values/${tab}!A2:Z?valueRenderOption=UNFORMATTED_VALUE`,
  );
  return (res.values ?? [])
    .map((cells, i) => ({ row: i + 2, cells }))
    .filter((r) => r.cells.some((c) => String(c ?? "").trim() !== ""));
}

async function appendRow(tab: Tab, cells: Cell[]) {
  await ensureSchema();
  // RAW input prevents user text such as "=IMPORTXML(...)" being run as a formula.
  await api(`/values/${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [cells] }),
  });
}

async function writeRow(tab: Tab, row: number, cells: Cell[]) {
  await api(`/values/${tab}!A${row}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [cells] }),
  });
}

async function deleteRow(tab: Tab, row: number) {
  const ids = await ensureSchema();
  await api(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: { sheetId: ids[tab], dimension: "ROWS", startIndex: row - 1, endIndex: row },
          },
        },
      ],
    }),
  });
}

const str = (v: Cell | undefined) => String(v ?? "").trim();
const bool = (v: Cell | undefined) =>
  v === undefined || v === "" ? true : !["false", "no", "0"].includes(str(v).toLowerCase());

function toItem(c: Cell[]): Item {
  return {
    id: str(c[0]),
    name: str(c[1]),
    price: Number(c[2]) || 0,
    category: str(c[3]),
    available: bool(c[4]),
    seller: str(c[5]),
  };
}

const itemCells = (i: Item): Cell[] => [i.id, i.name, i.price, i.category, i.available, i.seller];

function toSeller(c: Cell[], row: number): Seller {
  return { id: str(c[0]) || `row-${row}`, name: str(c[1]), active: bool(c[2]) };
}

function toOrder(c: Cell[]): Order {
  let lines: OrderLine[] = [];
  try {
    lines = JSON.parse(str(c[6]) || "[]");
  } catch {}
  return {
    id: str(c[0]),
    createdAt: str(c[1]),
    name: str(c[2]),
    lines,
    total: Number(c[4]) || 0,
    note: str(c[5]),
    seller: str(c[7]),
  };
}

async function findRow(tab: Tab, id: string) {
  const row = (await readRows(tab)).find((r) => str(r.cells[0]) === id || `row-${r.row}` === id);
  if (!row) throw new Error(`${tab === "Items" ? "Item" : "Seller"} not found`);
  return row;
}

export const sheetsStore: Store = {
  async listItems() {
    // Rows added by hand in the sheet without an id get a stable fallback id.
    return (await readRows("Items"))
      .map((r) => ({ ...toItem(r.cells), id: str(r.cells[0]) || `row-${r.row}` }))
      .filter((i) => i.name);
  },
  async addItem(item) {
    await appendRow("Items", itemCells(item));
  },
  async updateItem(id, patch) {
    const { row, cells } = await findRow("Items", id);
    await writeRow("Items", row, itemCells({ ...toItem(cells), ...patch, id: str(cells[0]) || id }));
  },
  async deleteItem(id) {
    await deleteRow("Items", (await findRow("Items", id)).row);
  },

  async listSellers() {
    return (await readRows("Sellers")).map((r) => toSeller(r.cells, r.row)).filter((s) => s.name);
  },
  async addSeller(seller) {
    await appendRow("Sellers", [seller.id, seller.name, seller.active]);
  },
  async updateSeller(id, patch) {
    const { row, cells } = await findRow("Sellers", id);
    const next = { ...toSeller(cells, row), ...patch };
    await writeRow("Sellers", row, [str(cells[0]) || id, next.name, next.active]);
  },
  async deleteSeller(id) {
    await deleteRow("Sellers", (await findRow("Sellers", id)).row);
  },

  async listNames() {
    return (await readRows("Names")).map((r) => str(r.cells[0])).filter(Boolean);
  },
  async addName(name) {
    await appendRow("Names", [name]);
  },
  async deleteName(name) {
    const row = (await readRows("Names")).find((r) => str(r.cells[0]) === name);
    if (row) await deleteRow("Names", row.row);
  },

  async addOrder(o) {
    const summary = o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ");
    await appendRow("Orders", [
      o.id,
      o.createdAt,
      o.name,
      summary,
      o.total,
      o.note,
      JSON.stringify(o.lines),
      o.seller,
    ]);
  },
  async listOrders(limit) {
    return (await readRows("Orders")).map((r) => toOrder(r.cells)).reverse().slice(0, limit);
  },
};
