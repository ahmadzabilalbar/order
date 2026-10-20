import Link from "next/link";
import { formatDay, formatLine, formatPrice, formatTime, sameName } from "@/lib/format";
import type { Order } from "@/lib/types";
import { OrderViews } from "./order-views";

/**
 * All orders, viewable as a plain list, grouped by person, or totalled per item.
 * Every view is rendered on the server; OrderViews only switches between them.
 */
export function OrderList({
  orders,
  title = "All orders",
  editable,
}: {
  orders: Order[];
  title?: string;
  /** Ids of orders that can still be edited; shows an Edit link on each. */
  editable?: Set<string>;
}) {
  const total = orders.reduce((s, o) => s + o.total, 0);
  const people = groupByName(orders);
  const items = groupByItem(orders);

  return (
    <section className="card overflow-hidden">
      <OrderViews
        header={
          <h2 className="font-semibold">
            {title} <span className="ml-1 text-sm font-normal text-zinc-500 tabular-nums">({orders.length})</span>
          </h2>
        }
        total={
          orders.length > 0 && (
            <span className="text-sm text-zinc-500">
              Total <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{formatPrice(total)}</span>
            </span>
          )
        }
        empty={orders.length === 0 ? <p className="px-5 py-10 text-center text-sm text-zinc-500">No orders yet.</p> : null}
        views={{
          orders: (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} editable={editable?.has(o.id)} />
              ))}
            </ul>
          ),
          names: (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {people.map((p) => (
                <li key={p.name} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {p.name}{" "}
                      <span className="ml-1 font-normal text-zinc-500">
                        {p.orders.length} order{p.orders.length === 1 ? "" : "s"}
                      </span>
                    </p>
                    <span className="text-sm font-semibold tabular-nums">{formatPrice(p.total)}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5 pl-11">
                    {p.orders.map((o) => (
                      <li key={o.id} className="flex items-start gap-3 text-sm">
                        <div className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-300">
                          <Badges order={o} />
                          {o.lines.map(formatLine).join(", ")}
                          {o.note && <span className="block text-xs text-zinc-500 italic">“{o.note}”</span>}
                        </div>
                        <span className="font-mono text-xs leading-5 text-zinc-400">#{o.id}</span>
                        <span className="tabular-nums">{formatPrice(o.total)}</span>
                        {editable?.has(o.id) && <EditLink id={o.id} />}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ),
          items: (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((it) => (
                <li key={it.key} className="flex items-start gap-3 px-5 py-3">
                  <span className="grid h-8 min-w-10 shrink-0 place-items-center rounded-lg bg-brand-50 px-2 text-sm font-bold text-brand-700 tabular-nums dark:bg-brand-500/10 dark:text-brand-400">
                    {it.qty}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {it.name}
                      {it.unit && <span className="font-normal text-zinc-500"> ({it.unit})</span>}{" "}
                      {it.seller && (
                        <span className="ml-2 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 align-middle text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {it.seller}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {it.buyers.map((b) => `${b.name} ×${b.qty}`).join(", ")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatPrice(it.amount)}</span>
                </li>
              ))}
            </ul>
          ),
        }}
      />
    </section>
  );
}

function OrderRow({ order: o, editable }: { order: Order; editable?: boolean }) {
  return (
    <li className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
        <Avatar name={o.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{o.name}</p>
          <p className="text-xs text-zinc-500">
            {o.createdAt ? formatTime(o.createdAt) : ""}
            {o.updatedAt && <span title={`Edited ${formatTime(o.updatedAt)}`}> · edited</span>}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
        <Badges order={o} />
        {o.lines.map(formatLine).join(", ")}
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

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Badges({ order: o }: { order: Order }) {
  return (
    <>
      {o.seller && (
        <span className="mr-2 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {o.seller}
        </span>
      )}{" "}
      {o.deliveryDate && (
        <span className="mr-2 inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
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
      className="btn-ghost ml-auto border border-zinc-200 px-2.5 py-1 text-xs sm:ml-1 dark:border-zinc-700"
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
    { key: string; name: string; unit: string; seller: string; qty: number; amount: number; buyers: { name: string; qty: number }[] }
  >();
  for (const o of orders) {
    for (const l of o.lines) {
      const key = `${o.seller}|${l.itemId}|${l.unit ?? ""}`;
      const it = items.get(key) ?? { key, name: l.name, unit: l.unit ?? "", seller: o.seller, qty: 0, amount: 0, buyers: [] };
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
