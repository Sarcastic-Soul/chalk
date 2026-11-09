"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDotsIcon, CameraIcon, GearSixIcon, HouseIcon, ListBulletsIcon } from "@phosphor-icons/react";

const ITEMS = [
  { href: "/app", label: "Today", Icon: HouseIcon },
  { href: "/app/snap", label: "Snap", Icon: CameraIcon },
  { href: "/app/plan", label: "Week", Icon: CalendarDotsIcon },
  { href: "/app/menu", label: "Menu", Icon: ListBulletsIcon },
];

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

/** Phone: fixed bottom bar. */
export function BottomNav() {
  const path = usePathname();
  if (path.startsWith("/app/setup")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
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

/** Laptop: sticky left sidebar. */
export function SideNav({ shopName }: { shopName?: string }) {
  const path = usePathname();
  const link = (href: string, label: string, Icon: typeof HouseIcon) => {
    const active = isActive(path, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 items-center gap-3 rounded-md px-3 font-semibold transition-colors ${active ? "bg-ink text-chalk" : "text-ink-soft hover:bg-paper-deep hover:text-ink"}`}
      >
        <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
      <Link href="/app" className="px-3 font-display text-3xl italic">
        Chalk
      </Link>
      {shopName && <p className="mt-1 truncate px-3 text-sm text-ink-soft">{shopName}</p>}
      <nav aria-label="Main" className="mt-10">
        <ul className="space-y-1">
          {ITEMS.map(({ href, label, Icon }) => (
            <li key={href}>{link(href, label, Icon)}</li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">{link("/app/setup", "Settings", GearSixIcon)}</div>
    </aside>
  );
}
