-- Real sender IDs confirmed via a Messages app screenshot — both original guesses ("PHONEPE",
-- "SBICARD") never matched a single real message. Kept in sync by hand with
-- lib/sms/patterns.seed.js, which the parsing engine's own unit tests run against.
UPDATE public.sms_parse_patterns SET sender_id_pattern = 'PHONPE' WHERE bank_or_app = 'PhonePe (UPI)';
--> statement-breakpoint
UPDATE public.sms_parse_patterns SET sender_id_pattern = 'SBICRD' WHERE bank_or_app = 'SBI Card';
