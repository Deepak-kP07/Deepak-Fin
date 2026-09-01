-- Real received SMS from the user showed both drizzle/0048's Canara pattern and drizzle/0051's
-- Union Bank pattern were wrong guesses. Kept in sync by hand with lib/sms/patterns.seed.js,
-- which the parsing engine's own unit tests run against (lib/sms/__tests__/parseEngine.test.js).

-- Canara Bank: real format is "Acct XXX601 Dr. INR 90.00 on 30/08/26 to PENTUMANI VE; UPI:...".
-- No last4_hint any more — Canara only ever reveals 3 digits ("XXX601"), never a real last4;
-- account resolution for this pattern relies on the bank-name fallback in genericCrud.js instead.
UPDATE public.sms_parse_patterns
SET
  message_regex = 'Acct XXX\d{3} Dr\.\s?INR (?<amount>[\d,]+\.\d{2}) on [\d\/]+ to (?<merchant>[\w ]+?);',
  field_mapping = '{"amount":{"from":"amount","transform":"stripCommas"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb
WHERE bank_or_app = 'Canara Bank';
--> statement-breakpoint

-- Union Bank of India: real format is "A/c *5780 Credited for Rs:10.00 on 01-09-2026...", with a
-- colon (not period) before the amount and "*" as the mask character — both different from every
-- other bank seeded so far. The existing row (drizzle/0051) was an unverified debit-only guess in
-- the wrong shape entirely; this repoints it at the confirmed real credit format instead.
UPDATE public.sms_parse_patterns
SET
  bank_or_app = 'Union Bank of India',
  message_regex = 'A\/c \*?(?<last4>\d{4}) Credited for Rs:?(?<amount>[\d,]+\.\d{2}) on',
  field_mapping = '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"type":{"literal":"income"}}'::jsonb,
  txn_type = 'income'
WHERE bank_or_app = 'Union Bank of India';
--> statement-breakpoint

-- New row: the debit-side mirror of the confirmed format above — NOT yet confirmed against a
-- real received SMS, refine it if it doesn't match once one arrives.
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'Union Bank of India (debit)', 'UNIONB',
  'A\/c \*?(?<last4>\d{4}) Debited for Rs:?(?<amount>[\d,]+\.\d{2}) on',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
);
