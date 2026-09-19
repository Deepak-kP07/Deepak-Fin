-- Flags a transaction as money spent on someone else's behalf (common with credit cards in
-- India — you put their purchase on your card and they pay you back later). Plain flag, no side
-- effects: it never changes account/card balance math, only how the Credit Cards screen totals
-- "yours" vs "to be repaid" for display. See CreditCardDetailView.jsx / CardSpendForm.jsx /
-- TransactionForm (app/page.js) for where it's set, and lib/server/safeFields.js for where it's
-- whitelisted through create/update.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_reimbursable boolean NOT NULL DEFAULT false;
