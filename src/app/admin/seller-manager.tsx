"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { Switch } from "@/components/switch";
import { keepValues } from "@/lib/forms";
import { formatDay, sellerStatus, sellerWindow, type SellerStatus } from "@/lib/format";
import { compressQr } from "@/lib/qr";
import type { Item, Seller } from "@/lib/types";
import { addSeller, deleteSeller, setSellerActive, updateSeller } from "./actions";

export function SellerManager({ sellers, items, today }: { sellers: Seller[]; items: Item[]; today: string }) {
  const [state, action, pending] = useActionState(addSeller, null);
  const formRef = useRef<HTMLFormElement>(null);
  // Bumped after a successful add to clear the QR field, which keeps its own state.
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    setAdded((n) => n + 1); // eslint-disable-line react-hooks/set-state-in-effect
  }, [state]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">Sellers</h2>
        <p className="text-xs text-zinc-500">Customers can order from active sellers between their start and end dates.</p>
      </div>
      <form ref={formRef} onSubmit={keepValues(action)} className="space-y-2 p-4">
        <div className="flex gap-2">
          <input name="name" required maxLength={60} placeholder="Add a seller" className="input" aria-label="Seller name" />
          <button disabled={pending} className="btn-primary px-3.5">{pending ? <Spinner /> : "Add"}</button>
        </div>
        <DateFields />
        <QrField key={added} />
        {state && !state.ok && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </form>
      {sellers.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-zinc-500">No sellers yet. Without any, everyone orders from one shared menu.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {sellers.map((s) => (
            <SellerRow key={s.id} seller={s} today={today} itemCount={items.filter((i) => i.seller === s.id).length} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DateFields({ seller }: { seller?: Seller }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="label">Start date</span>
        <input type="date" name="startDate" defaultValue={seller?.startDate} className="input py-2" />
      </label>
      <label className="block">
        <span className="label">End date</span>
        <input type="date" name="endDate" defaultValue={seller?.endDate} className="input py-2" />
      </label>
      <label className="block">
        <span className="label">Delivery date</span>
        <input type="date" name="deliveryDate" defaultValue={seller?.deliveryDate} className="input py-2" />
      </label>
    </div>
  );
}

/** Payment QR upload; the image is shrunk in the browser and sent as a data URL. */
function QrField({ seller }: { seller?: Seller }) {
  const [qr, setQr] = useState(seller?.qr ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <span className="label">Payment QR</span>
      <input type="hidden" name="qr" value={qr} />
      <div className="flex items-center gap-3">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Payment QR" className="size-16 rounded-lg border border-zinc-200 bg-white object-contain dark:border-zinc-700" />
        ) : (
          <span className="grid size-16 place-items-center rounded-lg border border-dashed border-zinc-300 text-[10px] text-zinc-400 dark:border-zinc-700">
            No QR
          </span>
        )}
        <div className="flex flex-col items-start gap-1">
          <label className="btn-ghost cursor-pointer border border-zinc-200 px-2.5 py-1 text-xs dark:border-zinc-700">
            {busy ? <Spinner /> : qr ? "Change image" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  setQr(await compressQr(file));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't read that image.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {qr && (
            <button type="button" onClick={() => setQr("")} className="text-xs text-zinc-500 hover:text-red-600">
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const STATUS: Record<SellerStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  upcoming: { label: "Upcoming", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  ended: { label: "Ended", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  inactive: { label: "Inactive", className: "bg-zinc-500/10 text-zinc-500" },
};

function SellerRow({ seller, today, itemCount }: { seller: Seller; today: string; itemCount: number }) {
  const [editing, setEditing] = useState(false);
  const [state, action, saving] = useActionState(async (prev: unknown, formData: FormData) => {
    const res = await updateSeller(seller.id, prev, formData);
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
        <form onSubmit={keepValues(action)} className="space-y-2">
          <input name="name" defaultValue={seller.name} required maxLength={60} className="input" aria-label="Seller name" />
          <DateFields seller={seller} />
          <QrField seller={seller} />
          <div className="flex gap-2">
            <button disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : "Save"}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
          </div>
          {state && !state.ok && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        </form>
      </li>
    );
  }

  const status = STATUS[sellerStatus(seller, today)];
  const dates = sellerWindow(seller);

  return (
    <li className={`flex items-center gap-2 px-4 py-3 transition ${busy ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-2 text-sm font-medium ${seller.active ? "" : "text-zinc-400"}`}>
          <span className="truncate">{seller.name}</span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
        </p>
        <p className="text-xs text-zinc-500">
          {dates ? `Orders ${dates}` : "No date limits"}
          {seller.deliveryDate && <> · Delivery {formatDay(seller.deliveryDate)}</>} · {itemCount} item{itemCount === 1 ? "" : "s"}
          {seller.qr ? " · QR added" : " · No QR"}
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
      <button type="button" onClick={() => setEditing(true)} className="btn-ghost px-2 py-1.5" aria-label={`Edit ${seller.name}`}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          confirm(
            itemCount
              ? `Delete seller "${seller.name}" and its ${itemCount} item${itemCount === 1 ? "" : "s"}?

Past orders are kept. To pause the seller instead, switch it off.`
              : `Delete seller "${seller.name}"?`,
          ) && run(() => deleteSeller(seller.id))
        }
        className="btn-ghost px-2 py-1.5 hover:text-red-600"
        aria-label={`Delete ${seller.name}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </li>
  );
}
