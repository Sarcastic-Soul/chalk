"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, products, shops } from "@/lib/db";
import { DEMO_PRODUCTS, DEMO_SHOP } from "@/lib/demo";
import { getIdentity, getShop } from "@/lib/identity";
import { fetchChannels } from "@/lib/shop";
import { geocode } from "@/lib/signals";
import { bufferErrorMessage } from "@/lib/publish";

export type SetupState = { status: "idle" } | { status: "error"; message: string };

const schema = z.object({
  name: z.string().trim().min(2, "Add your shop's name.").max(80),
  city: z.string().trim().min(2, "Add your city so we can check the weather.").max(80),
  hours: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Opening hours look like 08:00-20:00."),
  closedDays: z.array(z.coerce.number().int().min(0).max(6)).max(6),
  voice: z.string().trim().min(3, "Describe how your shop sounds.").max(300),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a brand color."),
  currency: z.string().trim().min(1).max(4),
  defaultChannelId: z.string().optional(),
});

async function saveShop(input: z.infer<typeof schema>, withDemoMenu: boolean): Promise<SetupState> {
  const identity = await getIdentity();
  if (!identity) return { status: "error", message: "Your session ended. Reconnect Buffer." };

  const place = await geocode(input.city);
  if (!place) return { status: "error", message: `We couldn't find "${input.city}". Try the nearest big city.` };

  let channels;
  try {
    channels = await fetchChannels(identity.session.accessToken, identity.orgId);
  } catch (err) {
    return { status: "error", message: bufferErrorMessage(err) };
  }
  const usable = channels.filter((c) => c.usable);
  const defaultChannelId =
    usable.find((c) => c.id === input.defaultChannelId)?.id ??
    usable.find((c) => c.service === "instagram")?.id ??
    usable[0]?.id ??
    null;

  const values = {
    bufferAccountId: identity.accountId,
    bufferOrgId: identity.orgId,
    name: input.name,
    city: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    countryCode: place.countryCode,
    hours: input.hours,
    closedDays: input.closedDays,
    voice: input.voice,
    brandColor: input.brandColor,
    currency: input.currency,
    channels,
    defaultChannelId,
    updatedAt: new Date(),
  };

  const [shop] = await db()
    .insert(shops)
    .values(values)
    .onConflictDoUpdate({ target: shops.bufferAccountId, set: values })
    .returning();

  if (withDemoMenu) {
    await db().delete(products).where(eq(products.shopId, shop.id));
    await db()
      .insert(products)
      .values(
        DEMO_PRODUCTS.map((p, i) => ({
          shopId: shop.id,
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          photoPublicId: p.photo ?? null,
          sort: i,
        })),
      );
  }
  return { status: "idle" };
}

export async function submitSetup(_prev: SetupState, form: FormData): Promise<SetupState> {
  const parsed = schema.safeParse({
    name: form.get("name"),
    city: form.get("city"),
    hours: `${form.get("open")}-${form.get("close")}`,
    closedDays: form.getAll("closedDays"),
    voice: form.get("voice"),
    brandColor: form.get("brandColor"),
    currency: form.get("currency") || "₹",
    defaultChannelId: form.get("defaultChannelId") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const identity = await getIdentity();
  const isNew = identity ? !(await getShop(identity.accountId)) : true;
  const result = await saveShop(parsed.data, false);
  if (result.status === "error") return result;
  redirect(isNew ? "/app/menu?welcome=1" : "/app");
}

export async function useDemoShop(): Promise<SetupState> {
  const result = await saveShop({ ...DEMO_SHOP, defaultChannelId: undefined }, true);
  if (result.status === "error") return result;
  redirect("/app?demo=1");
}
