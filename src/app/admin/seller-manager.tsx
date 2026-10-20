"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { Switch } from "@/components/switch";
import { keepValues } from "@/lib/forms";
import type { Item, Seller } from "@/lib/types";
import { addSeller, deleteSeller, setSellerActive } from "./actions";

export function SellerManager({ sellers, items }: { sellers: Seller[]; items: Item[] }) {
  const [state, action, pending] = useActionState(addSeller, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">Sellers</h2>
        <p className="text-xs text-zinc-500">Customers pick from the active ones.</p>
      </div>
      <form ref={formRef} onSubmit={keepValues(action)} className="flex gap-2 p-4">
        <input name="name" required maxLength={60} placeholder="Add a seller" className="input" aria-label="Seller name" />
        <button disabled={pending} className="btn-primary px-3.5">{pending ? <Spinner /> : "Add"}</button>
      </form>
      {state && !state.ok && <p className="-mt-2 px-4 pb-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {sellers.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-zinc-500">No sellers yet. Without any, everyone orders from one shared menu.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {sellers.map((s) => (
            <SellerRow key={s.id} seller={s} itemCount={items.filter((i) => i.seller === s.id).length} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SellerRow({ seller, itemCount }: { seller: Seller; itemCount: number }) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? "" : (res.error ?? "Failed"));
    });

  return (
    <li className={`flex items-center gap-3 px-4 py-3 transition ${busy ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${seller.active ? "" : "text-zinc-400"}`}>{seller.name}</p>
        <p className="text-xs text-zinc-500">
          {seller.active ? "Active" : "Inactive"} · {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <Switch
        checked={seller.active}
        disabled={busy}
        label={`${seller.name} active`}
        title={seller.active ? "Active, click to deactivate" : "Inactive, click to activate"}
        onChange={(active) => run(() => setSellerActive(seller.id, active))}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => confirm(`Delete seller "${seller.name}"?`) && run(() => deleteSeller(seller.id))}
        className="btn-ghost px-2.5 py-1.5 hover:text-red-600"
        aria-label={`Delete ${seller.name}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </li>
  );
}
