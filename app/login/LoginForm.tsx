"use client";

import { useActionState } from "react";
import { BUTTON, FIELD } from "@/components/ui";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="mt-10 space-y-4">
      <div>
        <label htmlFor="username" className="block font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          required
          className={`${FIELD} mt-2`}
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={`${FIELD} mt-2`}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-accent-strong">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
