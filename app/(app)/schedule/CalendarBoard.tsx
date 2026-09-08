"use client";

import { useActionState, useEffect, useState } from "react";
import type { DayCell, ShiftView } from "@/lib/calendar";
import { deleteShift, saveShift, type ShiftFormState } from "./actions";

type Cell = DayCell & { shifts: ShiftView[] };
type Person = { id: string; displayName: string; color: string; role: string };
type Viewer = { id: string; role: string; displayName: string };

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const initialState: ShiftFormState = {};

function longDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function CalendarBoard({
  grid,
  roster,
  viewer,
  today,
}: {
  grid: Cell[];
  roster: Person[];
  viewer: Viewer;
  today: string;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const selected = grid.find((cell) => cell.key === openDay) ?? null;

  return (
    <>
      <div className="mt-4 grid grid-cols-7 gap-px text-center text-xs text-muted">
        {WEEKDAYS.map((label, i) => (
          <div key={i} className="pb-1.5">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {grid.map((cell) => (
          <button
            key={cell.key}
            type="button"
            onClick={() => setOpenDay(cell.key)}
            className={`flex min-h-16 flex-col items-center gap-1 bg-surface px-1 pb-1.5 pt-1.5 ${
              cell.inMonth ? "" : "opacity-40"
            }`}
          >
            <span
              className={`grid size-6 place-items-center rounded-full text-xs ${
                cell.key === today
                  ? "bg-accent font-semibold text-white"
                  : "text-ink"
              }`}
            >
              {cell.dayOfMonth}
            </span>

            <span className="flex flex-wrap justify-center gap-0.5">
              {cell.shifts.slice(0, 4).map((shift) => (
                <span
                  key={shift.id}
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{
                    background: shift.color,
                    // A shift running into this day from yesterday reads as
                    // an outline, not a fresh commitment.
                    opacity: shift.endDay === cell.key && shift.crossesMidnight ? 0.4 : 1,
                  }}
                />
              ))}
              {cell.shifts.length > 4 ? (
                <span className="text-[9px] leading-none text-muted">
                  +{cell.shifts.length - 4}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <DaySheet
          cell={selected}
          roster={roster}
          viewer={viewer}
          onClose={() => setOpenDay(null)}
        />
      ) : null}
    </>
  );
}

function DaySheet({
  cell,
  roster,
  viewer,
  onClose,
}: {
  cell: Cell;
  roster: Person[];
  viewer: Viewer;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<ShiftView | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showForm = adding || editing !== null;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="pb-safe relative max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        <h2 className="text-base font-semibold">{longDate(cell.key)}</h2>

        {cell.shifts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nobody scheduled yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cell.shifts.map((shift) => {
              const continuation = shift.endDay === cell.key && shift.crossesMidnight;
              return (
                <li
                  key={shift.id}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: shift.color, opacity: continuation ? 0.4 : 1 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{shift.displayName}</p>
                    <p className="text-xs text-muted">
                      {continuation
                        ? `runs until ${shift.endLabel}, started ${shift.startLabel} yesterday`
                        : `${shift.startLabel} – ${shift.endLabel}${
                            shift.crossesMidnight ? " next day" : ""
                          }`}
                      {shift.note ? ` · ${shift.note}` : ""}
                    </p>
                  </div>

                  {shift.canEdit && !continuation ? (
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(shift);
                          setAdding(false);
                        }}
                        className="text-muted underline underline-offset-4"
                      >
                        Edit
                      </button>
                      <form action={deleteShift}>
                        <input type="hidden" name="shiftId" value={shift.id} />
                        <button type="submit" className="text-accent underline underline-offset-4">
                          Remove
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {showForm ? (
          <ShiftForm
            key={editing?.id ?? "new"}
            date={cell.key}
            roster={roster}
            viewer={viewer}
            shift={editing}
            onDone={() => {
              setEditing(null);
              setAdding(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white"
          >
            {viewer.role === "OWNER" ? "Add hours" : "Add my hours"}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 mb-2 w-full rounded-xl border border-line px-4 py-3 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ShiftForm({
  date,
  roster,
  viewer,
  shift,
  onDone,
}: {
  date: string;
  roster: Person[];
  viewer: Viewer;
  shift: ShiftView | null;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(saveShift, initialState);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl border border-line p-3">
      <input type="hidden" name="date" value={date} />
      {shift ? <input type="hidden" name="shiftId" value={shift.id} /> : null}

      {viewer.role === "OWNER" ? (
        <label className="block text-sm">
          <span className="font-medium">Who</span>
          <select
            name="userId"
            defaultValue={shift?.userId ?? roster[0]?.id}
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base"
          >
            {roster.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="userId" value={viewer.id} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">Start</span>
          <input
            type="time"
            name="start"
            required
            defaultValue={shift ? to24h(shift.startLabel) : "21:00"}
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">End</span>
          <input
            type="time"
            name="end"
            required
            defaultValue={shift ? to24h(shift.endLabel) : "02:00"}
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base"
          />
        </label>
      </div>

      <p className="text-xs text-muted">
        An end time earlier than the start rolls over to the next day.
      </p>

      <label className="block text-sm">
        <span className="font-medium">Note (optional)</span>
        <input
          name="note"
          defaultValue={shift?.note ?? ""}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : shift ? "Save changes" : "Add to calendar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** "9:30 PM" -> "21:30", for prefilling a native time input. */
function to24h(label: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return "21:00";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
