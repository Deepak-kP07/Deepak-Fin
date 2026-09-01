-- The IPPB pattern seeded in drizzle/0048 was a guess and didn't match real IPPB SMS: the real
-- sender contains "IPBMSG" (not "IPPB"), and the real wording is "A/C X1486 Debit Rs.10.00 for
-- UPI to <merchant> on <date>..." — "Debit" before the amount, not "Rs.X debited" after it. Kept
-- in sync by hand with lib/sms/patterns.seed.js, which the parsing engine's own unit tests run
-- against (lib/sms/__tests__/parseEngine.test.js).
UPDATE public.sms_parse_patterns
SET
  sender_id_pattern = 'IPBMSG',
  message_regex = 'A\/C (?:X{1,2})?(?<last4>\d{4}) Debit Rs\.?(?<amount>[\d,]+\.\d{2}) for UPI to (?<merchant>[\w.@-]+) on'
WHERE bank_or_app = 'India Post Payments Bank';
