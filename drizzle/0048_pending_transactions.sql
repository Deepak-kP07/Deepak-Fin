-- SMS Auto-Detect Transactions: sms_parse_patterns (global config, no owner) and
-- pending_transactions (per-user, owner-only) — see lib/sms/parseEngine.js for the matcher and
-- lib/server/services/pendingTransactions.js for approve/reject.

CREATE TABLE public.sms_parse_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_or_app text NOT NULL,
  sender_id_pattern text NOT NULL,
  message_regex text NOT NULL,
  field_mapping jsonb NOT NULL,
  txn_type public.transaction_type,
  suggested_category_name text,
  suggested_category_type public.category_type,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX sms_parse_patterns_sender_idx ON public.sms_parse_patterns (sender_id_pattern);
--> statement-breakpoint

-- Global, shared config — not owned by anyone, so RLS here isn't the usual "auth.uid() =
-- user_id" shape. Every authenticated user can read the active pattern set (needed client-side
-- to parse an incoming SMS); nobody gets an INSERT/UPDATE/DELETE grant at all, since these rows
-- are managed only through migrations, never a client write.
ALTER TABLE public.sms_parse_patterns ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "sms_parse_patterns read all" ON public.sms_parse_patterns;
--> statement-breakpoint
CREATE POLICY "sms_parse_patterns read all" ON public.sms_parse_patterns FOR SELECT USING (true);
--> statement-breakpoint

GRANT SELECT ON public.sms_parse_patterns TO authenticated;
--> statement-breakpoint

-- Starter pattern set for the top Indian banks/UPI apps. These regexes are best-effort
-- approximations of common SMS formats and should be refined against real received SMS text
-- once some are collected — kept in sync by hand with lib/sms/patterns.seed.js, which the
-- parsing engine's own unit tests run against (lib/sms/__tests__/parseEngine.test.js).
INSERT INTO public.sms_parse_patterns (bank_or_app, sender_id_pattern, message_regex, field_mapping, txn_type, suggested_category_name, suggested_category_type, priority) VALUES
(
  'HDFC Bank', 'HDFCBK$',
  'Rs\.?\s?(?<amount>[\d,]+\.\d{2}) debited from A\/c (?:XX|xx)?(?<last4>\d{4}) on [\w-]+ to VPA (?<merchant>[\w.@-]+)',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'ICICI Bank', 'ICICIB$',
  'Acct (?:XX|xx)?(?<last4>\d{4}) debited with INR (?<amount>[\d,]+\.\d{2}) on [\w-]+; (?<merchant>[\w &]+?) credited',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'State Bank of India', 'SBI',
  'A\/C (?:X{1,2})?(?<last4>\d{4}) debited by (?<amount>[\d,]+(?:\.\d{1,2})?) on date [\w]+ trf to (?<merchant>[\w ]+?) Refno',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 5
),
(
  'Axis Bank', 'AXISBK$',
  'INR (?<amount>[\d,]+\.\d{2}) debited from A\/c no\. (?:XX|xx)?(?<last4>\d{4}) on [\d-]+ towards UPI\/P2M\/\d+\/(?<merchant>\w+)\. Avl Bal',
  '{"amount":{"from":"amount","transform":"stripCommas"},"last4_hint":{"from":"last4"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
),
(
  'Google Pay (UPI)', 'GPAY',
  'You received Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) from (?<merchant>[\w. ]+?) via UPI',
  '{"amount":{"from":"amount","transform":"stripCommas"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"income"}}'::jsonb,
  'income', NULL, NULL, 10
),
(
  'PhonePe (UPI)', 'PHONEPE',
  'Payment of Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) made to (?<merchant>[\w. ]+?) via PhonePe UPI',
  '{"amount":{"from":"amount","transform":"stripCommas"},"merchant":{"from":"merchant","transform":"trim"},"type":{"literal":"expense"}}'::jsonb,
  'expense', NULL, NULL, 10
);
--> statement-breakpoint

CREATE TABLE public.pending_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  amount numeric(14, 2) CHECK (amount IS NULL OR amount >= 0),
  type public.transaction_type,
  merchant text,
  description text,
  date date,
  time time,
  suggested_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  sender_id text NOT NULL,
  matched_pattern_id uuid REFERENCES public.sms_parse_patterns(id) ON DELETE SET NULL,
  raw_message text,
  last4_hint text,
  resolved_at timestamptz,
  linked_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX pending_transactions_user_status_idx ON public.pending_transactions (user_id, status);
--> statement-breakpoint

-- Owner-only, same shape as drizzle/0045_recurring_money_profile_entries.sql.
ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "pending_transactions own rows" ON public.pending_transactions;
--> statement-breakpoint
CREATE POLICY "pending_transactions own rows" ON public.pending_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_transactions TO authenticated;
--> statement-breakpoint

-- Power-user opt-in (Settings > SMS Auto-Detect), off by default — see
-- lib/server/genericCrud.js's pending_transactions branch for where this is read.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_auto_approve_trusted boolean NOT NULL DEFAULT false;

