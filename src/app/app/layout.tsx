import Link from "next/link";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "./bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <div className="sticky top-0 z-10 border-b border-line/60 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <Link href="/app" className="font-display text-2xl italic">
            Chalk
          </Link>
          <Link
            href="/app/setup"
            aria-label="Shop settings"
            className="flex size-11 items-center justify-center rounded-md text-ink-soft hover:text-ink"
          >
            <GearSixIcon size={24} aria-hidden />
          </Link>
        </div>
      </div>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
