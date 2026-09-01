import { applyFieldMapping } from '@/lib/sms/fieldMapping'

// Pure, isomorphic — no Supabase/Next import — so it's unit-testable with plain fixtures and,
// later, reusable from the Capacitor WebView JS layer with zero network round trip. Account/card
// last4 matching and category-name resolution happen server-side at ingestion (see
// app/api/finance/pending_transactions/route.js), not here, to keep this mock-free.
export function parseSms(patterns, { sender, body }) {
  if (!sender || !body) return null
  const candidates = (patterns || [])
    .filter((p) => p.is_active !== false && matchesSender(p.sender_id_pattern, sender))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))

  for (const pattern of candidates) {
    let regex
    try { regex = new RegExp(pattern.message_regex) } catch { continue }
    const match = regex.exec(body)
    if (!match || !match.groups) continue
    const fields = applyFieldMapping(pattern, match.groups)
    if (fields.amount == null) continue // unusable as a transaction without an amount
    return { ...fields, matched_pattern_id: pattern.id ?? null, sender_id: sender }
  }
  return null
}

function matchesSender(senderPattern, sender) {
  if (!senderPattern) return false
  try { return new RegExp(senderPattern).test(sender) } catch { return senderPattern === sender }
}
