import "server-only";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db, posts, products, shops, type CachedChannel, type Shop } from "@/lib/db";
import { getChannels } from "@/lib/buffer/queries";
import { addDays, localDate, zonedTime } from "@/lib/time";

export function parseHours(hours: string): { open: string; close: string } {
  const m = hours.match(/(\d{1,2}):?(\d{2})?\s*[-–to]+\s*(\d{1,2}):?(\d{2})?/);
  if (!m) return { open: "08:00", close: "20:00" };
  const pad = (h: string, mm?: string) => `${h.padStart(2, "0")}:${mm ?? "00"}`;
  return { open: pad(m[1], m[2]), close: pad(m[3], m[4]) };
}

export async function fetchChannels(accessToken: string, orgId: string): Promise<CachedChannel[]> {
  const list = await getChannels(accessToken, orgId);
  return list.map((c) => ({
    id: c.id,
    name: c.displayName ?? c.name,
    service: c.service,
    avatar: c.avatar,
    usable: !c.isDisconnected && !c.isLocked,
  }));
}

export function usableChannels(shop: Shop): CachedChannel[] {
  return shop.channels.filter((c) => c.usable);
}

export function listProducts(shopId: string) {
  return db().select().from(products).where(eq(products.shopId, shopId)).orderBy(asc(products.sort), asc(products.name));
}

export function today(shop: Shop): string {
  return localDate(new Date(), shop.timezone);
}

/** Start and end (exclusive) of a local day in the shop's timezone. */
export function dayBounds(shop: Shop, date: string): { start: Date; end: Date } {
  return { start: zonedTime(date, "00:00", shop.timezone), end: zonedTime(addDays(date, 1), "00:00", shop.timezone) };
}

export function upcomingPosts(shopId: string, from: Date, days = 8) {
  const to = new Date(from.getTime() + days * 86400000);
  return db()
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.shopId, shopId),
        inArray(posts.status, ["scheduled", "draft", "approved", "error", "sent", "pulled"]),
        gte(posts.dueAt, new Date(from.getTime() - 12 * 3600000)),
        lt(posts.dueAt, to),
      ),
    )
    .orderBy(asc(posts.dueAt));
}

export async function touchShop(id: string, values: Partial<Shop>) {
  await db()
    .update(shops)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(shops.id, id));
}
