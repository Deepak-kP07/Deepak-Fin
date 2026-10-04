-- Whether a loan payment settled an EMI (true) or was entirely a prepayment (false). Set by the
-- loan_payments POST handler; NULL on older rows, which keep the old "amount >= EMI" rule
-- (features/loans/LoanDetailView.jsx). Needed so a big payment made while the next EMI is
-- already paid in advance isn't counted as yet another month's EMI.

ALTER TABLE public.loan_payments ADD COLUMN IF NOT EXISTS covers_emi boolean;
