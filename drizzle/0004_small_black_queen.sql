CREATE TYPE "public"."recurring_frequency" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"frequency" "recurring_frequency" DEFAULT 'monthly' NOT NULL,
	"day_of_month" integer,
	"next_due_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_generated_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_transactions_amount_check" CHECK ("recurring_transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "transaction_edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"previous_values" jsonb NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "attachment_path" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_source_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_edit_history" ADD CONSTRAINT "transaction_edit_history_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_edit_history" ADD CONSTRAINT "transaction_edit_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_user_idx" ON "recurring_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tx_history_tx_idx" ON "transaction_edit_history" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "tx_history_user_idx" ON "transaction_edit_history" USING btree ("user_id");