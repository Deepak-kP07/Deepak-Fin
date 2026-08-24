-- Lets an invite landing page show "you're invited to <profile> as <role>" before the visitor
-- has even logged in, and lets the accept route produce a precise "this was sent to a different
-- email" message instead of a bare RLS-filtered 404. Same trust model as any emailed invite
-- link: holding the token is what grants the ability to see what it's for, so this is
-- deliberately readable by anon, not just authenticated.
CREATE OR REPLACE FUNCTION public.money_profile_share_preview(p_token text)
RETURNS TABLE(profile_name text, role text, invited_email text, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name, s.role, s.invited_email, s.status, s.expires_at
  FROM public.money_profile_shares s
  JOIN public.money_profiles p ON p.id = s.profile_id
  WHERE s.invite_token = p_token
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.money_profile_share_preview(text) TO authenticated, anon;
