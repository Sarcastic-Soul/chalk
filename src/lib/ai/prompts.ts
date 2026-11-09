import "server-only";
import { z } from "zod";
import { generateJson, type ImageInput } from "./gemini";

export const menuSchema = z.object({
  shopName: z.string().describe("Shop name if printed on the menu, else empty"),
  hours: z.string().describe("Opening hours if printed, else empty"),
  items: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().describe("Menu section, title case, e.g. Coffee"),
        price: z.string().describe("Price with currency symbol as printed, e.g. ₹160"),
        description: z.string().describe("Short description if printed, else empty"),
      }),
    )
    .max(60),
});
export type MenuExtract = z.infer<typeof menuSchema>;

export function extractMenu(image: ImageInput) {
  return generateJson({
    system:
      "You read photos of shop menus and return every item exactly as printed. Never invent items or prices. If the photo is not a menu, return an empty items list.",
    prompt: "List every item on this menu.",
    images: [image],
    schema: menuSchema,
    temperature: 0.1,
  });
}

export const specialSchema = z.object({
  headline: z.string().describe("The item or offer, 2-5 words, e.g. Pumpkin Loaf"),
  detail: z.string().describe("One short line, e.g. warm, with salted butter"),
  price: z.string().describe("Price with currency if shown, else empty"),
  until: z.string().describe("Time limit if shown, e.g. until 2pm, else empty"),
  matchedProduct: z.string().describe("Exact name from the product list that this is, or empty"),
  altText: z.string().describe("One sentence describing the photo for screen readers"),
});
export type SpecialExtract = z.infer<typeof specialSchema>;

export function readSpecial(opts: { image?: ImageInput; note: string; products: string[] }) {
  return generateJson({
    system:
      "You help a small shop turn today's special into a social post. Read the photo (often a chalkboard or the dish itself) and the owner's note. Only use facts shown or stated. Keep words short and plain.",
    prompt: [
      opts.note ? `Owner's note: ${opts.note}` : "No note from the owner.",
      opts.products.length ? `Products on the menu: ${opts.products.join("; ")}` : "",
      "Describe today's special.",
    ]
      .filter(Boolean)
      .join("\n"),
    images: opts.image ? [opts.image] : [],
    schema: specialSchema,
    temperature: 0.2,
  });
}

export const captionSchema = z.object({
  caption: z.string().describe("The full post text including hashtags"),
});

const SERVICE_RULES: Record<string, string> = {
  instagram:
    "Instagram: 2-4 short lines, one or two fitting emoji at most, then a blank line and 3-6 hashtags (shop name, city, food). Never name a street or neighbourhood that wasn't given. Under 600 characters. Links don't work in captions, so say 'drop by' not 'click'.",
  threads: "Threads: one or two casual sentences, no hashtags or at most one, under 300 characters.",
  twitter: "X: one punchy sentence, at most one hashtag, under 260 characters.",
  facebook: "Facebook: two or three friendly sentences, no hashtag blocks.",
  linkedin: "LinkedIn: two plain sentences, no hashtags blocks, no emoji.",
};

export type ShopVoice = { name: string; city: string; voice: string; hours: string };

export async function writeCaption(opts: {
  shop: ShopVoice;
  service: string;
  headline: string;
  detail: string;
  price: string;
  until: string;
  context: string;
}) {
  const rules = SERVICE_RULES[opts.service] ?? "Plain text, two short sentences, no hashtags.";
  const out = await generateJson({
    system: `You write social posts for ${opts.shop.name}, a small shop in ${opts.shop.city}. Voice: ${opts.shop.voice}. Never invent prices, discounts or claims that weren't given. Sound like the owner, not an ad agency. Avoid words like "indulge", "elevate", "delightful", "treat yourself".`,
    prompt: [
      `Write one post for ${opts.service}.`,
      rules,
      `Item: ${opts.headline}`,
      opts.detail && `Detail: ${opts.detail}`,
      opts.price && `Price: ${opts.price}`,
      opts.until && `Limit: ${opts.until}`,
      opts.context && `Context: ${opts.context}`,
      opts.shop.hours && `Opening hours: ${opts.shop.hours}`,
    ]
      .filter(Boolean)
      .join("\n"),
    schema: captionSchema,
    temperature: 0.8,
  });
  return out.caption.trim();
}

export const planSchema = z.object({
  posts: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD, one of the open days given"),
        time: z.string().describe("HH:MM 24h local time within opening hours"),
        product: z.string().describe("Exact product name from the list"),
        headline: z.string().describe("2-5 words for the image card"),
        detail: z.string().describe("One short line for the image card"),
        reason: z.string().describe("Why this day, in under 12 words, e.g. Rainy Thursday, 21°C"),
        caption: z.string().describe("Full post text following the channel rules"),
      }),
    )
    .max(7),
});
export type PlanExtract = z.infer<typeof planSchema>;

export function planWeek(opts: {
  shop: ShopVoice;
  service: string;
  days: { date: string; weekday: string; weather: string; holiday: string }[];
  products: { name: string; category: string; price: string }[];
  count: number;
}) {
  const rules = SERVICE_RULES[opts.service] ?? "Plain text, two short sentences.";
  return generateJson({
    system: `You plan a week of social posts for ${opts.shop.name}, a small shop in ${opts.shop.city}. Voice: ${opts.shop.voice}. Match products to the day: hot drinks and bakes on cold or rainy days, iced drinks on hot days, treats on holidays and weekends. Use each product at most once. Never invent prices or offers. Avoid words like "indulge", "elevate", "delightful".`,
    prompt: [
      `Plan ${opts.count} posts, at most one per day, for ${opts.service}.`,
      `Caption rules: ${rules}`,
      `Opening hours: ${opts.shop.hours || "08:00-20:00"}. Post 1-2 hours before the busy time for that item (coffee in the morning, bakes mid-morning or afternoon).`,
      "Open days:",
      ...opts.days.map((d) => `- ${d.date} ${d.weekday}: ${d.weather}${d.holiday ? `; holiday: ${d.holiday}` : ""}`),
      "Products:",
      ...opts.products.map((p) => `- ${p.name} (${p.category}) ${p.price}`),
    ].join("\n"),
    schema: planSchema,
    temperature: 0.7,
  });
}
