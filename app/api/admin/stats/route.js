import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

const DAY_MS = 24 * 60 * 60 * 1000

// supabase.auth.admin.listUsers() defaults to 50/page — loop until a short page confirms we've
// seen everyone, correct at any user count instead of silently capping at the default.
async function listAllUsers(supabase) {
  const perPage = 1000
  const all = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    all.push(...data.users)
    if (data.users.length < perPage) break
  }
  return all
}

const dayKey = (date) => date.toISOString().slice(0, 10)

export async function GET(request) {
  const { response } = requireAdmin(request)
  if (response) return response

  try {
    return await buildStats(request)
  } catch (err) {
    // Internal-only tool (never exposed to real users) — safe to return the real message
    // instead of a blank 500, so a misconfigured env var or a Supabase error is diagnosable
    // straight from the browser instead of needing Vercel function logs.
    return NextResponse.json({ error: err.message || 'Unknown error building stats' }, { status: 500 })
  }
}

async function buildStats(request) {
  const url = new URL(request.url)
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365)

  const supabase = createAdminClient()
  const users = await listAllUsers(supabase)

  const now = Date.now()
  const weekAgo = now - 7 * DAY_MS
  const monthAgo = now - 30 * DAY_MS
  const rangeStart = now - days * DAY_MS

  const totalUsers = users.length
  const newUsersThisWeek = users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length
  const newUsersThisMonth = users.filter((u) => new Date(u.created_at).getTime() >= monthAgo).length

  const dayCounts = new Map()
  let usersBeforeRange = 0
  for (const u of users) {
    const t = new Date(u.created_at).getTime()
    if (t < rangeStart) { usersBeforeRange += 1; continue }
    const key = dayKey(new Date(t))
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
  }

  const dailySignups = []
  let cumulative = usersBeforeRange
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now - i * DAY_MS)
    const key = dayKey(d)
    const signups = dayCounts.get(key) || 0
    cumulative += signups
    dailySignups.push({ date: key, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), signups, total: cumulative })
  }

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
    .map((u) => ({ email: u.email, created_at: u.created_at, confirmed: !!u.email_confirmed_at }))

  let activeUsersThisWeek = 0
  try {
    const { data: recentTx } = await supabase
      .from('transactions').select('user_id').gte('date', new Date(weekAgo).toISOString().slice(0, 10))
    activeUsersThisWeek = new Set((recentTx || []).map((r) => r.user_id)).size
  } catch {
    // Active-users is a bonus signal, not critical — leave it 0 rather than failing the whole page.
  }

  return NextResponse.json({ totalUsers, newUsersThisWeek, newUsersThisMonth, activeUsersThisWeek, dailySignups, recentSignups })
}
