"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { recordTokens, type TokenFormState } from "./actions";

type Model = { id: string; displayName: string; color: string };

const initial: TokenFormState = {};

/** "2026-09-09" shifted by whole days, without leaving the string domain. */
function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export default function TokenForm({
  models,
  today,
}: {
  models: Model[];
  today: string;
}) {
  const [state, action, pending] = useActionState(recordTokens, initial);
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const tokensRef = useRef<HTMLInputElement>(null);
  const yesterday = shiftDay(today, -1);

  // After a save, clear the amount and stay put — the next girl is one tap away.
  useEffect(() => {
    if (state.saved && tokensRef.current) {
      tokensRef.current.value = "";
      tokensRef.current.focus();
    }
  }, [state.saved]);

  if (models.length === 0) {
    return <p className="text-sm text-muted">No models on the roster yet.</p>;
  }

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <input type="hidden" name="userId" value={modelId} />
      <input type="hidden" name="streamDate" value={date} />

      <fieldset>
        <legend className="text-sm font-medium">Who streamed</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {models.map((model) => {
            const selected = model.id === modelId;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setModelId(model.id)}
                aria-pressed={selected}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  selected
                    ? "border-accent-strong bg-accent-soft font-medium"
                    : "border-line text-muted"
                }`}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: model.color }}
                />
                {model.displayName}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Which night</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[
            { value: today, label: "Tonight" },
            { value: yesterday, label: "Last night" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDate(option.value)}
              aria-pressed={date === option.value}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                date === option.value
                  ? "border-accent-strong bg-accent-soft font-medium"
                  : "border-line text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
          <input
            type="date"
            aria-label="Another night"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          />
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Tokens</span>
        <input
          ref={tokensRef}
          name="tokens"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="4820"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-2xl tabular-nums outline-none focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Note (optional)</span>
        <input
          name="note"
          autoComplete="off"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-base outline-none focus:border-accent"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-accent-strong">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-live">
          {state.saved}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-strong px-4 py-3 text-base font-medium text-on-accent disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log tokens"}
      </button>
    </form>
  );
}
