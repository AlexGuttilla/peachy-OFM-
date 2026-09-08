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

  return (
    <div className="flex flex-col items-center">
      <PeachMark className="mt-4 size-16" title="Peachy" />

      <div className="mt-8 w-full space-y-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-6"
          >
            <span className="flex-1">
              <span className="block text-lg font-semibold tracking-tight">
                {card.title}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{card.detail}</span>
            </span>
            <span aria-hidden className="text-xl text-accent-strong">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
