import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import { formatPrice, formatTime } from "@/lib/format";
import { isDemo, store } from "@/lib/store";
import { DemoBanner } from "@/components/demo-banner";
import { logout } from "./actions";
import { LoginForm } from "./login-form";
import { ItemManager } from "./item-manager";
import { NameManager } from "./name-manager";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />}>
      <AdminGate />
    </Suspense>
  );
}

async function AdminGate() {
  if (!(await isAdmin())) return <LoginForm />;

  const [items, names, orders] = await Promise.all([
    store.listItems(),
    store.listNames(),
    store.listOrders(50),
  ]);
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage the menu, names and view orders.</p>
        </div>
        <form action={logout}>
          <button className="btn-ghost border border-zinc-200 dark:border-zinc-800">Sign out</button>
        </form>
      </div>

      {isDemo && <DemoBanner />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Items" value={items.length} />
        <Stat label="Available" value={items.filter((i) => i.available).length} />
        <Stat label="Recent orders" value={orders.length} />
        <Stat label="Recent revenue" value={formatPrice(revenue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <ItemManager items={items} />
        <NameManager names={names} />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold">Recent orders</h2>
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
                  {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
