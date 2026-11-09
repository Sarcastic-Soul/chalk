import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
} from "drizzle-orm/pg-core";

export type CachedChannel = {
  id: string;
  name: string;
  service: string;
  avatar: string;
  usable: boolean;
};

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  bufferAccountId: text("buffer_account_id").notNull().unique(),
  bufferOrgId: text("buffer_org_id").notNull(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timezone: text("timezone").notNull(),
  countryCode: text("country_code").notNull(),
  hours: text("hours").notNull().default(""),
  /** 0 = Sunday … 6 = Saturday */
  closedDays: integer("closed_days").array().notNull().default([]),
  voice: text("voice").notNull(),
  brandColor: text("brand_color").notNull().default("#c2512f"),
  currency: text("currency").notNull().default("₹"),
  channels: jsonb("channels").$type<CachedChannel[]>().notNull().default([]),
  defaultChannelId: text("default_channel_id"),
  previewMode: boolean("preview_mode").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    price: text("price").notNull().default(""),
    description: text("description").notNull().default(""),
    photoPublicId: text("photo_public_id"),
    /** Local date (shop timezone) the item sold out on. */
    soldOutOn: date("sold_out_on"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_shop_idx").on(t.shopId)],
);

export const postStatuses = [
  "suggested", // weekly plan idea, not yet approved
  "skipped", // swiped away
  "approved", // approved, not yet in Buffer (e.g. queue full)
  "scheduled", // in Buffer, waiting to publish
  "draft", // saved as a Buffer draft (preview mode)
  "sent", // published now
  "pulled", // removed from Buffer (sold out or by hand)
  "error",
] as const;
export type PostStatus = (typeof postStatuses)[number];

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    kind: text("kind").$type<"special" | "plan">().notNull(),
    channelId: text("channel_id").notNull(),
    service: text("service").notNull(),
    caption: text("caption").notNull(),
    headline: text("headline").notNull().default(""),
    detail: text("detail").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    imageUrl: text("image_url"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    reason: text("reason").notNull().default(""),
    status: text("status").$type<PostStatus>().notNull(),
    bufferPostId: text("buffer_post_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_shop_idx").on(t.shopId, t.dueAt)],
);

export type Shop = typeof shops.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Post = typeof posts.$inferSelect;
