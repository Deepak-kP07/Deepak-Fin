import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveModuleSettings } from '@/lib/moduleSettings'

const COUNT_TABLES = ['accounts', 'transactions', 'holdings', 'loans', 'credit_cards', 'chit_funds', 'vault_items']

async function countFor(supabase, table, userId) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return count || 0
}

export async function GET(request, { params }) {
  const { response } = requireAdmin(request)
  if (response) return response

  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(id)
    if (authError || !authUser?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()

    const counts = {}
    await Promise.all(COUNT_TABLES.map(async (table) => { counts[table] = await countFor(supabase, table, id) }))

    const [{ data: deviceTokens }, { data: pushSubs }] = await Promise.all([
      supabase.from('device_tokens').select('platform').eq('user_id', id),
      supabase.from('push_subscriptions').select('id').eq('user_id', id),
    ])

    const u = authUser.user
    return NextResponse.json({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      confirmed: !!u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at || null,
      banned: !!(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
      profile: profile ? {
        full_name: profile.full_name,
        currency: profile.currency,
        theme: profile.theme,
        weekly_report_enabled: profile.weekly_report_enabled,
        monthly_report_enabled: profile.monthly_report_enabled,
        last_weekly_report_sent_at: profile.last_weekly_report_sent_at,
        last_monthly_report_sent_at: profile.last_monthly_report_sent_at,
        kite_linked: !!profile.kite_access_token,
        kite_last_error: profile.kite_last_error,
        modules: resolveModuleSettings(profile),
      } : null,
      counts,
      nativeAppPlatforms: [...new Set((deviceTokens || []).map((d) => d.platform))],
      webPushEnabled: (pushSubs || []).length > 0,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not load user' }, { status: 500 })
  }
}
