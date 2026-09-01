-- Generic SMS fallback — instead of needing a hand-tuned regex per bank, this lets any bank/UPI
-- app's debit/credit SMS become a pending transaction as long as it carries a last4 that matches
-- one of the user's own accounts/cards (checked server-side at ingestion, lib/server/genericCrud.js
-- — that check, not this migration, is the real safety net against false positives). Specific
-- patterns (drizzle/0048, 0049) still take priority when they match; this only fires otherwise.

ALTER TABLE public.sms_parse_patterns ADD COLUMN IF NOT EXISTS is_generic boolean NOT NULL DEFAULT false;
--> statement-breakpoint

INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority, is_generic)
VALUES (
  'Generic (any bank/UPI app)', '.',
  '(not used — see lib/sms/parseEngine.js parseGeneric)',
  '{}'::jsonb,
  NULL, NULL, NULL, 0, true
);
