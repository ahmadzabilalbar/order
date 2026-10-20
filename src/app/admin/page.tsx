import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { isAdmin } from "@/lib/auth";
import { formatPrice, sellerStatus, todayISO } from "@/lib/format";
import { isDemo, store } from "@/lib/store";
import { DemoBanner } from "@/components/demo-banner";
import { OrderList } from "@/components/order-list";
import { logout } from "./actions";
import { LoginForm } from "./login-form";
import { ItemManager } from "./item-manager";
import { NameManager } from "./name-manager";
import { SellerManager } from "./seller-manager";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />}>
      <AdminGate />
    </Suspense>
  );
}

async function AdminGate() {
  // Session expiry and today's date depend on the current time, so render per request.
  await connection();
  if (!(await isAdmin())) return <LoginForm />;
  const today = todayISO();

  const [items, sellers, names, orders] = await Promise.all([
    store.listItems(),
    store.listSellers(),
    store.listNames(),
    store.listOrders(Infinity),
  ]);
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage sellers, the menu and names, and view orders.</p>
        </div>
        <form action={logout}>
          <button className="btn-ghost border border-zinc-200 dark:border-zinc-800">Sign out</button>
        </form>
      </div>

      {isDemo && <DemoBanner />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sellers open now" value={`${sellers.filter((s) => sellerStatus(s, today) === "open").length} / ${sellers.length}`} />
        <Stat label="Items available" value={`${items.filter((i) => i.available).length} / ${items.length}`} />
        <Stat label="Orders" value={orders.length} />
        <Stat label="Revenue" value={formatPrice(revenue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <ItemManager items={items} sellers={sellers} />
        <div className="space-y-6">
          <SellerManager sellers={sellers} items={items} today={today} />
          <NameManager names={names} />
        </div>
      </div>

      <OrderList orders={orders} />
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
