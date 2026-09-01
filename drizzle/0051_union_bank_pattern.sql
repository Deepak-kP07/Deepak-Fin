-- Union Bank of India pattern. Kept in sync by hand with lib/sms/patterns.seed.js, which the
-- parsing engine's own unit tests run against (lib/sms/__tests__/parseEngine.test.js).
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'Union Bank of India', 'UNIONB',
  'Rs\.?\s?(?<amount>[\d,]+\.\d{2}) debited from A\/c (?:XX|xx)?(?<last4>\d{4}) on [\w-]+ to VPA (?<merchant>[\w.@-]+?)\.\s',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
);
