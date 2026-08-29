CREATE TABLE public.recurring_money_profile_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.money_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL DEFAULT 'expense' CHECK (entry_type IN ('income', 'expense', 'capital')),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  notes text,
  paid_party text,
  frequency public.recurring_frequency NOT NULL DEFAULT 'monthly',
  next_due_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX recurring_money_profile_entries_profile_idx ON public.recurring_money_profile_entries (profile_id);
--> statement-breakpoint
CREATE INDEX recurring_money_profile_entries_user_idx ON public.recurring_money_profile_entries (user_id);
--> statement-breakpoint

-- Owner-only, same as recurring_transactions — a collaborator can log entries on a shared
-- profile, but managing its recurring automation stays the owner's call.
ALTER TABLE public.recurring_money_profile_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "recurring_money_profile_entries own rows" ON public.recurring_money_profile_entries;
--> statement-breakpoint
CREATE POLICY "recurring_money_profile_entries own rows" ON public.recurring_money_profile_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_money_profile_entries TO authenticated;
