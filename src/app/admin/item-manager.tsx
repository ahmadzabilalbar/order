"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { keepValues } from "@/lib/forms";
import { formatPrice } from "@/lib/format";
import type { Item } from "@/lib/types";
import { addItem, deleteItem, setAvailable, updateItem } from "./actions";

export function ItemManager({ items }: { items: Item[] }) {
  const [state, action, pending] = useActionState(addItem, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">Menu items</h2>
      </div>

      <form ref={formRef} onSubmit={keepValues(action)} className="grid gap-3 border-b border-zinc-100 bg-zinc-50/60 p-5 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end dark:border-zinc-800 dark:bg-zinc-950/30">
        <div>
          <label className="label" htmlFor="new-name">Item name</label>
          <input id="new-name" name="name" required maxLength={80} placeholder="e.g. Iced Latte" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="new-price">Price</label>
          <input id="new-price" name="price" required inputMode="decimal" placeholder="0.00" className="input tabular-nums" />
        </div>
        <div>
          <label className="label" htmlFor="new-cat">Category</label>
          <input id="new-cat" name="category" list="categories" maxLength={40} placeholder="Optional" className="input" />
          <datalist id="categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <button disabled={pending} className="btn-primary">
          {pending ? <Spinner /> : <span aria-hidden>+</span>}
          Add
        </button>
        {state && !state.ok && <p className="text-sm font-medium text-red-600 sm:col-span-full dark:text-red-400">{state.error}</p>}
      </form>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">No items yet. Add your first one above.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => <ItemRow key={item.id} item={item} />)}
        </ul>
      )}
    </section>
  );
}

function ItemRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [state, action, saving] = useActionState(async (prev: unknown, formData: FormData) => {
    const res = await updateItem(item.id, prev, formData);
    if (res.ok) setEditing(false);
    return res;
  }, null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? "" : (res.error ?? "Failed"));
    });

  if (editing) {
    return (
      <li className="p-4">
        <form onSubmit={keepValues(action)} className="grid gap-2 sm:grid-cols-[1fr_110px_130px_auto] sm:items-center">
          <input name="name" defaultValue={item.name} required maxLength={80} className="input" aria-label="Name" />
          <input name="price" defaultValue={item.price} required inputMode="decimal" className="input tabular-nums" aria-label="Price" />
          <input name="category" defaultValue={item.category} maxLength={40} className="input" aria-label="Category" placeholder="Category" />
          <div className="flex gap-2">
            <button disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : "Save"}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
          </div>
          {state && !state.ok && <p className="text-sm text-red-600 sm:col-span-full">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-center gap-3 px-5 py-3 transition ${busy ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${item.available ? "" : "text-zinc-400 line-through"}`}>{item.name}</p>
        <p className="text-xs text-zinc-500">
          <span className="tabular-nums">{formatPrice(item.price)}</span>
          {item.category && <> · {item.category}</>}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={item.available}
        aria-label={`${item.name} available`}
        title={item.available ? "Available — click to hide" : "Hidden — click to show"}
        disabled={busy}
        onClick={() => run(() => setAvailable(item.id, !item.available))}
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${item.available ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${item.available ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <button type="button" onClick={() => setEditing(true)} className="btn-ghost px-2.5 py-1.5" aria-label={`Edit ${item.name}`}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => confirm(`Delete "${item.name}"?`) && run(() => deleteItem(item.id))}
        className="btn-ghost px-2.5 py-1.5 hover:text-red-600"
        aria-label={`Delete ${item.name}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </li>
  );
}
