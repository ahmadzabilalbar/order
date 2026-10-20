"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { formatDay, formatPrice, sellerStatus } from "@/lib/format";
import type { Item, Order, Seller } from "@/lib/types";
import { Spinner } from "@/components/spinner";
import { placeOrder } from "./actions";

const OTHER = "__other__";
const NAME_KEY = "order:name";

const noopSubscribe = () => () => {};
function readSavedName() {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export function OrderForm({
  items,
  names,
  sellers,
  sellersEnabled,
  today,
}: {
  items: Item[];
  names: string[];
  /** Active sellers only. */
  sellers: Seller[];
  /** True when the sheet has any sellers at all (active or not). */
  sellersEnabled: boolean;
  /** Server's date (YYYY-MM-DD) used for ordering windows. */
  today: string;
}) {
  // The last name used on this device is the default until the user picks one.
  const saved = useSyncExternalStore(noopSubscribe, readSavedName, () => null);
  const savedIsListed = saved !== null && names.includes(saved);
  const [picked, setSelected] = useState<string | null>(null);
  const [typed, setCustomName] = useState<string | null>(null);
  const selected = picked ?? (saved ? (savedIsListed ? saved : OTHER) : "");
  const customName = typed ?? (saved && !savedIsListed ? saved : "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickedSeller, setPickedSeller] = useState("");
  // Only sellers inside their ordering window can be picked; fall back to the
  // first open one if the chosen seller closed or was switched off.
  const openSellers = sellers.filter((s) => sellerStatus(s, today) === "open");
  const seller = openSellers.find((s) => s.id === pickedSeller) ?? openSellers[0];

  // Items without a seller are offered by every seller.
  const menu = sellersEnabled ? items.filter((i) => !i.seller || i.seller === seller?.id) : items;
  const step = sellersEnabled ? 1 : 0;

  const chooseSeller = (id: string) => {
    setPickedSeller(id);
    setCart({});
    setCategory("All");
    setError("");
  };

  const name = names.length === 0 || selected === OTHER ? customName.trim() : selected;

  const categories = useMemo(
    () => ["All", ...new Set(menu.map((i) => i.category || "Other"))],
    [menu],
  );

  const visible = menu.filter(
    (i) =>
      (category === "All" || (i.category || "Other") === category) &&
      i.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const lines = menu.filter((i) => cart[i.id] > 0).map((i) => ({ ...i, qty: cart[i.id] }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const setQty = (id: string, qty: number) =>
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, Math.min(99, qty)) };
      if (!next[id]) delete next[id];
      return next;
    });

  function submit() {
    setError("");
    if (!name) return setError("Please choose your name first.");
    if (!count) return setError("Add at least one item.");
    startTransition(async () => {
      const res = await placeOrder({ name, note, cart, sellerId: seller?.id ?? "" });
      if (!res.ok) return setError(res.error);
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {}
      setPlaced(res.data!);
      setCart({});
      setNote("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (placed) return <Confirmation order={placed} onReset={() => setPlaced(null)} />;

  if (sellersEnabled && !openSellers.length) {
    const upcoming = sellers
      .filter((s) => sellerStatus(s, today) === "upcoming")
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    return (
      <div className="card grid place-items-center px-6 py-16 text-center">
        <p className="text-4xl">🌙</p>
        <p className="mt-3 font-medium">No sellers are taking orders right now</p>
        {upcoming.length ? (
          <ul className="mt-3 space-y-1 text-sm text-zinc-500">
            {upcoming.map((s) => (
              <li key={s.id}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{s.name}</span> opens {formatDay(s.startDate)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">Please check back later.</p>
        )}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="card grid place-items-center px-6 py-16 text-center">
        <p className="text-4xl">🍽️</p>
        <p className="mt-3 font-medium">The menu is empty</p>
        <p className="mt-1 text-sm text-zinc-500">An admin needs to add some items first.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        {sellersEnabled && seller && (
          <section className="card p-4 sm:p-5">
            <StepTitle n={1} title="Order from" />
            <SellerSelect sellers={sellers} today={today} value={seller.id} onChange={chooseSeller} />
            {(seller.endDate || seller.deliveryDate) && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {seller.endDate && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Order by <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(seller.endDate)}</strong>
                  </span>
                )}
                {seller.deliveryDate && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    <TruckIcon />
                    Delivery on <strong className="font-semibold">{formatDay(seller.deliveryDate)}</strong>
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {/* Name */}
        <section className="card p-4 sm:p-5">
          <StepTitle n={step + 1} title="Who's ordering?" />
          {names.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {[...names, OTHER].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelected(n)}
                  aria-pressed={selected === n}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    selected === n
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  }`}
                >
                  {n === OTHER ? "Someone else…" : n}
                </button>
              ))}
            </div>
          ) : null}
          {(names.length === 0 || selected === OTHER) && (
            <input
              className="input mt-3"
              placeholder="Type your name"
              value={customName}
              maxLength={60}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus={selected === OTHER}
            />
          )}
        </section>

        {/* Step 2: items */}
        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <StepTitle n={step + 2} title="Pick your items" className="mb-0" />
            <div className="relative sm:w-56">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                className="input py-2 pl-9"
                placeholder="Search menu"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {categories.length > 2 && (
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    category === c
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className={`card flex items-center gap-3 p-4 transition ${
                    qty ? "border-brand-500/60 ring-4 ring-brand-500/10 dark:border-brand-500/50" : ""
                  }`}
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
                      {formatPrice(item.price)}
                      {item.unit && <span className="text-zinc-400 dark:text-zinc-500"> · {item.unit}</span>}
                    </p>
                  </div>
                  {qty === 0 ? (
                    <button type="button" onClick={() => setQty(item.id, 1)} className="btn-primary px-3.5 py-2">
                      Add
                    </button>
                  ) : (
                    <Stepper qty={qty} onChange={(q) => setQty(item.id, q)} label={item.name} />
                  )}
                </div>
              );
            })}
            {!visible.length && (
              <p className="col-span-full py-10 text-center text-sm text-zinc-500">
                {menu.length ? "No items match your search." : `${seller?.name ?? "This seller"} has no items yet.`}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Step 3: summary (sidebar on desktop) */}
      <aside className="card hidden p-5 lg:sticky lg:top-20 lg:block">
        <StepTitle n={step + 3} title="Your order" />
        {seller && sellersEnabled && (
          <p className="-mt-1 mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            From <span className="font-medium text-zinc-900 dark:text-zinc-100">{seller.name}</span>
            {seller.deliveryDate && <> · Delivery {formatDay(seller.deliveryDate)}</>}
          </p>
        )}
        <Summary lines={lines} total={total} name={name} onQty={setQty} />
        <textarea
          className="input mt-4 min-h-20 resize-none"
          placeholder="Note (optional) — e.g. less sugar"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        <button type="button" onClick={submit} disabled={pending} className="btn-primary mt-4 w-full py-3">
          {pending ? <Spinner /> : null}
          {pending ? "Placing order…" : `Place order · ${formatPrice(total)}`}
        </button>
      </aside>

      {/* Mobile bottom sheet */}
      <MobileBar
        count={count}
        total={total}
        pending={pending}
        error={error}
        onSubmit={submit}
        note={note}
        setNote={setNote}
        lines={lines}
        name={name}
        onQty={setQty}
      />
    </div>
  );
}

type Line = Item & { qty: number };

function Summary({
  lines,
  total,
  name,
  onQty,
}: {
  lines: Line[];
  total: number;
  name: string;
  onQty: (id: string, qty: number) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        For <span className="font-medium text-zinc-900 dark:text-zinc-100">{name || "—"}</span>
      </p>
      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
          Nothing added yet
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.name}</p>
                <p className="text-xs text-zinc-500 tabular-nums">
                  {formatPrice(l.price * l.qty)}
                  {l.unit && <> · {l.qty} × {l.unit}</>}
                </p>
              </div>
              <Stepper qty={l.qty} onChange={(q) => onQty(l.id, q)} label={l.name} small />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">Total</span>
        <span className="text-lg font-semibold tabular-nums">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

function MobileBar(props: {
  count: number;
  total: number;
  pending: boolean;
  error: string;
  onSubmit: () => void;
  note: string;
  setNote: (v: string) => void;
  lines: Line[];
  name: string;
  onQty: (id: string, qty: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      {open && <div className="fixed inset-0 -z-10 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} />}
      <div className="rounded-t-3xl border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95">
        {open && (
          <div className="max-h-[60vh] overflow-y-auto pb-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <Summary lines={props.lines} total={props.total} name={props.name} onQty={props.onQty} />
            <textarea
              className="input mt-3 min-h-16 resize-none"
              placeholder="Note (optional)"
              maxLength={300}
              value={props.note}
              onChange={(e) => props.setNote(e.target.value)}
            />
          </div>
        )}
        {props.error && <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{props.error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-3 text-left">
            <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-sm font-semibold tabular-nums dark:bg-zinc-800">
              {props.count}
            </span>
            <span>
              <span className="block text-xs text-zinc-500">{open ? "Hide details" : "View order"}</span>
              <span className="block font-semibold tabular-nums">{formatPrice(props.total)}</span>
            </span>
          </button>
          <button type="button" onClick={props.onSubmit} disabled={props.pending} className="btn-primary px-5 py-3">
            {props.pending ? <Spinner /> : null}
            {props.pending ? "Placing…" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Confirmation({ order, onReset }: { order: Order; onReset: () => void }) {
  return (
    <div className="card mx-auto max-w-md overflow-hidden">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center text-white">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-white/20 backdrop-blur">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Order placed!</h2>
        <p className="mt-1 text-white/80">
          Thanks, {order.name}.{order.seller && <> Your order from {order.seller} is in.</>}
        </p>
      </div>
      <div className="p-6">
        <div className="mb-4 flex justify-between text-sm">
          <span className="text-zinc-500">Order #</span>
          <span className="font-mono font-semibold">{order.id}</span>
        </div>
        {order.deliveryDate && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
            <span className="flex items-center gap-2"><TruckIcon /> Delivery date</span>
            <span className="font-semibold">{formatDay(order.deliveryDate)}</span>
          </div>
        )}
        <ul className="space-y-2 text-sm">
          {order.lines.map((l) => (
            <li key={l.itemId} className="flex justify-between gap-4">
              <span>
                <span className="text-zinc-500 tabular-nums">{l.qty}×</span> {l.name}
                {l.unit && <span className="text-zinc-500"> ({l.unit})</span>}
              </span>
              <span className="tabular-nums">{formatPrice(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">“{order.note}”</p>}
        <div className="mt-4 flex justify-between border-t border-zinc-100 pt-4 font-semibold dark:border-zinc-800">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.total)}</span>
        </div>
        <button type="button" onClick={onReset} className="btn-primary mt-6 w-full py-3">
          Place another order
        </button>
      </div>
    </div>
  );
}

function Stepper({ qty, onChange, label, small }: { qty: number; onChange: (q: number) => void; label: string; small?: boolean }) {
  const size = small ? "size-7" : "size-9";
  return (
    <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      <button type="button" aria-label={`Remove one ${label}`} onClick={() => onChange(qty - 1)} className={`${size} grid place-items-center rounded-lg text-lg leading-none transition hover:bg-white dark:hover:bg-zinc-700`}>
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
      <button type="button" aria-label={`Add one ${label}`} onClick={() => onChange(qty + 1)} className={`${size} grid place-items-center rounded-lg text-lg leading-none transition hover:bg-white dark:hover:bg-zinc-700`}>
        +
      </button>
    </div>
  );
}

export function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function SellerSelect({
  sellers,
  today,
  value,
  onChange,
}: {
  sellers: Seller[];
  today: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Seller"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer appearance-none py-3 pr-10 text-base font-medium"
      >
        {sellers.map((s) => {
          const status = sellerStatus(s, today);
          const note = status === "upcoming" ? ` (opens ${formatDay(s.startDate)})` : status === "ended" ? " (closed)" : "";
          return (
            <option key={s.id} value={s.id} disabled={status !== "open"}>
              {s.name}
              {note}
            </option>
          );
        })}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function StepTitle({ n, title, className = "mb-3" }: { n: number; title: string; className?: string }) {
  return (
    <h2 className={`flex items-center gap-2.5 font-semibold ${className}`}>
      <span className="grid size-6 place-items-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-zinc-900">{n}</span>
      {title}
    </h2>
  );
}
