import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Everything is stored in UTC and displayed in one business timezone, so a
 * shift entered as "9:30pm" reads as 9:30pm to everybody looking at it.
 */
export const TZ = process.env.APP_TIMEZONE || "America/New_York";

/** "2026-09-09" + "21:30" (business time) -> UTC Date */
export function localToUtc(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TZ);
}

/** UTC Date -> "2026-09-09" in business time */
export function dayKey(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** UTC Date -> "9:30 PM" in business time */
export function clockTime(d: Date): string {
  return formatInTimeZone(d, TZ, "h:mm a");
}

export function fmt(d: Date, pattern: string): string {
  return formatInTimeZone(d, TZ, pattern);
}

/** "Now", expressed as a wall-clock Date in the business timezone. */
export function nowLocal(): Date {
  return toZonedTime(new Date(), TZ);
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Human duration: 6h 30m */
export function duration(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 3600000);
}
