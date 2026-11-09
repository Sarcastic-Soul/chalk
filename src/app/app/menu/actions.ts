"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { extractMenu } from "@/lib/ai/prompts";
import { AiError, imageFromUrl } from "@/lib/ai/gemini";
import { db, products } from "@/lib/db";
import { currentShop } from "@/lib/identity";
import { isValidPublicId, previewImageUrl } from "@/lib/media/cloudinary";

export type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; added: number; skipped: number };

export async function importMenu(publicId: string): Promise<ImportState> {
  const ctx = await currentShop();
  if (!ctx) return { status: "error", message: "Your session ended. Reconnect Buffer." };
  if (!isValidPublicId(publicId)) return { status: "error", message: "Upload a menu photo first." };

  let extract;
  try {
    extract = await extractMenu(await imageFromUrl(previewImageUrl(publicId, 1600)));
  } catch (err) {
    return { status: "error", message: err instanceof AiError ? err.message : "Couldn't read the menu. Try again." };
  }
  if (extract.items.length === 0) {
    return { status: "error", message: "That doesn't look like a menu. Try a straighter, brighter photo." };
  }

  const existing = await db().select({ name: products.name }).from(products).where(eq(products.shopId, ctx.shop.id));
  const seen = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const fresh = extract.items.filter((i) => {
    const key = i.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (fresh.length) {
    await db()
      .insert(products)
      .values(
        fresh.map((i, n) => ({
          shopId: ctx.shop.id,
          name: i.name.trim().slice(0, 80),
          category: i.category.trim().slice(0, 40),
          price: i.price.trim().slice(0, 20),
          description: i.description.trim().slice(0, 200),
          sort: existing.length + n,
        })),
      );
  }
  refresh();
  return { status: "done", added: fresh.length, skipped: extract.items.length - fresh.length };
}

const productSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give it a name.").max(80),
  category: z.string().trim().max(40),
  price: z.string().trim().max(20),
  description: z.string().trim().max(200),
  photoPublicId: z.string().refine((v) => v === "" || isValidPublicId(v)),
});

export async function saveProduct(input: z.input<typeof productSchema>): Promise<{ error?: string }> {
  const ctx = await currentShop();
  if (!ctx) return { error: "Your session ended. Reconnect Buffer." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, photoPublicId, ...rest } = parsed.data;
  const values = { ...rest, photoPublicId: photoPublicId || null };

  if (id) {
    await db()
      .update(products)
      .set(values)
      .where(and(eq(products.id, id), eq(products.shopId, ctx.shop.id)));
  } else {
    await db().insert(products).values({ ...values, shopId: ctx.shop.id, sort: 999 });
  }
  refresh();
  return {};
}

export async function deleteProduct(id: string): Promise<void> {
  const ctx = await currentShop();
  if (!ctx || !z.uuid().safeParse(id).success) return;
  await db().delete(products).where(and(eq(products.id, id), eq(products.shopId, ctx.shop.id)));
  refresh();
}
