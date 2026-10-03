-- In-app notification center (the bell). Every notification lands here whether or not a push was
-- delivered. Rows are only ever inserted server-side (lib/server/services/notifications.js); the
-- owner can read them, mark them read and delete them.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  view text,
  link text,
  dedup_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_dedup_key UNIQUE (user_id, dedup_key)
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications own rows" ON public.notifications;
CREATE POLICY "notifications own rows" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
