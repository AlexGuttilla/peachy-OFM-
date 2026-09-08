import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clockTime, duration, dayKey } from "@/lib/time";
import { clockIn, clockOut } from "./actions";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

/** Look back far enough to catch a shift that started last night. */
const LOOKBACK_HOURS = 24;

export default async function LivePage() {
  const viewer = await requireUser();
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 3600_000);

  const [open, myOpen, scheduled, events, tonight] = await Promise.all([
    db.workSession.findMany({
      where: { endedAt: null },
      include: { user: { select: { displayName: true, color: true, role: true } } },
      orderBy: { startedAt: "asc" },
    }),
    db.workSession.findFirst({ where: { userId: viewer.id, endedAt: null } }),
    db.shift.findMany({
      where: { startsAt: { lte: now }, endsAt: { gte: now } },
      include: { user: { select: { id: true, displayName: true, color: true } } },
    }),
    db.event.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.tokenEntry.groupBy({
      by: ["userId"],
      where: { streamDate: dayKey(now) },
      _sum: { tokens: true },
    }),
  ]);

  // Tokens logged by hand tonight. Until Chaturbate is connected these are the
  // only real numbers, so they take precedence over the session's own count.
  const loggedTonight = new Map(
    tonight.map((row) => [row.userId, row._sum.tokens ?? 0]),
  );

  const models = open.filter((s) => s.user.role === "MODEL");
  const staff = open.filter((s) => s.user.role !== "MODEL");
  const liveIds = new Set(open.map((s) => s.userId));

  // Scheduled to be working right now, but nothing has clocked them in.
  const missing = scheduled.filter((shift) => !liveIds.has(shift.userId));

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />

      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Who&rsquo;s on now</h1>
        <p className="text-xs text-muted">{dayKey(now)} · {clockTime(now)}</p>
      </div>

      <form action={myOpen ? clockOut : clockIn}>
        <button
          type="submit"
          disabled={myOpen?.source === "CHATURBATE"}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-60 ${
            myOpen ? "border border-line" : "bg-accent-strong text-on-accent"
          }`}
        >
          {!myOpen
            ? "Clock in"
            : myOpen.source === "CHATURBATE"
              ? `Live since ${clockTime(myOpen.startedAt)} — clocked in automatically`
              : `Clock out (in since ${clockTime(myOpen.startedAt)})`}
        </button>
      </form>

      <Section title="Models live" count={models.length}>
        {models.map((session) => (
          <Row
            key={session.id}
            color={session.user.color}
            name={session.user.displayName}
            detail={`live ${duration(session.startedAt, now)} · since ${clockTime(session.startedAt)}`}
            trailing={tokenLabel(loggedTonight.get(session.userId) ?? 0, session.tokens)}
            live
          />
        ))}
      </Section>

      <Section title="Team clocked in" count={staff.length}>
        {staff.map((session) => (
          <Row
            key={session.id}
            color={session.user.color}
            name={session.user.displayName}
            detail={`in ${duration(session.startedAt, now)} · since ${clockTime(session.startedAt)}`}
          />
        ))}
      </Section>

      {missing.length > 0 ? (
        <Section title="Scheduled but not on" count={missing.length}>
          {missing.map((shift) => (
            <Row
              key={shift.id}
              color={shift.user.color}
              name={shift.user.displayName}
              detail={`booked ${clockTime(shift.startsAt)} – ${clockTime(shift.endsAt)}`}
              muted
            />
          ))}
        </Section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold">Recent activity</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing in the last 24 hours.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {events.map((event) => (
              <li key={event.id} className="flex gap-2 text-sm">
                <span className="shrink-0 tabular-nums text-muted">
                  {clockTime(event.createdAt)}
                </span>
                <span className="text-ink">{event.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Prefer what a person logged tonight; fall back to the live feed's count. */
function tokenLabel(logged: number, fromFeed: number): string | undefined {
  const tokens = logged > 0 ? logged : fromFeed;
  return tokens > 0 ? `${tokens.toLocaleString()} tk` : undefined;
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="mt-2 text-sm text-muted">Nobody right now.</p>
      ) : (
        <ul className="mt-2 space-y-2">{children}</ul>
      )}
    </section>
  );
}

function Row({
  color,
  name,
  detail,
  trailing,
  live,
  muted,
}: {
  color: string;
  name: string;
  detail: string;
  trailing?: string;
  live?: boolean;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        live ? "border-live-line bg-live-soft" : "border-line"
      } ${muted ? "opacity-70" : ""}`}
    >
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name}
          {live ? <span className="ml-2 text-xs font-normal text-live">● live</span> : null}
        </p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
      {trailing ? <span className="shrink-0 text-sm tabular-nums">{trailing}</span> : null}
    </li>
  );
}
