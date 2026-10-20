import { formatDay, formatLine, formatPrice, formatTime } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrderList({ orders, title = "All orders" }: { orders: Order[]; title?: string }) {
  const total = orders.reduce((s, o) => s + o.total, 0);
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">
          {title} <span className="ml-1 text-sm font-normal text-zinc-500 tabular-nums">({orders.length})</span>
        </h2>
        {orders.length > 0 && (
          <span className="text-sm text-zinc-500">
            Total <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">{formatPrice(total)}</span>
          </span>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  {o.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-zinc-500">{o.createdAt ? formatTime(o.createdAt) : ""}</p>
                </div>
              </div>
              <div className="min-w-0 flex-1 text-sm text-zinc-600 dark:text-zinc-300">
                {o.seller && (
                  <span className="mr-2 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {o.seller}
                  </span>
                )}
                {o.deliveryDate && (
                  <span className="mr-2 inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    Delivery {formatDay(o.deliveryDate)}
                  </span>
                )}
                {o.lines.map(formatLine).join(", ")}
                {o.note && <span className="block text-xs text-zinc-500 italic">“{o.note}”</span>}
              </div>
              <div className="flex items-center gap-3 text-sm sm:justify-end">
                <span className="font-mono text-xs text-zinc-400">#{o.id}</span>
                <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
