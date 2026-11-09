"use server";

import { refresh } from "next/cache";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { deletePost, mentions, scheduledPosts } from "@/lib/buffer/posts";
import { db, posts, products } from "@/lib/db";
import { currentShop } from "@/lib/identity";
import { bufferErrorMessage } from "@/lib/publish";
import { dayBounds, fetchChannels, today, touchShop } from "@/lib/shop";

export type SoldOutResult =
  | { ok: true; pulled: string[]; failed: string[] }
  | { ok: false; message: string };

/**
 * Marks a product sold out for today and pulls every post about it still
 * waiting to go out today: ours by product id, plus any post in the Buffer
 * queue whose text names the product (e.g. scheduled by hand in Buffer).
 */
export async function markSoldOut(productId: string): Promise<SoldOutResult> {
  const ctx = await currentShop();
  if (!ctx) return { ok: false, message: "Your session ended. Reconnect Buffer." };
  if (!z.uuid().safeParse(productId).success) return { ok: false, message: "Unknown item." };
  const { shop, identity } = ctx;
  const token = identity.session.accessToken;

  const [product] = await db()
    .update(products)
    .set({ soldOutOn: today(shop) })
    .where(and(eq(products.id, productId), eq(products.shopId, shop.id)))
    .returning();
  if (!product) return { ok: false, message: "Unknown item." };

  const now = new Date();
  const { end } = dayBounds(shop, today(shop));

  const ours = await db()
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.shopId, shop.id),
        eq(posts.productId, product.id),
        inArray(posts.status, ["scheduled", "draft", "approved"]),
        gte(posts.dueAt, now),
        lt(posts.dueAt, end),
      ),
    );

  const targets = new Map<string, { rowId?: string; label: string }>();
  for (const p of ours) {
    if (p.bufferPostId) targets.set(p.bufferPostId, { rowId: p.id, label: p.headline || product.name });
  }

  let queueError = "";
  try {
    const channelIds = shop.channels.filter((c) => c.usable).map((c) => c.id);
    if (channelIds.length) {
      const queued = await scheduledPosts(token, shop.bufferOrgId, channelIds, now, end);
      for (const q of queued) {
        if (!targets.has(q.id) && mentions(q.text, product.name)) {
          targets.set(q.id, { label: q.text.split("\n")[0].slice(0, 60) });
        }
      }
    }
  } catch (err) {
    queueError = bufferErrorMessage(err);
  }

  const pulled: string[] = [];
  const failed: string[] = queueError ? [`Couldn't check the Buffer queue: ${queueError}`] : [];
  for (const [bufferId, t] of targets) {
    try {
      const res = await deletePost(token, bufferId);
      if (res.ok) {
        pulled.push(t.label);
        if (t.rowId) await db().update(posts).set({ status: "pulled", reason: "Sold out" }).where(eq(posts.id, t.rowId));
      } else failed.push(`${t.label}: ${res.message}`);
    } catch (err) {
      failed.push(`${t.label}: ${bufferErrorMessage(err)}`);
    }
  }

  // Approved-but-not-in-Buffer posts for today just get cancelled locally.
  const localOnly = ours.filter((p) => !p.bufferPostId).map((p) => p.id);
  if (localOnly.length) {
    await db().update(posts).set({ status: "pulled", reason: "Sold out" }).where(inArray(posts.id, localOnly));
    pulled.push(...ours.filter((p) => !p.bufferPostId).map((p) => p.headline || product.name));
  }

  refresh();
  return { ok: true, pulled, failed };
}

export async function clearSoldOut(productId: string): Promise<void> {
  const ctx = await currentShop();
  if (!ctx || !z.uuid().safeParse(productId).success) return;
  await db()
    .update(products)
    .set({ soldOutOn: null })
    .where(and(eq(products.id, productId), eq(products.shopId, ctx.shop.id)));
  refresh();
}

export async function setPreviewMode(on: boolean): Promise<void> {
  const ctx = await currentShop();
  if (!ctx) return;
  await touchShop(ctx.shop.id, { previewMode: on });
  refresh();
}

export async function refreshChannels(): Promise<{ error?: string }> {
  const ctx = await currentShop();
  if (!ctx) return { error: "Your session ended. Reconnect Buffer." };
  try {
    const channels = await fetchChannels(ctx.identity.session.accessToken, ctx.shop.bufferOrgId);
    const usable = channels.filter((c) => c.usable);
    const defaultChannelId = usable.some((c) => c.id === ctx.shop.defaultChannelId)
      ? ctx.shop.defaultChannelId
      : (usable.find((c) => c.service === "instagram")?.id ?? usable[0]?.id ?? null);
    await touchShop(ctx.shop.id, { channels, defaultChannelId });
  } catch (err) {
    return { error: bufferErrorMessage(err) };
  }
  refresh();
  return {};
}

/** Removes one of our posts from Buffer by hand. */
export async function pullPost(postId: string): Promise<{ error?: string }> {
  const ctx = await currentShop();
  if (!ctx || !z.uuid().safeParse(postId).success) return { error: "Unknown post." };
  const [post] = await db()
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.shopId, ctx.shop.id)));
  if (!post) return { error: "Unknown post." };
  if (post.bufferPostId) {
    try {
      const res = await deletePost(ctx.identity.session.accessToken, post.bufferPostId);
      if (!res.ok) return { error: res.message };
    } catch (err) {
      return { error: bufferErrorMessage(err) };
    }
  }
  await db().update(posts).set({ status: "pulled", reason: "Removed by you" }).where(eq(posts.id, post.id));
  refresh();
  return {};
}
