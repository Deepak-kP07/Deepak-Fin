-- The existing Canara Bank pattern only handles the debit format ("Dr. INR..."). A real credit
-- SMS ("Acct XXX601 credited with INR...") fell through to the generic fallback, which requires
-- a last4 to return anything — Canara's masking here only ever reveals 3 digits, so it always
-- returned null and the transaction was silently missed. Kept in sync by hand with
-- lib/sms/patterns.seed.js, which the parsing engine's own unit tests run against.
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'Canara Bank', 'CANBNK',
  'Acct XXX\d{3} credited with INR (?<amount>[\d,]+\.\d{2}) on [\d\/]+ from (?<merchant>[\w ]+?);',
  '{"amount":{"from":"amount","transform":"stripCommas"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"income"}}'::jsonb,
  'income', NULL, NULL, 10
);
