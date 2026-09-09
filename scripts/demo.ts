import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000);

async function main() {
  await db.tokenEntry.deleteMany({});
  await db.workSession.deleteMany({});
  await db.event.deleteMany({});
  await db.shift.deleteMany({});

  // Creators have no username until they set one up, so look them up by name.
  const u = async (displayName: string) => {
    const found = await db.user.findFirst({ where: { displayName } });
    if (!found) throw new Error(`No user named ${displayName}`);
    return found;
  };

  const [m1, m2, m3, va, mgr] = await Promise.all([
    u("Chelsea"), u("Amelia"), u("Brooks"), u("VA 1"), u("Stream Manager 1"),
  ]);

  // A finished shift from last night, so a past day has real hours on it.
  await db.workSession.create({
    data: {
      userId: m1.id,
      startedAt: new Date(now.getTime() - 27 * 3600_000),
      endedAt: new Date(now.getTime() - 20.5 * 3600_000),
      lastSeenAt: new Date(now.getTime() - 20.5 * 3600_000),
      source: "CHATURBATE",
      tokens: 7115,
    },
  });

  // Two models live right now, detected automatically.
  await db.workSession.create({
    data: { userId: m1.id, startedAt: ago(142), lastSeenAt: now, source: "CHATURBATE", tokens: 4820 },
  });
  await db.workSession.create({
    data: { userId: m3.id, startedAt: ago(38), lastSeenAt: now, source: "CHATURBATE", tokens: 610 },
  });

  // Team clocked in by hand.
  await db.workSession.create({
    data: { userId: va.id, startedAt: ago(215), lastSeenAt: now, source: "MANUAL" },
  });
  await db.workSession.create({
    data: { userId: mgr.id, startedAt: ago(64), lastSeenAt: now, source: "MANUAL" },
  });

  // Scheduled right now: m1 (on, good), m2 (booked but not live).
  await db.shift.createMany({
    data: [
      { userId: m1.id, startsAt: ago(150), endsAt: new Date(now.getTime() + 90 * 60_000) },
      { userId: m2.id, startsAt: ago(45), endsAt: new Date(now.getTime() + 180 * 60_000), note: "promo night" },
    ],
  });

  // Events carry the time they happened, so the feed's timestamps line up
  // with the sentences next to them.
  const clockLabel = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  for (const entry of [
    { user: va,  mins: 217, type: "CLOCKED_IN", verb: "clocked in" },
    { user: m1,  mins: 143, type: "WENT_LIVE",  verb: "went live" },
    { user: mgr, mins: 66,  type: "CLOCKED_IN", verb: "clocked in" },
    { user: m3,  mins: 41,  type: "WENT_LIVE",  verb: "went live" },
  ]) {
    const at = ago(entry.mins);
    await db.event.create({
      data: {
        userId: entry.user.id,
        type: entry.type,
        message: `${entry.user.displayName} ${entry.verb} at ${clockLabel(at)}`,
        createdAt: at,
      },
    });
  }

  // A few nights of tokens, the way the stream manager would have typed them.
  const day = (back: number) => {
    const d = new Date(now.getTime() - back * 86400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  await db.tokenEntry.createMany({
    data: [
      { userId: m1.id, streamDate: day(0), tokens: 4820, recordedById: mgr.id },
      { userId: m3.id, streamDate: day(0), tokens: 610, recordedById: mgr.id, note: "short night" },
      { userId: m1.id, streamDate: day(1), tokens: 7115, recordedById: mgr.id },
      { userId: m2.id, streamDate: day(1), tokens: 2940, recordedById: va.id },
      { userId: m3.id, streamDate: day(2), tokens: 5380, recordedById: mgr.id },
      { userId: m1.id, streamDate: day(3), tokens: 3260, recordedById: va.id },
      { userId: m2.id, streamDate: day(4), tokens: 8410, recordedById: mgr.id, note: "promo night" },
    ],
  });

  console.log("demo data loaded");
}

main().finally(() => db.$disconnect());
