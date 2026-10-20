"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/spinner";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-16">
      <div className="card p-6 sm:p-8">
        <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter the admin password to manage the menu.</p>
        <form action={action} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className="input" />
          </div>
          {state && !state.ok && <p className="text-sm font-medium text-red-600 dark:text-red-400">{state.error}</p>}
          <button disabled={pending} className="btn-primary w-full py-3">
            {pending && <Spinner />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
