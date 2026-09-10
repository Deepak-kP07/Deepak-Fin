-- Real received SMS from the user showed drizzle/0053's Union Bank debit pattern was still an
-- unverified guess, and it was wrong: real debit alerts say "Debited Rs:10.00" with no "for"
-- ("Debited for Rs:" only appears on the credit side). That mismatch meant every debit fell
-- through to the generic fallback instead, which then mis-picked its "merchant" as the trailing
-- "SMS BLOCK ... to 8879365472" support phone number (the only "to <word>" in the message) instead
-- of the real payee — the debit alert does carry a real payee, in a "Fvg: <name>" clause the
-- credit side doesn't have, so this now captures it properly. Kept in sync by hand with
-- lib/sms/patterns.seed.js, which the parsing engine's own unit tests run against
-- (lib/sms/__tests__/parseEngine.test.js).
UPDATE public.sms_parse_patterns
SET
  message_regex = 'A\/c \*?(?<last4>\d{4}) Debited Rs:?(?<amount>[\d,]+\.\d{2}) on .*?Fvg:\s*(?<merchant>[\w ]+?)\s*Avl Bal',
  field_mapping = '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb
WHERE bank_or_app = 'Union Bank of India (debit)';
--> statement-breakpoint

-- New bank: APGBank (Andhra Pradesh Grameena Bank). Real format: "Your a/c no. XXXXXXXXXXX7120 is
-- debited for Rs.1174.50 on 06/09/2026 17:14:44 and credited to VPA repaymentsnesfb@slc (UPI Ref
-- no 624975308139) -APGBank" — lowercase "a/c" (unlike every other bank here), and this is the one
-- shape the generic fallback can never handle: it names BOTH "debited" (self) and "credited to
-- VPA X" (the counterparty) in the same sentence, which parseGeneric's ambiguity guard reads as
-- "both, therefore neither" and drops entirely. APGBank's credit format ("An amount of Rs.X/- is
-- credited in your A/c...") has no such ambiguity and already generic-matches fine, so it gets no
-- dedicated row here. sender_id_pattern is a best-effort guess (the real DLT sender wasn't
-- confirmed via a device screenshot, only the message body was available) — refine it once
-- confirmed.
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'APGBank (debit)', 'APGB',
  'a\/c no\.\s*X*(?<last4>\d{4}) is debited for Rs\.(?<amount>[\d,]+\.\d{2}) on [\d\/]+ [\d:]+ and credited to VPA (?<merchant>[\w.@-]+)',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
);
