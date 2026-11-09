import { Suspense } from "react";
import Link from "next/link";
import { CalendarDotsIcon, CameraIcon } from "@phosphor-icons/react/dist/ssr";
import { Notice, btnBoard, btnPrimary } from "@/components/ui";
import { requireShop } from "@/lib/identity";
import { listProducts, today, upcomingPosts } from "@/lib/shop";
import { formatWhen } from "@/lib/time";
import { PostList, PreviewToggle, SoldOutList } from "./today-view";

export default function TodayPage(props: PageProps<"/app">) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading today…</p>}>
      <Today searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Today({ searchParams }: { searchParams: PageProps<"/app">["searchParams"] }) {
  const { shop } = await requireShop();
  const { demo } = await searchParams;
  const [items, upcoming] = await Promise.all([listProducts(shop.id), upcomingPosts(shop.id, new Date())]);
  const date = today(shop);
  const hasChannel = shop.channels.some((c) => c.usable);
  const dayName = new Intl.DateTimeFormat("en-IN", { timeZone: shop.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="space-y-10">
      <header>
        <p className="mb-1 text-sm uppercase tracking-[0.18em] text-ink-soft">{dayName}</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight">{shop.name}</h1>
      </header>

      {demo && (
        <Notice tone="ok">
          Demo café loaded. Preview mode is on, so everything lands in Buffer as a draft. Try Snap first.
        </Notice>
      )}
      {!hasChannel && (
        <Notice tone="error">
          No channels connected in Buffer. Connect an Instagram professional account in Buffer, then refresh channels
          in settings.
        </Notice>
      )}

      <div className="grid gap-3">
        <Link href="/app/snap" className={btnPrimary}>
          <CameraIcon size={22} aria-hidden /> Snap today&rsquo;s special
        </Link>
        <Link href="/app/plan" className={btnBoard}>
          <CalendarDotsIcon size={22} aria-hidden /> Plan the week
        </Link>
      </div>

      <PreviewToggle on={shop.previewMode} />

      <section>
        <h2 className="mb-1 font-display text-2xl">Sold out?</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Tap an item and Chalk pulls any post about it that&rsquo;s still due today, from Chalk and from your Buffer
          queue.
        </p>
        <SoldOutList items={items.map((p) => ({ id: p.id, name: p.name, price: p.price, soldOut: p.soldOutOn === date }))} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-ink-soft">Nothing scheduled yet. Snap a special or plan the week.</p>
        ) : (
          <PostList
            posts={upcoming.map((p) => ({
              id: p.id,
              when: p.dueAt ? formatWhen(p.dueAt, shop.timezone) : "",
              headline: p.headline,
              status: p.status,
              imageUrl: p.imageUrl ?? "",
              error: p.error,
              reason: p.reason,
              canPull: ["scheduled", "draft", "approved"].includes(p.status) && !!p.dueAt && p.dueAt > new Date(),
            }))}
          />
        )}
      </section>
    </div>
  );
}
