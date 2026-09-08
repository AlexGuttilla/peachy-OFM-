import { PrismaClient } from "@prisma/client";
import { pollPresence, OFFLINE_GRACE_MS } from "../lib/presence";
import { writeFile, rm } from "node:fs/promises";

const db = new PrismaClient();
let failures = 0;

function check(label: string, condition: boolean, extra = "") {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!condition) failures++;
}

async function setLive(names: string[]) {
  await writeFile(".live-mock.json", JSON.stringify(names));
}

async function main() {
  const model = await db.user.findUniqueOrThrow({ where: { username: "model1" } });
  await db.workSession.deleteMany({});
  await db.event.deleteMany({});

  console.log("\n1. She goes live -> session opens automatically");
  await setLive(["model1"]);
  await pollPresence();
  let session = await db.workSession.findFirst({ where: { userId: model.id } });
  check("session opened", session !== null);
  check("session is open", session?.endedAt === null);
  check("source is CHATURBATE", session?.source === "CHATURBATE");
  const wentLive = await db.event.findFirst({ where: { type: "WENT_LIVE" } });
  check("WENT_LIVE event written", wentLive !== null, wentLive?.message ?? "");

  console.log("\n2. Still live -> no duplicate session");
  await pollPresence();
  check("still exactly one session", (await db.workSession.count()) === 1);

  console.log("\n3. Goes quiet, inside the grace window -> stays open");
  await setLive([]);
  await pollPresence();
  session = await db.workSession.findFirstOrThrow({ where: { userId: model.id } });
  check("session still open after 1 quiet poll", session.endedAt === null);

  console.log("\n4. Quiet past 5 minutes -> shift ends, backdated to last seen");
  const lastSeen = new Date(Date.now() - OFFLINE_GRACE_MS - 1000);
  await db.workSession.update({
    where: { id: session.id },
    data: { lastSeenAt: lastSeen, startedAt: new Date(lastSeen.getTime() - 3600_000) },
  });
  await pollPresence();
  session = await db.workSession.findFirstOrThrow({ where: { userId: model.id } });
  check("session closed", session.endedAt !== null);
  check(
    "closed at last-seen, not at detection time",
    session.endedAt?.getTime() === lastSeen.getTime(),
    `ended ${session.endedAt?.toISOString()} vs lastSeen ${lastSeen.toISOString()}`,
  );
  const ended = await db.event.findFirst({ where: { type: "SHIFT_ENDED" } });
  check("SHIFT_ENDED event written", ended !== null, ended?.message ?? "");

  console.log("\n5. Comes back later -> a new, separate session");
  await setLive(["model1"]);
  await pollPresence();
  check("two sessions now", (await db.workSession.count({ where: { userId: model.id } })) === 2);
  check(
    "one open, one closed",
    (await db.workSession.count({ where: { userId: model.id, endedAt: null } })) === 1,
  );

  await rm(".live-mock.json", { force: true });
  await db.workSession.deleteMany({});
  await db.event.deleteMany({});

  console.log(failures === 0 ? "\nAll presence checks passed.\n" : `\n${failures} FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
