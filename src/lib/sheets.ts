import "server-only";
import { JWT } from "google-auth-library";
import type { Item, Order, OrderLine, Store } from "./types";

/**
 * Google Sheets-backed store. One spreadsheet, three tabs:
 *   Items:  id | name | price | category | available
 *   Names:  name
 *   Orders: id | created_at | name | items | total | note | lines_json
 * Missing tabs and header rows are created automatically on first use.
 */

const TABS = {
  Items: ["id", "name", "price", "category", "available"],
  Names: ["name"],
  Orders: ["id", "created_at", "name", "items", "total", "note", "lines_json"],
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

    const missing = (Object.keys(TABS) as Tab[]).filter((t) => !(t in ids));
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
      await api("/values:batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: missing.map((t) => ({ range: `${t}!A1`, values: [TABS[t]] })),
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
  };
}

const itemCells = (i: Item): Cell[] => [i.id, i.name, i.price, i.category, i.available];

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
  };
}

async function findItemRow(id: string) {
  const row = (await readRows("Items")).find((r) => str(r.cells[0]) === id);
  if (!row) throw new Error("Item not found");
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
    const { row, cells } = await findItemRow(id);
    await writeRow("Items", row, itemCells({ ...toItem(cells), ...patch, id }));
  },
  async deleteItem(id) {
    await deleteRow("Items", (await findItemRow(id)).row);
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
    ]);
  },
  async listOrders(limit) {
    return (await readRows("Orders")).map((r) => toOrder(r.cells)).reverse().slice(0, limit);
  },
};
