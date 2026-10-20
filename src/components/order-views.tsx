"use client";

import { useState, type ReactNode } from "react";

const VIEWS = [
  { id: "orders", label: "Orders" },
  { id: "names", label: "By name" },
  { id: "items", label: "By item" },
] as const;

type View = (typeof VIEWS)[number]["id"];

/** Header with a view switcher; shows one of the server-rendered views. */
export function OrderViews({
  header,
  total,
  empty,
  views,
}: {
  header: ReactNode;
  total: ReactNode;
  empty: ReactNode;
  views: Record<View, ReactNode>;
}) {
  const [view, setView] = useState<View>("orders");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        {header}
        <div className="flex flex-wrap items-center gap-3">
          {!empty && (
            <div role="tablist" aria-label="View orders" className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium dark:bg-zinc-800">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    view === v.id
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          {total}
        </div>
      </div>
      {empty ?? views[view]}
    </>
  );
}
