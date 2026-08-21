CREATE TABLE "kite_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kite_order_id" text NOT NULL,
	"segment" text NOT NULL,
	"tradingsymbol" text NOT NULL,
	"exchange" text,
	"transaction_type" text NOT NULL,
	"quantity" numeric(18, 4),
	"price" numeric(14, 4),
	"average_price" numeric(14, 4),
	"status" text,
	"order_timestamp" timestamp with time zone,
	"fund" text,
	"folio" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kite_orders_user_order_unique" UNIQUE("user_id","kite_order_id"),
	CONSTRAINT "kite_orders_segment_check" CHECK ("kite_orders"."segment" in ('equity','mf'))
);
--> statement-breakpoint
ALTER TABLE "holdings" ADD COLUMN "kite_instrument_token" text;--> statement-breakpoint
ALTER TABLE "sips" ADD COLUMN "average_price" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "sips" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "sips" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kite_orders" ADD CONSTRAINT "kite_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kite_orders_user_idx" ON "kite_orders" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "sips" ADD CONSTRAINT "sips_source_check" CHECK ("sips"."source" in ('manual','kite'));