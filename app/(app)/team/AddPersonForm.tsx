"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPerson, type TeamState } from "./actions";

const initial: TeamState = {};

export default function AddPersonForm() {
  const [state, action, pending] = useActionState(addPerson, initial);
  const [role, setRole] = useState("MODEL");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-2xl border border-line bg-surface p-3"
    >
      <p className="text-sm font-medium">Add someone</p>

      <input
        name="displayName"
        required
        placeholder="First name"
        aria-label="First name"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
      />

      <div className="flex gap-2">
        {[
          { value: "MODEL", label: "Creator" },
          { value: "EMPLOYEE", label: "Team" },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            aria-pressed={role === option.value}
            className={`flex-1 rounded-full border px-3 py-1.5 text-sm ${
              role === option.value
                ? "border-accent-strong bg-accent-soft font-medium"
                : "border-line text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />

      {role === "MODEL" ? (
        <input
          name="chaturbateUsername"
          placeholder="Chaturbate room name (optional)"
          aria-label="Chaturbate room name"
          autoCapitalize="none"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
        />
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-accent-strong">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-live">
          {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-medium text-on-accent disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
