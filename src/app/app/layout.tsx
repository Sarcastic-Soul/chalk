import { Suspense } from "react";
import Link from "next/link";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr";
import { getIdentity, getShop } from "@/lib/identity";
import { BottomNav, SideNav } from "./bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex flex-1 lg:min-h-dvh">
      <Suspense fallback={<SideNav />}>
        <ShopSideNav />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 border-b border-line/60 bg-paper/95 backdrop-blur lg:hidden">
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
        <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6 lg:max-w-6xl lg:px-12 lg:pb-16 lg:pt-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

async function ShopSideNav() {
  const identity = await getIdentity();
  const shop = identity ? await getShop(identity.accountId) : null;
  return <SideNav shopName={shop?.name} />;
}
