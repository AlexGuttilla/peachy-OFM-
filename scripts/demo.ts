import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000);

async function main() {
  await db.tokenEntry.deleteMany({});
  await db.workSession.deleteMany({});
  await db.event.deleteMany({});
  await db.shift.deleteMany({});

  const u = async (username: string) =>
    db.user.findUniqueOrThrow({ where: { username } });

  const [m1, m2, m3, va, mgr] = await Promise.all([
    u("chelsea"), u("amelia"), u("brooks"), u("va1"), u("manager1"),
  ]);

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

  await db.event.createMany({
    data: [
      { userId: va.id, type: "CLOCKED_IN", message: "VA 1 clocked in at 3:55 AM" },
      { userId: m1.id, type: "WENT_LIVE", message: "Model 1 went live at 5:07 AM" },
      { userId: mgr.id, type: "CLOCKED_IN", message: "Stream Manager 1 clocked in at 6:25 AM" },
      { userId: m3.id, type: "WENT_LIVE", message: "Model 3 went live at 6:51 AM" },
    ],
  });

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
