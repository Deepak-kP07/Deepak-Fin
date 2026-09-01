-- More sms_parse_patterns seed rows — Paytm, Canara Bank, India Post Payments Bank, and a
-- credit-card-spend format (SBI Card), on top of the starter set from drizzle/0048. Kept in sync
-- by hand with lib/sms/patterns.seed.js, which the parsing engine's own unit tests run against
-- (lib/sms/__tests__/parseEngine.test.js).
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'Paytm (UPI)', 'PAYTM',
  'Paid Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) to (?<merchant>[\w. ]+?) (?:via|using) Paytm',
  '{"amount":{"from":"amount","transform":"stripCommas"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'Canara Bank', 'CANBNK',
  'A\/C (?:XX|xx)?(?<last4>\d{4}) Debited for Rs:?(?<amount>[\d,]+\.\d{2}) on [\d-]+ trf to (?<merchant>[\w ]+?) Refno',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'India Post Payments Bank', 'IPPB',
  'Rs\.?(?<amount>[\d,]+\.\d{2}) debited from your IPPB A\/c (?:XX|xx)?(?<last4>\d{4}).*?to VPA (?<merchant>[\w.@-]+?)\.\s',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'SBI Card', 'SBICARD',
  'Your SBI Credit Card (?:ending )?(?:XX|xx)?(?<last4>\d{4}) (?:has been )?used for Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) at (?<merchant>[\w. ]+?) on',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
);
