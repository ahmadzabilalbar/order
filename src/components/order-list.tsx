"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDay, formatLine, formatPrice, formatTime, sameName } from "@/lib/format";
import type { Order, OrderLine } from "@/lib/types";

const VIEWS = [
  { id: "orders", label: "Orders" },
  { id: "names", label: "By name" },
  { id: "items", label: "By item" },
] as const;

type View = (typeof VIEWS)[number]["id"];

/** All orders, searchable by name, viewable as a plain list, grouped by person, or totalled per item. */
export function OrderList({
  orders: allOrders,
  title = "All orders",
  editable,
}: {
  orders: Order[];
  title?: string;
  /** Ids of orders that can still be edited; shows an Edit link on each. */
  editable?: Set<string>;
}) {
  const [view, setView] = useState<View>("orders");
  const [query, setQuery] = useState("");
  // Items one per line, or all on one line to keep rows short.
  const [inline, setInline] = useState(false);
  const q = query.trim().toLowerCase();
  const orders = q ? allOrders.filter((o) => o.name.toLowerCase().includes(q)) : allOrders;

  const total = orders.reduce((s, o) => s + o.total, 0);
  // When every order has the same delivery date, show it once in the header
  // instead of on each row.
  const shared = new Set(allOrders.map((o) => o.deliveryDate)).size === 1 ? allOrders[0] : undefined;
  const badges = !shared;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">
          {title} <span className="ml-1 text-sm font-normal text-zinc-500 tabular-nums">({orders.length})</span>
          {shared?.deliveryDate && (
            <span className="ml-2 align-middle text-xs font-normal">
              <Badges order={shared} />
            </span>
          )}
        </h2>
        {allOrders.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              className="input w-full py-1.5 text-sm sm:w-44"
              placeholder="Search name"
              aria-label="Search orders by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {view !== "items" && (
              <button
                type="button"
                onClick={() => setInline((v) => !v)}
                aria-pressed={inline}
                title={inline ? "Show items one per line" : "Show items on one line"}
                className="btn-ghost border border-zinc-200 px-2.5 py-1 text-xs dark:border-zinc-700"
              >
                {inline ? "Show as list" : "Show on one line"}
              </button>
            )}
            <div role="tablist" aria-label="View orders" className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium dark:bg-zinc-800">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    view === v.id
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-zinc-500">
              Total <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{formatPrice(total)}</span>
            </span>
          </div>
        )}
      </div>
      {allOrders.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">No orders yet.</p>
      ) : orders.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">No orders for “{query.trim()}”.</p>
      ) : view === "orders" ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} editable={editable?.has(o.id)} badges={badges} inline={inline} />
          ))}
        </ul>
      ) : view === "names" ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {groupByName(orders).map((p) => (
            <li key={p.name} className="px-5 py-2.5">
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {p.name}{" "}
                  <span className="ml-1 font-normal text-zinc-500">
                    {p.orders.length} order{p.orders.length === 1 ? "" : "s"}
                  </span>
                </p>
                <span className="text-sm font-semibold tabular-nums">{formatPrice(p.total)}</span>
              </div>
              <ul className="mt-1 space-y-2">
                {p.orders.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 text-xs">
                    <div className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-300">
                      {badges && <Badges order={o} />}
                      <Lines lines={o.lines} inline={inline} />
                      {o.note && <span className="block text-xs text-zinc-500 italic">“{o.note}”</span>}
                    </div>
                    <span className="font-mono text-xs leading-5 text-zinc-400">#{o.id}</span>
                    <span className="leading-5 tabular-nums">{formatPrice(o.total)}</span>
                    {editable?.has(o.id) && <EditLink id={o.id} />}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {groupByItem(orders).map((it) => (
            <li key={it.key} className="flex items-start gap-3 px-5 py-3">
              <span className="grid h-8 min-w-10 shrink-0 place-items-center rounded-lg bg-brand-50 px-2 text-sm font-bold text-brand-700 tabular-nums dark:bg-brand-500/10 dark:text-brand-400">
                {it.qty}×
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {it.name}
                  {it.unit && <span className="font-normal text-zinc-500"> ({it.unit})</span>}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {it.buyers.map((b) => `${b.name} ×${b.qty}`).join(", ")}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatPrice(it.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderRow({
  order: o,
  editable,
  badges,
  inline,
}: {
  order: Order;
  editable?: boolean;
  badges: boolean;
  inline: boolean;
}) {
  return (
    <li className="flex flex-col gap-1 px-5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 sm:w-32 sm:shrink-0">
        <p className="truncate text-sm leading-5 font-medium">{o.name}</p>
        <p className="text-[11px] leading-4 text-zinc-500">
          {o.createdAt ? formatTime(o.createdAt) : ""}
          {o.updatedAt && <span title={`Edited ${formatTime(o.updatedAt)}`}> · edited</span>}
        </p>
      </div>
      <div className="min-w-0 flex-1 text-xs text-zinc-600 dark:text-zinc-300">
        {badges && <Badges order={o} />}
        <Lines lines={o.lines} inline={inline} />
        {o.note && <span className="block text-xs text-zinc-500 italic">“{o.note}”</span>}
      </div>
      <div className="flex items-center gap-3 text-sm sm:justify-end">
        <span className="font-mono text-xs text-zinc-400">#{o.id}</span>
        <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
        {editable && <EditLink id={o.id} />}
      </div>
    </li>
  );
}

/** An order's items, one per line, or comma-separated on one line when `inline`. */
function Lines({ lines, inline }: { lines: OrderLine[]; inline: boolean }) {
  if (inline) return <span className="leading-5">{lines.map(formatLine).join(", ")}</span>;
  return (
    <ul className="space-y-0.5 leading-5">
      {lines.map((l) => (
        <li key={l.itemId} className="flex gap-1.5">
          <span className="w-6 shrink-0 text-right text-zinc-400 tabular-nums">{l.qty}×</span>
          <span className="min-w-0">
            {l.name}
            {l.unit && <span className="text-zinc-500"> ({l.unit})</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Badges({ order: o }: { order: Order }) {
  return (
    <>
      {o.deliveryDate && (
        <span className="mr-2 mb-1 inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
          Delivery {formatDay(o.deliveryDate)}
        </span>
      )}{" "}
    </>
  );
}

function EditLink({ id }: { id: string }) {
  return (
    <Link
      href={`/?edit=${id}`}
      aria-label={`Edit order ${id}`}
      className="btn-ghost ml-auto border border-zinc-200 px-2 py-0.5 text-xs sm:ml-1 dark:border-zinc-700"
    >
      Edit
    </Link>
  );
}

/** Orders grouped by buyer name (case-insensitive), people sorted A–Z. */
function groupByName(orders: Order[]) {
  const people: { name: string; orders: Order[]; total: number }[] = [];
  for (const o of orders) {
    const p = people.find((x) => sameName(x.name, o.name));
    if (p) {
      p.orders.push(o);
      p.total += o.total;
    } else {
      people.push({ name: o.name, orders: [o], total: o.total });
    }
  }
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

/** Quantities per item (per seller and unit), with who ordered how many; largest first. */
function groupByItem(orders: Order[]) {
  const items = new Map<
    string,
    { key: string; name: string; unit: string; qty: number; amount: number; buyers: { name: string; qty: number }[] }
  >();
  for (const o of orders) {
    for (const l of o.lines) {
      const key = `${o.seller}|${l.itemId}|${l.unit ?? ""}`;
      const it = items.get(key) ?? { key, name: l.name, unit: l.unit ?? "", qty: 0, amount: 0, buyers: [] };
      it.qty += l.qty;
      it.amount += l.qty * l.price;
      const buyer = it.buyers.find((b) => sameName(b.name, o.name));
      if (buyer) buyer.qty += l.qty;
      else it.buyers.push({ name: o.name, qty: l.qty });
      items.set(key, it);
    }
  }
  for (const it of items.values()) it.buyers.sort((a, b) => a.name.localeCompare(b.name));
  return [...items.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}
