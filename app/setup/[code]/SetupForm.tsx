"use client";

import { useActionState } from "react";
import { completeSetup, type SetupState } from "./actions";

const initial: SetupState = {};

const FIELD =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-accent";

export default function SetupForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(completeSetup, initial);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="code" value={code} />

      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          Choose a username
        </label>
        <input
          id="username"
          name="username"
          required
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Choose a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={FIELD}
        />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium">
          Type it again
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={FIELD}
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
        {pending ? "Setting up…" : "Create my account"}
      </button>
    </form>
  );
}
