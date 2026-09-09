import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PeachMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const isOwner = user.role === "OWNER";

  // A live count on the second card, so the screen answers something on sight.
  const [liveNow, myOpen] = await Promise.all([
    db.workSession.count({ where: { endedAt: null } }),
    db.workSession.findFirst({ where: { userId: user.id, endedAt: null } }),
  ]);

  const cards = [
    {
      href: "/schedule",
      title: isOwner ? "Creators' Schedules" : "Mark Your Schedule",
      detail: isOwner
        ? "Everyone's committed nights, month by month"
        : "Pick the nights you're streaming",
    },
    {
      href: "/live",
      title: isOwner ? "Clocked In Hours" : "Clock In Hours",
      detail: isOwner
        ? liveNow === 1
          ? "1 person on right now"
          : `${liveNow} people on right now`
        : myOpen
          ? "You're clocked in — tap to clock out"
          : "Start and end your shift",
    },
  ];

  if (isOwner) {
    cards.push({
      href: "/team",
      title: "Team",
      detail: "Add creators and send setup links",
    });
  }

  return (
    <div className="flex flex-col items-center">
      <PeachMark className="mt-6 size-20" title="Peachy" />

      <div className="mt-9 w-full space-y-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center gap-3 rounded-3xl bg-surface px-6 py-7"
          >
            <span className="flex-1">
              <span className="block text-xl font-semibold tracking-tight">
                {card.title}
              </span>
              <span className="mt-1 block text-muted">{card.detail}</span>
            </span>
            <span aria-hidden className="text-2xl text-accent-strong">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
