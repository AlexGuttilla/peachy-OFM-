"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BUTTON, FIELD } from "@/components/ui";
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
      className="space-y-3 rounded-3xl bg-surface p-4"
    >
      <p className="font-medium">Add someone</p>

      <input
        name="displayName"
        required
        placeholder="First name"
        aria-label="First name"
        className={FIELD}
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
            className={`flex-1 rounded-full px-4 py-2.5 text-base ${
              role === option.value
                ? "bg-accent-soft font-medium"
                : "border border-line text-muted"
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
          className={FIELD}
        />
      ) : null}

      {state.error ? (
        <p role="alert" className="text-accent-strong">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-live">
          {state.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={BUTTON}
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
