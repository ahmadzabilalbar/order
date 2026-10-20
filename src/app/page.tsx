import { Suspense } from "react";
import { connection } from "next/server";
import { getMenu, getNames, isDemo } from "@/lib/store";
import { DemoBanner } from "@/components/demo-banner";
import { OrderForm } from "./order-form";

export default function Home() {
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What would you like?</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Pick your name, add a few items and place your order.
        </p>
      </div>
      <Suspense fallback={<MenuSkeleton />}>
        <Menu />
      </Suspense>
    </>
  );
}

async function Menu() {
  // Read the sheet at request time, not during the build.
  await connection();
  const [items, names] = await Promise.all([getMenu(), getNames()]);
  return (
    <>
      {isDemo && <DemoBanner />}
      <OrderForm items={items} names={names} />
    </>
  );
}

function MenuSkeleton() {
  return (
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
  );
}
