import { formatInTimeZone } from "date-fns-tz";
import { TZ, clockTime, dayKey } from "@/lib/time";

export type ShiftView = {
  id: string;
  userId: string;
  displayName: string;
  color: string;
  startLabel: string;
  endLabel: string;
  startDay: string;
  endDay: string;
  crossesMidnight: boolean;
  note: string | null;
  canEdit: boolean;
};

export type DayCell = {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
};

/** "2026-09" -> { year: 2026, month: 9 } */
export function parseMonth(input: string | undefined): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(input ?? "");
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = formatInTimeZone(new Date(), TZ, "yyyy-MM").split("-");
  return { year: Number(now[0]), month: Number(now[1]) };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): string {
  const total = year * 12 + (month - 1) + delta;
  return monthKey(Math.floor(total / 12), (total % 12) + 1);
}

export function monthLabel(year: number, month: number): string {
  return formatInTimeZone(new Date(Date.UTC(year, month - 1, 15, 12)), TZ, "MMMM yyyy");
}

/** Noon UTC on a given business-timezone calendar day — safe from DST edges. */
function noonOf(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Sunday .. 6 = Saturday */
function weekdayOf(year: number, month: number, day: number): number {
  return Number(formatInTimeZone(noonOf(year, month, day), TZ, "i")) % 7;
}

export function dayKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whole weeks covering the month, padded with the neighbouring months' days. */
export function buildGrid(year: number, month: number): DayCell[] {
  const today = dayKey(new Date());
  const lead = weekdayOf(year, month, 1);
  const count = daysInMonth(year, month);

  const prevTotal = year * 12 + (month - 1) - 1;
  const prevYear = Math.floor(prevTotal / 12);
  const prevMonth = (prevTotal % 12) + 1;
  const prevCount = daysInMonth(prevYear, prevMonth);

  const cells: DayCell[] = [];

  for (let i = lead; i > 0; i--) {
    const day = prevCount - i + 1;
    cells.push({
      key: dayKeyOf(prevYear, prevMonth, day),
      dayOfMonth: day,
      inMonth: false,
      isToday: false,
    });
  }

  for (let day = 1; day <= count; day++) {
    const key = dayKeyOf(year, month, day);
    cells.push({ key, dayOfMonth: day, inMonth: true, isToday: key === today });
  }

  const nextTotal = year * 12 + (month - 1) + 1;
  const nextYear = Math.floor(nextTotal / 12);
  const nextMonth = (nextTotal % 12) + 1;

  let day = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      key: dayKeyOf(nextYear, nextMonth, day),
      dayOfMonth: day,
      inMonth: false,
      isToday: false,
    });
    day++;
  }

  return cells;
}

/** UTC range covering the whole visible grid, so shifts on padding days load too. */
export function gridRange(year: number, month: number): { from: Date; to: Date } {
  const grid = buildGrid(year, month);
  const first = grid[0].key.split("-").map(Number);
  const last = grid[grid.length - 1].key.split("-").map(Number);
  return {
    from: new Date(Date.UTC(first[0], first[1] - 1, first[2] - 1, 0)),
    to: new Date(Date.UTC(last[0], last[1] - 1, last[2] + 2, 0)),
  };
}

export function toShiftView(
  shift: {
    id: string;
    userId: string;
    startsAt: Date;
    endsAt: Date;
    note: string | null;
    user: { displayName: string; color: string };
  },
  canEdit: boolean,
): ShiftView {
  const startDay = dayKey(shift.startsAt);
  const endDay = dayKey(shift.endsAt);
  return {
    id: shift.id,
    userId: shift.userId,
    displayName: shift.user.displayName,
    color: shift.user.color,
    startLabel: clockTime(shift.startsAt),
    endLabel: clockTime(shift.endsAt),
    startDay,
    endDay,
    crossesMidnight: startDay !== endDay,
    note: shift.note,
    canEdit,
  };
}

/** A shift appears on its start day and on every day it runs into. */
export function shiftsByDay(shifts: ShiftView[]): Map<string, ShiftView[]> {
  const map = new Map<string, ShiftView[]>();
  for (const shift of shifts) {
    for (const key of [shift.startDay, shift.endDay]) {
      const list = map.get(key) ?? [];
      if (!list.some((s) => s.id === shift.id)) list.push(shift);
      map.set(key, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.startLabel.localeCompare(b.startLabel));
  }
  return map;
}
