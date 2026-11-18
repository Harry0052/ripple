"use client";

import { Compass, ListChecks, PenLine, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

const ICONS = {
  Explore: Compass,
  "My Runs": ListChecks,
  Create: PenLine,
  Profile: UserRound,
} as const;

export function PrimaryNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "desktop") {
    return (
      <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => {
          const current = item.available && pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={current ? "page" : undefined}
              aria-disabled={item.available ? undefined : true}
              title={item.reason}
              className={
                current
                  ? "rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper"
                  : item.available
                    ? "rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                    : "rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-ink/5"
              }
            >
              {item.label}
              {item.available ? null : <span className="sr-only">, unavailable</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.label];
          const current = item.available && pathname === item.href;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                aria-disabled={item.available ? undefined : true}
                className={
                  current
                    ? "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-ink"
                    : "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted"
                }
              >
                <Icon aria-hidden size={20} strokeWidth={current ? 2.4 : 1.8} />
                {item.label}
                {item.available ? null : <span className="sr-only">unavailable</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
