ALTER TYPE "public"."account_type" ADD VALUE 'debit_card';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "linked_account_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;