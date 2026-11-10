"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { AiError, imageFromUrl } from "@/lib/ai/gemini";
import { readSpecial, writeCaption } from "@/lib/ai/prompts";
import { db, posts } from "@/lib/db";
import { currentShop } from "@/lib/identity";
import { cardPhotoUrl, isValidPublicId, previewImageUrl } from "@/lib/media/cloudinary";
import { makeCardImage, pushToBuffer } from "@/lib/publish";
import { listProducts, today, usableChannels } from "@/lib/shop";
import { zonedTime } from "@/lib/time";

export type SnapDraft = {
  postId: string;
  imageUrl: string;
  caption: string;
  headline: string;
  detail: string;
  price: string;
  until: string;
  altText: string;
  channelName: string;
  service: string;
};

export type DraftResult = { ok: true; draft: SnapDraft } | { ok: false; message: string };

const draftInput = z.object({
  publicId: z.string().refine((v) => v === "" || isValidPublicId(v)),
  note: z.string().trim().max(400),
  channelId: z.string().optional(),
});

/** Photo + note → reads the special, writes the caption, renders the branded card. */
export async function draftSpecial(input: z.input<typeof draftInput>): Promise<DraftResult> {
  const ctx = await currentShop();
  if (!ctx) return { ok: false, message: "Your session ended. Reconnect Buffer." };
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Something's off with that photo. Try again." };
  const { publicId, note } = parsed.data;
  if (!publicId && !note) return { ok: false, message: "Add a photo or a few words about the special." };

  const { shop } = ctx;
  const channels = usableChannels(shop);
  const channel =
    channels.find((c) => c.id === parsed.data.channelId) ??
    channels.find((c) => c.id === shop.defaultChannelId) ??
    channels[0];
  if (!channel) return { ok: false, message: "Connect a channel in Buffer first, then refresh it in settings." };

  const menu = await listProducts(shop.id);

  try {
    const image = publicId ? await imageFromUrl(previewImageUrl(publicId, 1024)) : undefined;
    const special = await readSpecial({
      image,
      note,
      products: menu.map((p) => `${p.name} ${p.price}`.trim()),
    });
    if (!special.headline.trim()) {
      return { ok: false, message: "Chalk couldn't tell what the special is. Add a short note like \"pumpkin loaf, $5.50\"." };
    }
    const product = menu.find((p) => p.name.toLowerCase() === special.matchedProduct.trim().toLowerCase());
    const price = special.price || product?.price || "";

    const photoId = publicId || product?.photoPublicId || "";
    const [caption, imageUrl] = await Promise.all([
      writeCaption({
        shop,
        service: channel.service,
        headline: special.headline,
        detail: special.detail,
        price,
        until: special.until,
        context: `Today's special, posted ${note ? `with the note "${note}"` : "from a photo"}.`,
      }),
      makeCardImage({
        shopName: shop.name,
        brandColor: shop.brandColor,
        headline: special.headline,
        detail: special.detail,
        price,
        until: special.until,
        photoUrl: photoId && isValidPublicId(photoId) ? cardPhotoUrl(photoId) : null,
      }),
    ]);

    const [row] = await db()
      .insert(posts)
      .values({
        shopId: shop.id,
        productId: product?.id ?? null,
        kind: "special",
        channelId: channel.id,
        service: channel.service,
        caption,
        headline: special.headline,
        detail: [special.detail, price, special.until].filter(Boolean).join(" · "),
        altText: special.altText || special.headline,
        imageUrl,
        status: "suggested",
      })
      .returning();

    return {
      ok: true,
      draft: {
        postId: row.id,
        imageUrl,
        caption,
        headline: special.headline,
        detail: special.detail,
        price,
        until: special.until,
        altText: row.altText,
        channelName: channel.name,
        service: channel.service,
      },
    };
  } catch (err) {
    if (err instanceof AiError) return { ok: false, message: err.message };
    console.error("draftSpecial failed", err);
    return { ok: false, message: "Couldn't make the post. Try again." };
  }
}

const sendInput = z.object({
  postId: z.uuid(),
  caption: z.string().trim().min(1, "The caption is empty.").max(2200, "Captions max out at 2,200 characters."),
  when: z.enum(["now", "at"]),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export type SendResult =
  | { ok: true; status: string; dueAt: string | null; preview: boolean }
  | { ok: false; message: string };

export async function sendSpecial(input: z.input<typeof sendInput>): Promise<SendResult> {
  const ctx = await currentShop();
  if (!ctx) return { ok: false, message: "Your session ended. Reconnect Buffer." };
  const parsed = sendInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { shop, identity } = ctx;
  const { postId, caption, when, time } = parsed.data;

  let dueAt: Date | null = null;
  if (when === "at") {
    if (!time) return { ok: false, message: "Pick a time." };
    dueAt = zonedTime(today(shop), time, shop.timezone);
    if (dueAt.getTime() < Date.now() + 2 * 60000) {
      return { ok: false, message: "That time has passed. Pick a later one or post now." };
    }
  }

  const [post] = await db()
    .update(posts)
    .set({ caption, dueAt })
    .where(and(eq(posts.id, postId), eq(posts.shopId, shop.id), eq(posts.status, "suggested")))
    .returning();
  if (!post) return { ok: false, message: "This post was already sent. Make a new one." };

  const res = await pushToBuffer(identity.session.accessToken, shop, post, when === "now" ? "shareNow" : "customScheduled");
  if (!res.ok) return { ok: false, message: res.message };
  return {
    ok: true,
    status: res.post.status,
    dueAt: res.post.dueAt?.toISOString() ?? null,
    preview: shop.previewMode,
  };
}
