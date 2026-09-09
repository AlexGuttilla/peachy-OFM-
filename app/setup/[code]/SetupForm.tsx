"use client";

import { useActionState } from "react";
import { BUTTON, FIELD } from "@/components/ui";
import { completeSetup, type SetupState } from "./actions";

const initial: SetupState = {};

const INPUT = `${FIELD} mt-2`;

export default function SetupForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(completeSetup, initial);

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="code" value={code} />

      <div>
        <label htmlFor="username" className="block font-medium">
          Choose a username
        </label>
        <input
          id="username"
          name="username"
          required
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-medium">
          Choose a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={INPUT}
        />
        <p className="mt-1.5 text-sm text-muted">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirm" className="block font-medium">
          Type it again
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={INPUT}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-accent-strong">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Setting up…" : "Create my account"}
      </button>
    </form>
  );
}
