"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { localToUtc } from "@/lib/time";

export type ShiftFormState = { error?: string; ok?: boolean };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Longest single shift we will accept, as a sanity check on typos. */
const MAX_SHIFT_HOURS = 16;

export async function saveShift(
  _prev: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  const user = await requireUser();

  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const requestedUserId = String(formData.get("userId") ?? "") || user.id;

  if (!DATE_RE.test(date)) return { error: "Pick a valid date." };
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
    return { error: "Enter both times as HH:MM." };
  }

  // Only the owner can schedule on somebody else's behalf.
  const userId = user.role === "OWNER" ? requestedUserId : user.id;
  if (user.role !== "OWNER" && requestedUserId !== user.id) {
    return { error: "You can only add your own hours." };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || !target.active) return { error: "That person is not on the roster." };

  const startsAt = localToUtc(date, start);
  let endsAt = localToUtc(date, end);

  // An end time at or before the start means the shift runs past midnight —
  // 9:30 PM to 4:00 AM finishes on the following day.
  if (endsAt <= startsAt) {
    const [y, m, d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    endsAt = localToUtc(nextDate, end);
  }

  const hours = (endsAt.getTime() - startsAt.getTime()) / 3600000;
  if (hours <= 0) return { error: "That shift has no length." };
  if (hours > MAX_SHIFT_HOURS) {
    return { error: `That is over ${MAX_SHIFT_HOURS} hours — check the times.` };
  }

  const shiftId = String(formData.get("shiftId") ?? "");
  if (shiftId) {
    const existing = await db.shift.findUnique({ where: { id: shiftId } });
    if (!existing) return { error: "That shift no longer exists." };
    if (user.role !== "OWNER" && existing.userId !== user.id) {
      return { error: "You can only change your own hours." };
    }
    await db.shift.update({
      where: { id: shiftId },
      data: { userId, startsAt, endsAt, note: note || null },
    });
  } else {
    await db.shift.create({
      data: { userId, startsAt, endsAt, note: note || null },
    });
  }

  revalidatePath("/schedule");
  return { ok: true };
}

export async function deleteShift(formData: FormData): Promise<void> {
  const user = await requireUser();
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!shiftId) return;

  const shift = await db.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return;
  if (user.role !== "OWNER" && shift.userId !== user.id) return;

  await db.shift.delete({ where: { id: shiftId } });
  revalidatePath("/schedule");
}
