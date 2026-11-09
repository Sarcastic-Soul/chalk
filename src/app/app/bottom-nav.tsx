"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDotsIcon, CameraIcon, HouseIcon, ListBulletsIcon } from "@phosphor-icons/react";

const ITEMS = [
  { href: "/app", label: "Today", Icon: HouseIcon },
  { href: "/app/snap", label: "Snap", Icon: CameraIcon },
  { href: "/app/plan", label: "Week", Icon: CalendarDotsIcon },
  { href: "/app/menu", label: "Menu", Icon: ListBulletsIcon },
];

export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/app/setup")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/app" ? path === "/app" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-accent" : "text-ink-soft hover:text-ink"}`}
              >
                <Icon size={24} weight={active ? "fill" : "regular"} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
