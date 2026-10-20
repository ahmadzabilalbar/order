"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { keepValues } from "@/lib/forms";
import { addName, deleteName } from "./actions";

export function NameManager({ names }: { names: string[] }) {
  const [state, action, pending] = useActionState(addName, null);
  const [busy, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold">People</h2>
        <p className="text-xs text-zinc-500">Names customers can pick from.</p>
      </div>
      <form ref={formRef} onSubmit={keepValues(action)} className="flex gap-2 p-4">
        <input name="name" required maxLength={60} placeholder="Add a name" className="input" aria-label="Name" />
        <button disabled={pending} className="btn-primary px-3.5">{pending ? <Spinner /> : "Add"}</button>
      </form>
      {state && !state.ok && <p className="-mt-2 px-4 pb-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <div className={`flex flex-wrap gap-2 px-4 pb-4 ${busy ? "opacity-50" : ""}`}>
        {names.length === 0 && <p className="text-sm text-zinc-500">No names yet — customers will type their own.</p>}
        {names.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pr-1 pl-3 text-sm dark:bg-zinc-800">
            {n}
            <button
              type="button"
              disabled={busy}
              onClick={() => startTransition(async () => void (await deleteName(n)))}
              className="grid size-5 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-zinc-700"
              aria-label={`Remove ${n}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
