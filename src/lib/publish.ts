import "server-only";
import { eq } from "drizzle-orm";
import { BufferApiError } from "@/lib/buffer/client";
import { createPost, explainError, type ShareMode } from "@/lib/buffer/posts";
import { db, posts, type Post, type Shop } from "@/lib/db";
import { renderCard, type CardProps } from "@/lib/media/card";
import { uploadCard } from "@/lib/media/cloudinary";

/** Renders the branded card and returns a public JPEG URL for Buffer. */
export async function makeCardImage(card: CardProps): Promise<string> {
  const res = await renderCard(card);
  const png = Buffer.from(await res.arrayBuffer());
  return uploadCard(png);
}

export function bufferErrorMessage(err: unknown): string {
  if (err instanceof BufferApiError) {
    if (err.isRateLimited) {
      return `Buffer is busy right now${err.retryAfter ? `. Try again in ${Math.ceil(err.retryAfter / 60)} min` : ". Try again shortly"}.`;
    }
    if (err.isUnauthorized) return "Your Buffer connection expired. Reconnect and try again.";
    return `Buffer said: ${err.message}`;
  }
  console.error(err);
  return "Something went wrong talking to Buffer. Please try again.";
}

/**
 * Sends a saved post to Buffer and records the outcome on the row.
 * In preview mode it lands as a Buffer draft, so nothing is published.
 */
export async function pushToBuffer(
  accessToken: string,
  shop: Shop,
  post: Post,
  mode: ShareMode,
): Promise<{ ok: true; post: Post } | { ok: false; message: string; post: Post }> {
  if (!post.imageUrl) return { ok: false, message: "This post has no image yet.", post };

  try {
    const result = await createPost(accessToken, {
      channelId: post.channelId,
      service: post.service,
      text: post.caption,
      imageUrl: post.imageUrl,
      altText: post.altText || post.headline,
      mode,
      dueAt: mode === "customScheduled" && post.dueAt ? post.dueAt.toISOString() : undefined,
      preview: shop.previewMode,
    });

    if (!result.ok) {
      const message = explainError(result.kind, result.message);
      // A full queue isn't a failure of the idea: keep it approved to push later.
      const status = result.kind === "LimitReachedError" ? "approved" : "error";
      const [row] = await db().update(posts).set({ status, error: message }).where(eq(posts.id, post.id)).returning();
      return { ok: false, message, post: row };
    }

    const status = shop.previewMode ? "draft" : mode === "shareNow" ? "sent" : "scheduled";
    const [row] = await db()
      .update(posts)
      .set({
        status,
        bufferPostId: result.value.id,
        error: null,
        dueAt: result.value.dueAt ? new Date(result.value.dueAt) : post.dueAt ?? new Date(),
      })
      .where(eq(posts.id, post.id))
      .returning();
    return { ok: true, post: row };
  } catch (err) {
    const message = bufferErrorMessage(err);
    const [row] = await db().update(posts).set({ error: message }).where(eq(posts.id, post.id)).returning();
    return { ok: false, message, post: row };
  }
}
