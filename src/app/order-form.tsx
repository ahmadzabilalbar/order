"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { formatDay, formatPrice, orderSeller, sameName, sellerStatus } from "@/lib/format";
import type { Item, Order, Seller } from "@/lib/types";
import { Spinner } from "@/components/spinner";
import { cancelOrder, placeOrder, updateOrder } from "./actions";

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
  editing,
}: {
  items: Item[];
  names: string[];
  /** Active sellers only. */
  sellers: Seller[];
  /** True when the sheet has any sellers at all (active or not). */
  sellersEnabled: boolean;
  /** Server's date (YYYY-MM-DD) used for ordering windows. */
  today: string;
  /** An existing order being edited (from ?edit=<id>). The form is keyed by its id. */
  editing?: Order;
}) {
  const router = useRouter();
  const editingSeller = editing && sellersEnabled ? orderSeller(editing, sellers) : undefined;
  const canEdit = !editing || !sellersEnabled || (!!editingSeller && sellerStatus(editingSeller, today) === "open");
  // Editing needs the buyer to confirm the name the order was placed under.
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  // The last name used on this device is the default until the user picks one.
  const saved = useSyncExternalStore(noopSubscribe, readSavedName, () => null);
  const savedIsListed = saved !== null && names.includes(saved);
  const [picked, setSelected] = useState<string | null>(() =>
    editing ? (names.includes(editing.name) ? editing.name : OTHER) : null,
  );
  const [typed, setCustomName] = useState<string | null>(() =>
    editing && !names.includes(editing.name) ? editing.name : null,
  );
  const selected = picked ?? (saved ? (savedIsListed ? saved : OTHER) : "");
  const customName = typed ?? (saved && !savedIsListed ? saved : "");
  const [cart, setCart] = useState<Record<string, number>>(() =>
    Object.fromEntries((editing?.lines ?? []).map((l) => [l.itemId, l.qty])),
  );
  // Notes can no longer be entered; an edited order keeps the note it already has.
  const note = editing?.note ?? "";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState<ReactNode>("");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickedSeller, setPickedSeller] = useState(editingSeller?.id ?? "");
  // Only sellers inside their ordering window can be picked; fall back to the
  // first open one if the chosen seller closed or was switched off.
  const openSellers = sellers.filter((s) => sellerStatus(s, today) === "open");
  const seller = openSellers.find((s) => s.id === pickedSeller) ?? openSellers[0];

  // Items without a seller are offered by every seller.
  const menu = sellersEnabled ? items.filter((i) => !i.seller || i.seller === seller?.id) : items;

  const chooseSeller = (id: string) => {
    setPickedSeller(id);
    setCart({});
    setCategory("All");
    setError("");
  };

  const name = editing ? editing.name : names.length === 0 || selected === OTHER ? customName.trim() : selected;

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
  // Items in the order being edited that are no longer on the menu.
  const dropped = editing?.lines.filter((l) => !menu.some((i) => i.id === l.itemId)) ?? [];
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
      const res = editing
        ? await updateOrder(editing.id, { confirmName: confirmedName ?? "", note, cart })
        : await placeOrder({ name, note, cart, sellerId: seller?.id ?? "" });
      if (!res.ok) {
        return setError(
          "existingId" in res ? (
            <>
              {res.error}{" "}
              <Link href={`/?edit=${res.existingId}`} className="underline underline-offset-2">
                Edit that order instead
              </Link>
            </>
          ) : (
            res.error
          ),
        );
      }
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {}
      setPlaced(res.data!);
      setCart({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function cancel() {
    if (!editing || !confirm(`Cancel order #${editing.id}? This can't be undone.`)) return;
    setError("");
    startTransition(async () => {
      const res = await cancelOrder(editing.id, confirmedName ?? "");
      if (!res.ok) return setError(res.error);
      router.replace("/");
    });
  }

  const leaveEditing = () => router.replace("/");

  // Page heading: the chosen seller's name (a dropdown when there is a choice) and its
  // order-by / delivery dates; falls back to a generic heading without sellers.
  const heading =
    sellersEnabled && seller ? (
      <PageHeading
        title={
          sellers.length > 1 && !placed && !editing ? (
            <SellerSelect sellers={sellers} today={today} value={seller.id} onChange={chooseSeller} />
          ) : (
            (placed?.seller || seller.name)
          )
        }
        subtitle={
          seller.startDate || seller.endDate || seller.deliveryDate ? (
            <div className="flex flex-wrap gap-2 text-sm">
              {(seller.startDate || seller.endDate) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {seller.startDate && seller.endDate ? (
                    <>
                      Order <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(seller.startDate)}</strong>
                      –
                      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(seller.endDate)}</strong>
                    </>
                  ) : seller.endDate ? (
                    <>
                      Order by <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(seller.endDate)}</strong>
                    </>
                  ) : (
                    <>
                      Order from <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(seller.startDate)}</strong>
                    </>
                  )}
                </span>
              )}
              {seller.deliveryDate && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  <TruckIcon />
                  Delivery on <strong className="font-semibold">{formatDay(seller.deliveryDate)}</strong>
                </span>
              )}
            </div>
          ) : (
            DEFAULT_SUBTITLE
          )
        }
      />
    ) : (
      <PageHeading title="What would you like?" subtitle={DEFAULT_SUBTITLE} />
    );

  if (placed) {
    return (
      <>
        {heading}
        <Confirmation
          order={placed}
          edited={!!editing}
          onReset={editing ? leaveEditing : () => setPlaced(null)}
        />
      </>
    );
  }

  if (editing && canEdit && confirmedName === null) {
    return (
      <>
        {heading}
        <NameCheck order={editing} onConfirmed={setConfirmedName} />
      </>
    );
  }

  if (editing && !canEdit) {
    return (
      <>
        {heading}
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-3 font-medium">Order #{editing.id} can&apos;t be changed anymore</p>
          <p className="mt-1 text-sm text-zinc-500">Orders for this seller are closed.</p>
          <Link href="/" className="btn-primary mt-6">Back to ordering</Link>
        </div>
      </>
    );
  }

  if (sellersEnabled && !openSellers.length) {
    const upcoming = sellers
      .filter((s) => sellerStatus(s, today) === "upcoming")
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    return (
      <>
        {heading}
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
      </>
    );
  }

  if (!items.length) {
    return (
      <>
        {heading}
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="text-4xl">🍽️</p>
          <p className="mt-3 font-medium">The menu is empty</p>
          <p className="mt-1 text-sm text-zinc-500">An admin needs to add some items first.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {heading}
      {editing && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/40 bg-brand-50 px-4 py-3 text-sm dark:bg-brand-500/10">
          <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Editing order #{editing.id}</span>
            <span className="text-zinc-600 dark:text-zinc-300"> · placed by {editing.name}</span>
            {dropped.length > 0 && (
              <span className="block text-xs text-amber-700 dark:text-amber-400">
                No longer available, removed: {dropped.map((l) => l.name).join(", ")}
              </span>
            )}
          </p>
          <button type="button" onClick={cancel} disabled={pending} className="btn-ghost px-3 py-1.5 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400">
            Cancel order
          </button>
          <button type="button" onClick={leaveEditing} className="btn-ghost border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
            Stop editing
          </button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {/* Name */}
          <section className="card p-4 sm:p-5">
            <StepTitle n={1} title="Who's ordering?" />
            {editing ? (
              <p className="flex items-center gap-2 text-sm">
                <span className="rounded-full border border-brand-600 bg-brand-600 px-3.5 py-1.5 font-medium text-white">{editing.name}</span>
                <span className="text-zinc-500">Name confirmed. It can&apos;t be changed while editing.</span>
              </p>
            ) : names.length > 0 ? (
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
            {!editing && (names.length === 0 || selected === OTHER) && (
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
              <StepTitle n={2} title="Pick your items" className="mb-0" />
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

            {visible.length ? (
              <ul className="card divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800">
                {visible.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <li
                      key={item.id}
                      className={`flex min-h-14 items-center gap-3 py-2 pr-2 pl-4 transition ${
                        qty ? "bg-brand-50/70 shadow-[inset_3px_0_0] shadow-brand-500 dark:bg-brand-500/5" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                          {formatPrice(item.price)}
                          {item.unit && <span className="text-zinc-400 dark:text-zinc-500"> · {item.unit}</span>}
                        </p>
                      </div>
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => setQty(item.id, 1)}
                          aria-label={`Add ${item.name}`}
                          className="btn-primary h-8 px-3 py-0 text-xs"
                        >
                          Add
                        </button>
                      ) : (
                        <Stepper qty={qty} onChange={(q) => setQty(item.id, q)} label={item.name} small />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="card py-10 text-center text-sm text-zinc-500">
                {menu.length ? "No items match your search." : `${seller?.name ?? "This seller"} has no items yet.`}
              </p>
            )}
          </section>
        </div>

        {/* Step 3: summary (sidebar on desktop) */}
        <aside className="card hidden p-5 lg:sticky lg:top-20 lg:block">
          <StepTitle n={3} title="Your order" />
          {seller && sellersEnabled && (
            <p className="-mt-1 mb-2 text-sm text-zinc-500 dark:text-zinc-400">
              From <span className="font-medium text-zinc-900 dark:text-zinc-100">{seller.name}</span>
              {seller.deliveryDate && <> · Delivery {formatDay(seller.deliveryDate)}</>}
            </p>
          )}
          <Summary lines={lines} total={total} name={name} onQty={setQty} />
          {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
          <button type="button" onClick={submit} disabled={pending} className="btn-primary mt-4 w-full py-3">
            {pending ? <Spinner /> : null}
            {pending ? (editing ? "Saving…" : "Placing order…") : `${editing ? "Save changes" : "Place order"} · ${formatPrice(total)}`}
          </button>
        </aside>

        {/* Mobile bottom sheet */}
        <MobileBar
          count={count}
          total={total}
          pending={pending}
          error={error}
          onSubmit={submit}
          submitLabel={editing ? "Save changes" : "Place order"}
          lines={lines}
          name={name}
          onQty={setQty}
        />
      </div>
    </>
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
  error: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
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
            {props.pending ? "Please wait…" : props.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NameCheck({ order, onConfirmed }: { order: Order; onConfirmed: (name: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="card mx-auto max-w-md p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (sameName(value, order.name)) onConfirmed(value);
        else setError("That name doesn't match this order.");
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight">Edit order #{order.id}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        To make changes, confirm the name this order was placed under.
      </p>
      <label className="label mt-5" htmlFor="confirm-name">Your name</label>
      <input
        id="confirm-name"
        className="input"
        value={value}
        autoFocus
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
      />
      {error && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button className="btn-primary flex-1" disabled={!value.trim()}>Continue</button>
        <Link href="/" className="btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}

function Confirmation({ order, edited, onReset }: { order: Order; edited: boolean; onReset: () => void }) {
  return (
    <div className="card mx-auto max-w-md overflow-hidden">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center text-white">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-white/20 backdrop-blur">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{edited ? "Order updated!" : "Order placed!"}</h2>
        <p className="mt-1 text-white/80">
          {edited ? (
            <>Changes to {order.name}&apos;s order are saved.</>
          ) : (
            <>Thanks, {order.name}.{order.seller && <> Your order from {order.seller} is in.</>}</>
          )}
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
          {edited ? "Back to ordering" : "Place another order"}
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

const DEFAULT_SUBTITLE = "Pick your name, add a few items and place your order.";

function PageHeading({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <div className="mt-3 text-zinc-500 dark:text-zinc-400">{subtitle}</div>
    </div>
  );
}

/** The page title doubles as the seller picker when there is more than one seller. */
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
    <span className="relative inline-flex max-w-full items-center">
      <select
        aria-label="Seller"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-full cursor-pointer appearance-none truncate rounded-xl bg-transparent [field-sizing:content] py-0.5 pr-10 pl-0 outline-none hover:text-brand-600 focus-visible:ring-4 focus-visible:ring-brand-500/20 dark:hover:text-brand-400"
      >
        {sellers.map((s) => {
          const status = sellerStatus(s, today);
          const note = status === "upcoming" ? ` (opens ${formatDay(s.startDate)})` : status === "ended" ? " (closed)" : "";
          return (
            <option key={s.id} value={s.id} disabled={status !== "open"} className="text-base text-zinc-900">
              {s.name}
              {note}
            </option>
          );
        })}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1 size-6 text-zinc-400 sm:size-7" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
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
