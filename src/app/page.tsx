import { Suspense } from "react";
import { connection } from "next/server";
import { canEditOrder, todayISO } from "@/lib/format";
import { getMenu, getNames, getOrders, getSellers, isDemo } from "@/lib/store";
import { DemoBanner } from "@/components/demo-banner";
import { OrderList } from "@/components/order-list";
import { OrderForm } from "./order-form";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={<MenuSkeleton />}>
        <Menu searchParams={searchParams} />
      </Suspense>
      {/* Bottom padding keeps the list clear of the mobile cart bar. */}
      <div className="mt-10 pb-28 lg:pb-0">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />}>
          <Orders />
        </Suspense>
      </div>
    </>
  );
}

async function Menu({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // Read the sheet at request time, not during the build.
  await connection();
  const { edit } = await searchParams;
  const [items, names, sellers, orders] = await Promise.all([
    getMenu(),
    getNames(),
    getSellers(),
    edit ? getOrders() : Promise.resolve([]),
  ]);
  const editing = typeof edit === "string" ? orders.find((o) => o.id === edit) : undefined;
  return (
    <>
      {isDemo && <DemoBanner />}
      <OrderForm
        items={items}
        names={names}
        sellers={sellers.filter((s) => s.active)}
        sellersEnabled={sellers.length > 0}
        today={todayISO()}
        editing={editing}
        key={editing?.id ?? "new"}
      />
    </>
  );
}

async function Orders() {
  await connection();
  const [orders, sellers] = await Promise.all([getOrders(), getSellers()]);
  const today = todayISO();
  const editable = new Set(orders.filter((o) => canEditOrder(o, sellers, today)).map((o) => o.id));
  return <OrderList orders={orders} editable={editable} />;
}

function MenuSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-3 sm:mb-8">
        <div className="h-10 w-72 max-w-full animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-7 w-56 max-w-full animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
            ))}
          </div>
        </div>
        <div className="hidden h-72 animate-pulse rounded-2xl bg-zinc-200/70 lg:block dark:bg-zinc-800/70" />
      </div>
    </>
  );
}
