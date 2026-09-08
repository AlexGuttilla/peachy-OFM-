"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clockTime, duration } from "@/lib/time";

export async function clockIn(): Promise<void> {
  const user = await requireUser();

  const open = await db.workSession.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (open) return;

  const now = new Date();
  await db.workSession.create({
    data: { userId: user.id, startedAt: now, lastSeenAt: now, source: "MANUAL" },
  });
  await db.event.create({
    data: {
      userId: user.id,
      type: "CLOCKED_IN",
      message: `${user.displayName} clocked in at ${clockTime(now)}`,
    },
  });

  revalidatePath("/live");
}

export async function clockOut(): Promise<void> {
  const user = await requireUser();

  const open = await db.workSession.findFirst({
    where: { userId: user.id, endedAt: null, source: "MANUAL" },
  });
  if (!open) return;

  const now = new Date();
  await db.workSession.update({
    where: { id: open.id },
    data: { endedAt: now, lastSeenAt: now },
  });
  await db.event.create({
    data: {
      userId: user.id,
      type: "CLOCKED_OUT",
      message: `${user.displayName} clocked out at ${clockTime(now)} — ${duration(
        open.startedAt,
        now,
      )}`,
    },
  });

  revalidatePath("/live");
}
