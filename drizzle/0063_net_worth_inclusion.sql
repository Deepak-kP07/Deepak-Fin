-- Per-item opt-out of the Net Worth calculation (Dashboard's net-worth hero + Net Worth detail
-- page) — lets a user exclude a specific account/card/loan/portfolio/etc. (e.g. a joint account
-- that isn't really theirs) without hiding it from its own module. Plain flag, no side effects on
-- balance math elsewhere — see app/page.js's DashboardView for where it's read, and
-- lib/server/safeFields.js for where each table whitelists it through create/update.

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.lend_borrow ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.chit_funds ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
ALTER TABLE public.money_profiles ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;
