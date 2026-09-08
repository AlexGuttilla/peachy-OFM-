import { db } from "@/lib/db";
import { getProvider } from "@/lib/chaturbate";
import { clockTime, duration } from "@/lib/time";

/**
 * How long a model must show no sign of life before we call the shift over.
 * The session is then closed at `lastSeenAt` — the last moment we had
 * evidence she was live — not at the moment we noticed. Otherwise every
 * shift would be inflated by the length of this window.
 */
export const OFFLINE_GRACE_MS = 5 * 60 * 1000;

type PollResult = {
  checked: number;
  opened: string[];
  closed: string[];
};

async function openSession(
  userId: string,
  displayName: string,
  at: Date,
): Promise<boolean> {
  const existing = await db.workSession.findFirst({
    where: { userId, endedAt: null },
  });

  if (existing) {
    await db.workSession.update({
      where: { id: existing.id },
      data: { lastSeenAt: at },
    });
    return false;
  }

  await db.workSession.create({
    data: { userId, startedAt: at, lastSeenAt: at, source: "CHATURBATE" },
  });
  await db.event.create({
    data: {
      userId,
      type: "WENT_LIVE",
      message: `${displayName} went live at ${clockTime(at)}`,
    },
  });
  return true;
}

async function closeSession(
  userId: string,
  displayName: string,
  endedAt: Date,
): Promise<boolean> {
  const open = await db.workSession.findFirst({
    where: { userId, endedAt: null, source: "CHATURBATE" },
  });
  if (!open) return false;

  // Never let a session end before it started, however the clocks land.
  const end = endedAt < open.startedAt ? open.startedAt : endedAt;

  await db.workSession.update({
    where: { id: open.id },
    data: { endedAt: end },
  });
  await db.event.create({
    data: {
      userId,
      type: "SHIFT_ENDED",
      message: `${displayName} ended her shift at ${clockTime(end)} — ${duration(
        open.startedAt,
        end,
      )} live`,
    },
  });
  return true;
}

/**
 * One pass over every model with Chaturbate credentials. Safe to call on a
 * short interval; it is idempotent and does no work when nothing changed.
 */
export async function pollPresence(): Promise<PollResult> {
  const provider = getProvider();
  const models = await db.user.findMany({
    where: { role: "MODEL", active: true, chaturbateUsername: { not: null } },
  });

  const result: PollResult = { checked: 0, opened: [], closed: [] };
  const now = new Date();

  for (const model of models) {
    result.checked += 1;

    let probe;
    try {
      probe = await provider.probe({
        eventsUrl: model.chaturbateEventsUrl,
        cursor: model.chaturbateCursor,
        username: model.chaturbateUsername!,
      });
    } catch {
      // A failed poll is not evidence she went offline. Leave the session
      // open and let the grace window decide on a later pass.
      continue;
    }

    if (probe.nextCursor !== model.chaturbateCursor) {
      await db.user.update({
        where: { id: model.id },
        data: { chaturbateCursor: probe.nextCursor },
      });
    }

    let tokens = 0;
    let explicitStop: Date | null = null;

    for (const signal of probe.signals) {
      if (signal.kind === "went_live") {
        explicitStop = null;
        if (await openSession(model.id, model.displayName, signal.at)) {
          result.opened.push(model.displayName);
        }
      } else if (signal.kind === "went_offline") {
        explicitStop = signal.at;
      } else if (signal.kind === "tip") {
        tokens += signal.tokens;
        explicitStop = null;
      }
    }

    const open = await db.workSession.findFirst({
      where: { userId: model.id, endedAt: null },
    });

    if (tokens > 0 && open) {
      await db.workSession.update({
        where: { id: open.id },
        data: { tokens: { increment: tokens }, lastSeenAt: now },
      });
    }

    if (explicitStop) {
      // She told us she stopped. Trust it, no waiting.
      if (await closeSession(model.id, model.displayName, explicitStop)) {
        result.closed.push(model.displayName);
      }
      continue;
    }

    if (probe.sawActivity) {
      if (await openSession(model.id, model.displayName, now)) {
        result.opened.push(model.displayName);
      }
      continue;
    }

    // Silence. Close the shift only once the grace window has fully elapsed.
    if (open && now.getTime() - open.lastSeenAt.getTime() >= OFFLINE_GRACE_MS) {
      if (await closeSession(model.id, model.displayName, open.lastSeenAt)) {
        result.closed.push(model.displayName);
      }
    }
  }

  return result;
}
