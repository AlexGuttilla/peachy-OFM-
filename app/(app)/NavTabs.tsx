"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ALL_TABS = [
  { href: "/home", label: "Home", ownerOnly: false },
  { href: "/schedule", label: "Schedule", ownerOnly: false },
  { href: "/live", label: "Clocked In", ownerOnly: false },
  { href: "/tokens", label: "Tokens", ownerOnly: false },
  { href: "/team", label: "Team", ownerOnly: true },
];

export default function NavTabs({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const tabs = ALL_TABS.filter((tab) => isOwner || !tab.ownerOnly);

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface">
      <div
        className="mx-auto grid max-w-3xl"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`py-3.5 text-center text-sm font-medium ${
                active ? "text-accent-strong" : "text-muted"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
