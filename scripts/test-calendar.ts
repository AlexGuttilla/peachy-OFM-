import { PrismaClient } from "@prisma/client";
import { localToUtc, clockTime, dayKey } from "../lib/time";
import {
  toShiftView,
  toSessionView,
  shiftsByDay,
  buildGrid,
  gridRange,
} from "../lib/calendar";

const db = new PrismaClient();
let failures = 0;

function check(label: string, condition: boolean, extra = "") {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!condition) failures++;
}

/** A throwaway user, so these tests never depend on who is on the roster. */
const FIXTURE = "__test_calendar";

async function main() {
  await db.user.deleteMany({ where: { username: FIXTURE } });
  const model = await db.user.create({
    data: {
      username: FIXTURE,
      displayName: "Test Model",
      role: "MODEL",
      color: "#000000",
      passwordHash: "x",
    },
  });

  // The exact case from the brief: Sept 9, 9:30 PM until 4:00 AM on Sept 10.
  const startsAt = localToUtc("2026-09-09", "21:30");
  const endsAt = localToUtc("2026-09-10", "04:00");

  const shift = await db.shift.create({
    data: { userId: model.id, startsAt, endsAt, note: null },
    include: { user: { select: { displayName: true, color: true } } },
  });

  console.log("\nShift stored 9:30 PM Sep 9 -> 4:00 AM Sep 10");
  check("start reads back as 9:30 PM", clockTime(shift.startsAt) === "9:30 PM", clockTime(shift.startsAt));
  check("end reads back as 4:00 AM", clockTime(shift.endsAt) === "4:00 AM", clockTime(shift.endsAt));
  check("starts on the 9th", dayKey(shift.startsAt) === "2026-09-09", dayKey(shift.startsAt));
  check("ends on the 10th", dayKey(shift.endsAt) === "2026-09-10", dayKey(shift.endsAt));

  const view = toShiftView(shift, true);
  check("flagged as crossing midnight", view.crossesMidnight);

  console.log("\nCalendar placement");
  const byDay = shiftsByDay([view]);
  check("appears on Sept 9", (byDay.get("2026-09-09") ?? []).length === 1);
  check("appears on Sept 10 as a continuation", (byDay.get("2026-09-10") ?? []).length === 1);
  check("does not appear on Sept 8", (byDay.get("2026-09-08") ?? []).length === 0);
  check("does not appear on Sept 11", (byDay.get("2026-09-11") ?? []).length === 0);

  console.log("\nMonth grid, September 2026");
  const grid = buildGrid(2026, 9);
  check("whole weeks only", grid.length % 7 === 0, String(grid.length));
  check("no dead trailing week", grid.slice(-7).some((c) => c.inMonth) || grid.length === 35, String(grid.length));
  check("30 days in September", grid.filter((c) => c.inMonth).length === 30);
  check("first in-month cell is the 1st", grid.find((c) => c.inMonth)?.dayOfMonth === 1);

  const range = gridRange(2026, 9);
  check(
    "query range covers the whole visible grid",
    range.from < startsAt && range.to > endsAt,
    `${range.from.toISOString()} .. ${range.to.toISOString()}`,
  );

  // A month boundary is the easy place to get this wrong.
  console.log("\nMonth grid, February 2027 (non-leap)");
  const feb = buildGrid(2027, 2);
  check("28 days", feb.filter((c) => c.inMonth).length === 28);
  check("whole weeks only", feb.length % 7 === 0, String(feb.length));

  console.log("\nA session still running is described by when it started");
  const openView = toSessionView(
    {
      id: "open",
      userId: model.id,
      startedAt: localToUtc("2026-09-09", "21:42"),
      endedAt: null,
      source: "CHATURBATE",
      user: { displayName: "Test Model", color: "#000000" },
    },
    // "Now" is past midnight — this is what used to render "now next day".
    localToUtc("2026-09-10", "00:04"),
  );
  check("no end label while open", openView.endLabel === null);
  check("flagged open", openView.open);
  check("measured to now", openView.lengthLabel === "2h 22m", openView.lengthLabel);

  console.log("\nA finished overnight session keeps both ends");
  const closedView = toSessionView(
    {
      id: "closed",
      userId: model.id,
      startedAt: localToUtc("2026-09-09", "21:32"),
      endedAt: localToUtc("2026-09-10", "04:07"),
      source: "CHATURBATE",
      user: { displayName: "Test Model", color: "#000000" },
    },
    new Date(),
  );
  check("end label kept", closedView.endLabel === "4:07 AM", String(closedView.endLabel));
  check("crosses midnight", closedView.crossesMidnight);
  check("length spans midnight", closedView.lengthLabel === "6h 35m", closedView.lengthLabel);

  await db.user.delete({ where: { id: model.id } });
  console.log(failures === 0 ? "\nAll calendar checks passed.\n" : `\n${failures} FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
