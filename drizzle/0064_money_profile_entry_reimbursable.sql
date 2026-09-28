-- "Not my spending" flag for a Family/Company entry paid by credit card, matching
-- transactions.is_reimbursable (0061). Copied onto the entry's mirrored transaction by
-- lib/server/moneyProfileCrud.js, so the card's "To be repaid" split picks it up.

ALTER TABLE public.money_profile_entries ADD COLUMN IF NOT EXISTS is_reimbursable boolean NOT NULL DEFAULT false;
