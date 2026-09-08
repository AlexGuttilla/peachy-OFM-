"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          required
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-accent-strong">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-strong px-4 py-3 text-base font-medium text-on-accent disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
