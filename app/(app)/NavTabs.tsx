"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/schedule", label: "Schedule" },
  { href: "/live", label: "Who's On" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-3xl grid-cols-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`py-3 text-center text-sm font-medium ${
                active ? "text-accent" : "text-muted"
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
