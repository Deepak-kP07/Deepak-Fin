import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllUsers } from '@/lib/server/adminUsers'
import { MODULE_KEYS, resolveModuleSettings } from '@/lib/moduleSettings'

export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response

  try {
    const supabase = createAdminClient()
    const [users, { data: profiles, error: profilesError }, { data: deviceTokens }, { data: pushSubs }] = await Promise.all([
      listAllUsers(supabase),
      supabase.from('profiles').select('id, module_settings, kite_access_token, weekly_report_enabled, monthly_report_enabled'),
      supabase.from('device_tokens').select('user_id'),
      supabase.from('push_subscriptions').select('user_id'),
    ])
    if (profilesError) throw new Error(profilesError.message)

    const totalUsers = users.length
    const profileList = profiles || []

    const moduleCounts = Object.fromEntries(MODULE_KEYS.map((k) => [k, 0]))
    let kiteLinked = 0
    let weeklyOptIn = 0
    let monthlyOptIn = 0
    for (const profile of profileList) {
      const resolved = resolveModuleSettings(profile)
      for (const key of MODULE_KEYS) if (resolved[key].enabled) moduleCounts[key] += 1
      if (profile.kite_access_token) kiteLinked += 1
      if (profile.weekly_report_enabled) weeklyOptIn += 1
      if (profile.monthly_report_enabled) monthlyOptIn += 1
    }

    const nativeAppUsers = new Set((deviceTokens || []).map((d) => d.user_id)).size
    const webPushUsers = new Set((pushSubs || []).map((p) => p.user_id)).size

    const modules = MODULE_KEYS.map((key) => ({
      key,
      count: moduleCounts[key],
      pct: totalUsers > 0 ? Math.round((moduleCounts[key] / totalUsers) * 100) : 0,
    }))

    const pct = (n) => (totalUsers > 0 ? Math.round((n / totalUsers) * 100) : 0)

    return NextResponse.json({
      totalUsers,
      modules,
      integrations: [
        { key: 'kite_linked', label: 'Kite linked', count: kiteLinked, pct: pct(kiteLinked) },
        { key: 'native_app', label: 'Native app installed', count: nativeAppUsers, pct: pct(nativeAppUsers) },
        { key: 'web_push', label: 'Web push enabled', count: webPushUsers, pct: pct(webPushUsers) },
        { key: 'weekly_report', label: 'Weekly report opted in', count: weeklyOptIn, pct: pct(weeklyOptIn) },
        { key: 'monthly_report', label: 'Monthly report opted in', count: monthlyOptIn, pct: pct(monthlyOptIn) },
      ],
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not load adoption data' }, { status: 500 })
  }
}
