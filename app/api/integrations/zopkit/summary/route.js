import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidIntegrationKey, todayInIndia, resolveRange, loadZopkitSummary } from '@/lib/server/integrations/zopkitSummary'

// Read-only summary of the Zopkit company profile for the "Zopkit One" app, called server-to-
// server with `Authorization: Bearer <ZOPKIT_INTEGRATION_KEY>`. GET is the only export, so Next
// answers every other method with 405. There's no user session here, so this uses the service-
// role client — the scope is enforced by the profile id coming only from ZOPKIT_PROFILE_ID (never
// the request) and by the explicit column lists in loadZopkitSummary().
export const dynamic = 'force-dynamic'

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request) {
  if (!isValidIntegrationKey(request.headers.get('authorization'), process.env.ZOPKIT_INTEGRATION_KEY?.trim())) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const profileId = process.env.ZOPKIT_PROFILE_ID?.trim()
  if (!profileId) return json({ error: 'Integration not configured' }, 500)

  const today = todayInIndia()
  const { searchParams } = new URL(request.url)
  const range = resolveRange(searchParams.get('from'), searchParams.get('to'), today)
  if (range.error) return json({ error: range.error }, 400)

  try {
    const summary = await loadZopkitSummary(createAdminClient(), profileId, { ...range, today })
    if (!summary) return json({ error: 'Profile not found' }, 404)
    return json(summary)
  } catch {
    // Deliberately no detail in the response or logs beyond this — nothing about the request
    // (including the key) is ever logged.
    console.error('zopkit summary: query failed')
    return json({ error: 'Internal error' }, 500)
  }
}
