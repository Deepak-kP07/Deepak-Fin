-- Tracks the transaction created to mirror a Money Profile's opening_balance onto its linked
-- account (lib/server/moneyProfileCrud.js's syncOpeningBalanceMirror) — until now, only entries
-- logged AFTER linking ever posted to the account; the opening_balance itself (money already held
-- as of a point in time) never did, so a freshly-linked profile with a nonzero opening_balance
-- never showed up in the account's own balance. Nullable FK, not money_profile_entries.linked_
-- transaction_id, since counting the opening balance as an entry too would double the profile's
-- own displayed balance (opening_balance already includes it in profileTotals).
ALTER TABLE public.money_profiles ADD COLUMN IF NOT EXISTS opening_balance_linked_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;
