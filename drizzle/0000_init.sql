CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"product_id" uuid,
	"kind" text NOT NULL,
	"channel_id" text NOT NULL,
	"service" text NOT NULL,
	"caption" text NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"image_url" text,
	"due_at" timestamp with time zone,
	"reason" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"buffer_post_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photo_public_id" text,
	"sold_out_on" date,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buffer_account_id" text NOT NULL,
	"buffer_org_id" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"timezone" text NOT NULL,
	"country_code" text NOT NULL,
	"hours" text DEFAULT '' NOT NULL,
	"closed_days" integer[] DEFAULT '{}' NOT NULL,
	"voice" text NOT NULL,
	"brand_color" text DEFAULT '#c2512f' NOT NULL,
	"currency" text DEFAULT '₹' NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_channel_id" text,
	"preview_mode" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_buffer_account_id_unique" UNIQUE("buffer_account_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_shop_idx" ON "posts" USING btree ("shop_id","due_at");--> statement-breakpoint
CREATE INDEX "products_shop_idx" ON "products" USING btree ("shop_id");