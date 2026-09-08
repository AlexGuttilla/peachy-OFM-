import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  byDay,
  buildGrid,
  gridRange,
  monthLabel,
  parseMonth,
  shiftMonth,
  shiftsByDay,
  toSessionView,
  toShiftView,
} from "@/lib/calendar";
import { todayKey } from "@/lib/time";
import CalendarBoard from "./CalendarBoard";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonth(monthParam);

  const { from, to } = gridRange(year, month);
  const now = new Date();

  // A creator sees her own calendar and nobody else's.
  const isCreator = user.role === "MODEL";
  const onlyMine = isCreator ? { userId: user.id } : {};

  const [shifts, sessions, roster] = await Promise.all([
    db.shift.findMany({
      where: { startsAt: { gte: from, lt: to }, ...onlyMine },
      include: { user: { select: { displayName: true, color: true } } },
      orderBy: { startsAt: "asc" },
    }),
    // What was actually worked, so a day can be compared against its plan.
    db.workSession.findMany({
      where: { startedAt: { gte: from, lt: to }, ...onlyMine },
      include: { user: { select: { displayName: true, color: true } } },
      orderBy: { startedAt: "asc" },
    }),
    db.user.findMany({
      where: isCreator
        ? { id: user.id }
        : { active: true, role: { in: ["MODEL", "EMPLOYEE"] } },
      select: { id: true, displayName: true, color: true, role: true },
      // Models first — they are who the owner is usually scheduling.
      orderBy: [{ role: "desc" }, { displayName: "asc" }],
    }),
  ]);

  const views = shifts.map((shift) =>
    toShiftView(shift, user.role === "OWNER" || shift.userId === user.id),
  );

  const sessionViews = sessions.map((session) => toSessionView(session, now));

  const shiftDays = shiftsByDay(views);
  const sessionDays = byDay(sessionViews);

  const grid = buildGrid(year, month).map((cell) => ({
    ...cell,
    shifts: shiftDays.get(cell.key) ?? [],
    sessions: sessionDays.get(cell.key) ?? [],
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {monthLabel(year, month)}
        </h1>
        <div className="flex gap-1">
          <Link
            href={`/schedule?month=${shiftMonth(year, month, -1)}`}
            aria-label="Previous month"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          >
            ‹
          </Link>
          <Link
            href={`/schedule?month=${shiftMonth(year, month, 1)}`}
            aria-label="Next month"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          >
            ›
          </Link>
        </div>
      </div>

      <CalendarBoard
        grid={grid}
        roster={roster}
        viewer={{ id: user.id, role: user.role, displayName: user.displayName }}
        today={todayKey()}
      />

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {(isCreator ? [] : roster).map((person) => (
          <span key={person.id} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: person.color }}
            />
            {person.displayName}
          </span>
        ))}
      </div>
    </div>
  );
}
