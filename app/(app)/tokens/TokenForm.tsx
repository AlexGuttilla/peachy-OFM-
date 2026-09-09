"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar, BUTTON, FIELD } from "@/components/ui";
import { parseTokenAmount } from "@/lib/tokens";
import { recordTokens, type TokenFormState } from "./actions";

type Model = { id: string; displayName: string; color: string };

const initial: TokenFormState = {};

const CHIP = "flex items-center gap-2 rounded-full px-3.5 py-2 text-base";
const CHIP_ON = "bg-accent-soft font-medium text-ink";
const CHIP_OFF = "bg-surface text-muted";

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
  rate,
}: {
  models: Model[];
  today: string;
  rate: number;
}) {
  const [state, action, pending] = useActionState(recordTokens, initial);
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [preview, setPreview] = useState<string | null>(null);
  const tokensRef = useRef<HTMLInputElement>(null);
  const yesterday = shiftDay(today, -1);

  // After a save, clear the amount and stay put — the next girl is one tap away.
  useEffect(() => {
    if (state.saved && tokensRef.current) {
      tokensRef.current.value = "";
      setPreview(null);
      tokensRef.current.focus();
    }
  }, [state.saved]);

  if (models.length === 0) {
    return <p className="text-muted">No creators on the roster yet.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl bg-surface p-4">
      <input type="hidden" name="userId" value={modelId} />
      <input type="hidden" name="streamDate" value={date} />

      <fieldset>
        <legend className="font-medium">Who streamed</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {models.map((model) => {
            const selected = model.id === modelId;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setModelId(model.id)}
                aria-pressed={selected}
                className={`${CHIP} ${selected ? CHIP_ON : CHIP_OFF}`}
              >
                <Avatar name={model.displayName} color={model.color} size="sm" />
                {model.displayName}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-medium">Which night</legend>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { value: today, label: "Tonight" },
            { value: yesterday, label: "Last night" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDate(option.value)}
              aria-pressed={date === option.value}
              className={`rounded-full px-4 py-2 text-base ${
                date === option.value ? CHIP_ON : CHIP_OFF
              }`}
            >
              {option.label}
            </button>
          ))}
          <input
            type="date"
            aria-label="Another night"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-full bg-surface px-3 py-2 text-sm text-muted"
          />
        </div>
      </fieldset>

      <label className="block">
        <span className="font-medium">How many tokens</span>
        <input
          ref={tokensRef}
          name="tokens"
          required
          inputMode="numeric"
          autoComplete="off"
          placeholder="4820"
          onChange={(event) => {
            const value = event.target.value.trim();
            if (!value) return setPreview(null);
            const parsed = parseTokenAmount(value);
            setPreview(
              "error" in parsed
                ? null
                : (parsed.tokens * rate).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  }),
            );
          }}
          className={`${FIELD} mt-2 py-4 text-3xl tabular-nums`}
        />
        <span className="mt-2 block text-sm text-muted" aria-live="polite">
          {preview ? `That's ${preview}` : "Five cents a token"}
        </span>
      </label>

      <label className="block">
        <span className="font-medium">Note</span>
        <input name="note" autoComplete="off" className={`${FIELD} mt-2`} />
      </label>

      {state.error ? (
        <p role="alert" className="text-accent-strong">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-live">
          {state.saved}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={BUTTON}>
        {pending ? "Saving…" : "Log it"}
      </button>
    </form>
  );
}
