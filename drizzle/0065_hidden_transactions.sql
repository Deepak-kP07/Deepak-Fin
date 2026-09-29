-- Hidden transactions: is_hidden keeps a transaction out of every list that shows it by name
-- (it still counts in every balance and total). The profiles columns hold the PIN that unlocks
-- them — hashed, with a wrong-try counter and lockout, only ever touched by
-- lib/server/services/hiddenPin.js and never returned to the browser.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_pin_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_pin_failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_pin_locked_until timestamptz;
