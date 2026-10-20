"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { Switch } from "@/components/switch";
import { keepValues } from "@/lib/forms";
import { formatPrice } from "@/lib/format";
import type { Item, Seller } from "@/lib/types";
import { addItem, deleteItem, setAvailable, updateItem } from "./actions";

const ALL = "__all__";
const UNIT_SUGGESTIONS = ["1 pc", "2 pcs/pack", "3 pcs/pack", "4 pcs/pack", "6 pcs/pack", "10 pcs/pack", "1 pack", "1 box", "1 cup", "1 bottle", "250 g", "500 g", "1 kg"];

export function ItemManager({ items, sellers }: { items: Item[]; sellers: Seller[] }) {
  const [state, action, pending] = useActionState(addItem, null);
  const [filter, setFilter] = useState(ALL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.name;
  const shown = filter === ALL ? items : items.filter((i) => i.seller === filter);
  const hasSellers = sellers.length > 0;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">Menu items</h2>
        {hasSellers && (
          <SellerSelect
            sellers={sellers}
            value={filter}
            onChange={setFilter}
            label="Filter by seller"
            options={[{ value: ALL, label: "All sellers" }, { value: "", label: "Shared (every seller)" }]}
            className="w-52 py-2"
          />
        )}
      </div>

      <datalist id="units">
        {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
      </datalist>
      <form
        ref={formRef}
        onSubmit={keepValues(action)}
        className="grid gap-3 border-b border-zinc-100 bg-zinc-50/60 p-5 sm:grid-cols-6 sm:items-end dark:border-zinc-800 dark:bg-zinc-950/30"
      >
        <div className="sm:col-span-3">
          <label className="label" htmlFor="new-name">Item name</label>
          <input id="new-name" name="name" required maxLength={80} placeholder="e.g. Sosej Pintal" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="new-price">Price</label>
          <input id="new-price" name="price" required inputMode="decimal" placeholder="0.00" className="input tabular-nums" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="new-unit">Unit</label>
          <input id="new-unit" name="unit" list="units" maxLength={30} placeholder="e.g. 2 pcs/pack" className="input" />
        </div>
        {hasSellers && (
          <div className="sm:col-span-4">
            <label className="label" htmlFor="new-seller">Seller</label>
            <SellerSelect
              id="new-seller"
              name="seller"
              sellers={sellers}
              // New items go to the seller being viewed.
              defaultValue={filter === ALL ? sellers[0].id : filter}
              key={filter}
              options={[{ value: "", label: "Every seller" }]}
            />
          </div>
        )}
        <button disabled={pending} className={`btn-primary ${hasSellers ? "sm:col-span-2" : "sm:col-span-6"}`}>
          {pending ? <Spinner /> : <span aria-hidden>+</span>}
          Add item
        </button>
        {state && !state.ok && <p className="text-sm font-medium text-red-600 sm:col-span-full dark:text-red-400">{state.error}</p>}
      </form>

      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">
          {items.length ? "No items for this seller yet." : "No items yet. Add your first one above."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {shown.map((item) => (
            <ItemRow key={item.id} item={item} sellers={sellers} sellerName={hasSellers ? (sellerName(item.seller) ?? (item.seller ? "Unknown seller" : "Every seller")) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemRow({ item, sellers, sellerName }: { item: Item; sellers: Seller[]; sellerName?: string }) {
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
        <form onSubmit={keepValues(action)} className="grid gap-2 sm:grid-cols-6 sm:items-center">
          <input name="name" defaultValue={item.name} required maxLength={80} className="input sm:col-span-3" aria-label="Name" />
          <input name="price" defaultValue={item.price} required inputMode="decimal" className="input tabular-nums" aria-label="Price" />
          <input name="unit" defaultValue={item.unit} list="units" maxLength={30} className="input sm:col-span-2" aria-label="Unit" placeholder="Unit, e.g. 2 pcs/pack" />
          {sellers.length > 0 && (
            <div className="sm:col-span-4">
              <SellerSelect name="seller" sellers={sellers} defaultValue={item.seller} label="Seller" options={[{ value: "", label: "Every seller" }]} />
            </div>
          )}
          <div className={`flex gap-2 ${sellers.length ? "sm:col-span-2" : "sm:col-span-6"}`}>
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
          {item.unit && <> / {item.unit}</>}
          {sellerName && <> · {sellerName}</>}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <Switch
        checked={item.available}
        disabled={busy}
        label={`${item.name} available`}
        title={item.available ? "Available, click to hide" : "Hidden, click to show"}
        onChange={(available) => run(() => setAvailable(item.id, available))}
      />
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

function SellerSelect({
  sellers,
  options = [],
  label,
  className = "",
  ...props
}: {
  sellers: Seller[];
  options?: { value: string; label: string }[];
  label?: string;
  className?: string;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const { onChange, ...rest } = props;
  return (
    <div className={`relative ${className.includes("w-") ? "" : "w-full"}`}>
      <select
        {...rest}
        aria-label={label}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`input cursor-pointer appearance-none pr-9 ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {sellers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.active ? "" : " (inactive)"}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
