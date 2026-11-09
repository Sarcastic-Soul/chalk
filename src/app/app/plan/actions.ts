"use server";

import { refresh } from "next/cache";
import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { AiError } from "@/lib/ai/gemini";
import { planWeek } from "@/lib/ai/prompts";
import { db, posts } from "@/lib/db";
import { currentShop } from "@/lib/identity";
import { cardPhotoUrl, isValidPublicId } from "@/lib/media/cloudinary";
import { makeCardImage, pushToBuffer } from "@/lib/publish";
import { listProducts, parseHours, today, usableChannels } from "@/lib/shop";
import { forecast, holidays } from "@/lib/signals";
import { addDays, clampTime, WEEKDAYS, weekday, zonedTime } from "@/lib/time";

export type PlanResult = { ok: true; count: number } | { ok: false; message: string };

/** Asks Gemini for a week of posts from the menu, weather and holidays, and renders a card for each. */
export async function generatePlan(): Promise<PlanResult> {
  const ctx = await currentShop();
  if (!ctx) return { ok: false, message: "Your session ended. Reconnect Buffer." };
  const { shop } = ctx;
  const channel = usableChannels(shop).find((c) => c.id === shop.defaultChannelId) ?? usableChannels(shop)[0];
  if (!channel) return { ok: false, message: "Connect a channel in Buffer first." };

  const menu = (await listProducts(shop.id)).filter((p) => p.name);
  if (menu.length < 2) return { ok: false, message: "Add a few menu items first, so Chalk has something to plan." };

  const start = addDays(today(shop), 1);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [weather, hols] = await Promise.all([
    forecast(shop.latitude, shop.longitude, shop.timezone),
    Promise.all([...new Set(dates.map((d) => Number(d.slice(0, 4))))].map((y) => holidays(shop.countryCode, y))).then((l) => l.flat()),
  ]);

  const days = dates
    .filter((d) => !shop.closedDays.includes(weekday(d)))
    .map((d) => {
      const w = weather.find((x) => x.date === d);
      return {
        date: d,
        weekday: WEEKDAYS[weekday(d)],
        weather: w ? `${w.summary}, ${w.minC}-${w.maxC}°C, ${w.rainChance}% rain` : "no forecast",
        holiday: hols.filter((h) => h.date === d).map((h) => h.name).join(", "),
      };
    });
  if (days.length === 0) return { ok: false, message: "Your shop is closed all week, so there's nothing to plan." };

  let plan;
  try {
    plan = await planWeek({
      shop,
      service: channel.service,
      days,
      products: menu.map((p) => ({ name: p.name, category: p.category, price: p.price })),
      count: Math.min(days.length, 6),
    });
  } catch (err) {
    return { ok: false, message: err instanceof AiError ? err.message : "Couldn't plan the week. Try again." };
  }

  const { open, close } = parseHours(shop.hours);
  const validDates = new Set(days.map((d) => d.date));
  const used = new Set<string>();
  const ideas = plan.posts.flatMap((p) => {
    const product = menu.find((m) => m.name.toLowerCase() === p.product.trim().toLowerCase());
    if (!product || !validDates.has(p.date) || used.has(p.date)) return [];
    used.add(p.date);
    const time = /^\d{1,2}:\d{2}$/.test(p.time) ? clampTime(p.time.padStart(5, "0"), open, close) : "10:00";
    return [{ p, product, dueAt: zonedTime(p.date, time, shop.timezone) }];
  });
  if (ideas.length === 0) return { ok: false, message: "The plan came back empty. Try again." };

  let rendered;
  try {
    rendered = await Promise.all(
      ideas.map(({ p, product }) =>
        makeCardImage({
          shopName: shop.name,
          brandColor: shop.brandColor,
          headline: p.headline || product.name,
          detail: p.detail,
          price: product.price,
          until: "",
          photoUrl: product.photoPublicId && isValidPublicId(product.photoPublicId) ? cardPhotoUrl(product.photoPublicId) : null,
        }),
      ),
    );
  } catch (err) {
    console.error("plan cards failed", err);
    return { ok: false, message: "Couldn't make the images. Try again." };
  }

  // Replace any earlier ideas that weren't acted on.
  await db()
    .delete(posts)
    .where(and(eq(posts.shopId, shop.id), eq(posts.kind, "plan"), inArray(posts.status, ["suggested", "skipped"])));
  await db()
    .insert(posts)
    .values(
      ideas.map(({ p, product, dueAt }, i) => ({
        shopId: shop.id,
        productId: product.id,
        kind: "plan" as const,
        channelId: channel.id,
        service: channel.service,
        caption: p.caption.trim(),
        headline: p.headline || product.name,
        detail: p.detail,
        altText: `${p.headline || product.name}${p.detail ? `, ${p.detail}` : ""}`,
        imageUrl: rendered[i],
        dueAt,
        reason: p.reason,
        status: "suggested" as const,
      })),
    );
  refresh();
  return { ok: true, count: ideas.length };
}

const decideInput = z.object({
  postId: z.uuid(),
  decision: z.enum(["approve", "skip"]),
  caption: z.string().trim().min(1).max(2200).optional(),
});

export type DecideResult = { ok: true; status: string; note?: string } | { ok: false; message: string };

/** Swipe right schedules the idea in Buffer at its planned time; swipe left skips it. */
export async function decide(input: z.input<typeof decideInput>): Promise<DecideResult> {
  const ctx = await currentShop();
  if (!ctx) return { ok: false, message: "Your session ended. Reconnect Buffer." };
  const parsed = decideInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Something went wrong. Refresh and try again." };
  const { shop, identity } = ctx;
  const { postId, decision, caption } = parsed.data;

  const where = and(eq(posts.id, postId), eq(posts.shopId, shop.id), eq(posts.status, "suggested"));
  if (decision === "skip") {
    await db().update(posts).set({ status: "skipped" }).where(where);
    return { ok: true, status: "skipped" };
  }

  const [post] = await db()
    .update(posts)
    .set(caption ? { caption, error: null } : { error: null })
    .where(and(where, gte(posts.dueAt, new Date(Date.now() + 5 * 60000))))
    .returning();
  if (!post) return { ok: false, message: "This idea is out of date. Plan the week again." };

  const res = await pushToBuffer(identity.session.accessToken, shop, post, "customScheduled");
  if (!res.ok) {
    if (res.post.status === "approved") return { ok: true, status: "approved", note: res.message };
    return { ok: false, message: res.message };
  }
  return { ok: true, status: res.post.status };
}
