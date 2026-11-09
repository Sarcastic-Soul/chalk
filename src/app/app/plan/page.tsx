import { Suspense } from "react";
import { and, asc, eq, gte } from "drizzle-orm";
import { PlanPageSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/ui";
import { db, posts } from "@/lib/db";
import { requireShop } from "@/lib/identity";
import { formatWhen } from "@/lib/time";
import { SwipeDeck } from "./swipe-deck";

export default function PlanPage() {
  return (
    <Suspense fallback={<PlanPageSkeleton />}>
      <Plan />
    </Suspense>
  );
}

async function Plan() {
  const { shop } = await requireShop();
  const ideas = await openIdeas(shop.id);

  return (
    <>
      <PageHeader eyebrow="Next 7 days" title="Your week">
        Ideas picked from your menu, the weather in {shop.city} and upcoming holidays.
      </PageHeader>
      <SwipeDeck
        previewMode={shop.previewMode}
        ideas={ideas.map((p) => ({
          id: p.id,
          when: p.dueAt ? formatWhen(p.dueAt, shop.timezone) : "",
          reason: p.reason,
          caption: p.caption,
          imageUrl: p.imageUrl ?? "",
          altText: p.altText,
        }))}
      />
    </>
  );
}

function openIdeas(shopId: string) {
  return db()
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.shopId, shopId),
        eq(posts.kind, "plan"),
        eq(posts.status, "suggested"),
        gte(posts.dueAt, new Date(Date.now() + 5 * 60000)),
      ),
    )
    .orderBy(asc(posts.dueAt));
}
