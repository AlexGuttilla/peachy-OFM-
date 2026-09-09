import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clockTime, duration, dayKey } from "@/lib/time";
import { formatTokens, formatUsd, tokensToUsd } from "@/lib/tokens";
import {
  MoneyPair,
  PersonRow,
  ScreenTitle,
  SectionTitle,
  BUTTON,
  BUTTON_QUIET,
} from "@/components/ui";
import { clockIn, clockOut } from "./actions";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

/** Look back far enough to catch a shift that started last night. */
const LOOKBACK_HOURS = 24;

export default async function LivePage() {
  const viewer = await requireUser();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 3600_000);

  // A creator's board is about her own shift. She never sees anyone else.
  const isCreator = viewer.role === "MODEL";
  const onlyMine = isCreator ? { userId: viewer.id } : {};

  const [open, myOpen, scheduled, events, tonight] = await Promise.all([
    db.workSession.findMany({
      where: { endedAt: null, ...onlyMine },
      include: { user: { select: { displayName: true, color: true, role: true } } },
      orderBy: { startedAt: "asc" },
    }),
    db.workSession.findFirst({ where: { userId: viewer.id, endedAt: null } }),
    db.shift.findMany({
      where: { startsAt: { lte: now }, endsAt: { gte: now }, ...onlyMine },
      include: { user: { select: { id: true, displayName: true, color: true } } },
    }),
    db.event.findMany({
      where: { createdAt: { gte: since }, ...onlyMine },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.tokenEntry.groupBy({
      by: ["userId"],
      where: { streamDate: dayKey(now), ...onlyMine },
      _sum: { tokens: true },
    }),
  ]);

  const models = open.filter((s) => s.user.role === "MODEL");
  const staff = open.filter((s) => s.user.role !== "MODEL");
  const liveIds = new Set(open.map((s) => s.userId));
  const missing = scheduled.filter((shift) => !liveIds.has(shift.userId));

  // Tokens logged by hand tonight. Until Chaturbate is connected these are the
  // only real numbers, so they take precedence over the session's own count.
  const loggedTonight = new Map(tonight.map((r) => [r.userId, r._sum.tokens ?? 0]));

  const autoClocked = myOpen?.source === "CHATURBATE";

  return (
    <div className="flex flex-col gap-7">
      <AutoRefresh seconds={30} />

      <ScreenTitle aside={clockTime(now)}>
        {isCreator ? "Your shift" : "On right now"}
      </ScreenTitle>

      {/* The owner runs the board, she does not work a shift on it. */}
      {viewer.role === "OWNER" ? null : (
        <form action={myOpen ? clockOut : clockIn}>
          <button
            type="submit"
            disabled={autoClocked}
            className={myOpen ? BUTTON_QUIET : BUTTON}
          >
            {!myOpen
              ? "Clock in"
              : autoClocked
                ? `Live since ${clockTime(myOpen.startedAt)}`
                : `Clock out · in since ${clockTime(myOpen.startedAt)}`}
          </button>
        </form>
      )}

      {models.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>{isCreator ? "You're live" : "Streaming now"}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {models.map((session) => {
              const tokens =
                loggedTonight.get(session.userId) || session.tokens || 0;
              return (
                <PersonRow
                  key={session.id}
                  name={session.user.displayName}
                  color={session.user.color}
                  tone="live"
                  badge={
                    <span className="ml-2 text-sm font-normal text-live">live</span>
                  }
                  detail={`${duration(session.startedAt, now)} · since ${clockTime(session.startedAt)}`}
                  trailing={
                    tokens > 0 ? (
                      <MoneyPair
                        money={formatUsd(tokensToUsd(tokens))}
                        tokens={formatTokens(tokens)}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </ul>
        </section>
      ) : null}

      {!isCreator && staff.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Team on shift</SectionTitle>
          <ul className="flex flex-col gap-2">
            {staff.map((session) => (
              <PersonRow
                key={session.id}
                name={session.user.displayName}
                color={session.user.color}
                detail={`${duration(session.startedAt, now)} · since ${clockTime(session.startedAt)}`}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {missing.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>
            {isCreator ? "You're booked now" : "Booked but not on yet"}
          </SectionTitle>
          <ul className="flex flex-col gap-2">
            {missing.map((shift) => (
              <PersonRow
                key={shift.id}
                name={shift.user.displayName}
                color={shift.user.color}
                tone="quiet"
                detail={`${clockTime(shift.startsAt)} – ${clockTime(shift.endsAt)}`}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {models.length === 0 && staff.length === 0 && missing.length === 0 ? (
        <p className="text-muted">
          {isCreator ? "You're not clocked in." : "Nobody is on right now."}
        </p>
      ) : null}

      {events.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionTitle>Earlier today</SectionTitle>
          <ul className="flex flex-col gap-2.5">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 tabular-nums text-muted">
                  {clockTime(event.createdAt)}
                </span>
                <span>{event.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
