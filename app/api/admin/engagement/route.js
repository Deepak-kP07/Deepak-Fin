import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllUsers } from '@/lib/server/adminUsers'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response

  try {
    const supabase = createAdminClient()
    const [users, { data: txUserRows, error: txError }] = await Promise.all([
      listAllUsers(supabase),
      supabase.from('transactions').select('user_id'),
    ])
    if (txError) throw new Error(txError.message)

    const now = Date.now()
    const lastSeen = (u) => (u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null)

    const dau = users.filter((u) => lastSeen(u) && now - lastSeen(u) <= DAY_MS).length
    const wau = users.filter((u) => lastSeen(u) && now - lastSeen(u) <= 7 * DAY_MS).length
    const mau = users.filter((u) => lastSeen(u) && now - lastSeen(u) <= 30 * DAY_MS).length
    const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0

    const activatedUserIds = new Set((txUserRows || []).map((r) => r.user_id))
    const totalUsers = users.length
    const confirmedUsers = users.filter((u) => !!u.email_confirmed_at).length
    const activatedUsers = users.filter((u) => activatedUserIds.has(u.id)).length

    const churnCutoff = now - 30 * DAY_MS
    const atRisk = users
      .filter((u) => {
        const seen = lastSeen(u)
        // Never signed back in after signup, and it's been 30+ days since signup — or signed in
        // once and hasn't been back in 30+ days. Either way: "at risk," not "brand new."
        const reference = seen ?? new Date(u.created_at).getTime()
        return reference <= churnCutoff
      })
      .map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        daysInactive: Math.floor((now - (lastSeen(u) ?? new Date(u.created_at).getTime())) / DAY_MS),
      }))
      .sort((a, b) => b.daysInactive - a.daysInactive)

    return NextResponse.json({
      dau, wau, mau, stickiness,
      funnel: { signedUp: totalUsers, confirmed: confirmedUsers, activated: activatedUsers },
      atRisk,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not load engagement data' }, { status: 500 })
  }
}
