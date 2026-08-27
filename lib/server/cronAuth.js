import { timingSafeEqual } from 'node:crypto'

// Shared by all 3 Vercel cron routes (notifications, reports/weekly, reports/monthly). Vercel
// Cron adds `Authorization: Bearer <CRON_SECRET>` itself once CRON_SECRET is set as a Vercel env
// var; x-cron-secret is the manual-curl testing path — either is accepted. timingSafeEqual
// instead of a plain !== comparison so the check can't leak how many leading characters of a
// guessed secret happened to match via response-time differences.
export function isValidCronSecret(request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const secret = request.headers.get('x-cron-secret') || bearer
  if (!secret || secret.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
}
