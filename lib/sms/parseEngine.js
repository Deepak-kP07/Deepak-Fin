import { applyFieldMapping } from '@/lib/sms/fieldMapping'

const GENERIC_AMOUNT_RE = /(?:Rs\.?\s?|INR\s?)(?<amount>[\d,]+(?:\.\d{1,2})?)[\s\S]{0,60}?\b(?<direction>debited|withdrawn|spent|paid|sent|credited|received|deposited)\b/i
const GENERIC_LAST4_RE = /(?:a\/?c|acct|account|card)[^\d\n]{0,20}(?:x{2,6}|\*{2,6})?(?<last4>\d{4})\b/i
const GENERIC_MERCHANT_RE = /\b(?:to|at|from|towards)\s+(?<merchant>[A-Za-z][\w.@&' -]{1,40}?)(?=[.,]|\s+(?:on|via|refno|ref no|ref|avl|bal)\b|$)/i
const DEBIT_WORDS = new Set(['debited', 'withdrawn', 'spent', 'paid', 'sent'])
const CREDIT_WORDS = new Set(['credited', 'received', 'deposited'])

// Runs only when no bank/app-specific pattern matched (see parseSms below) — a broad, best-effort
// extraction instead of needing a hand-tuned regex per bank. Deliberately conservative: requires
// BOTH a recognizable amount+direction AND a last4 hint, since without a last4 there's nothing to
// cross-check against the user's own accounts server-side. That cross-check (not this regex) is
// what actually keeps this safe from false-positiving on promotional/OTP/unrelated SMS — a
// message that happens to mention "Rs" and "credited" but doesn't carry YOUR account's last4 gets
// discarded at ingestion (lib/server/genericCrud.js), never shown as pending.
function parseGeneric(body) {
  const amountMatch = GENERIC_AMOUNT_RE.exec(body)
  if (!amountMatch) return null
  const direction = amountMatch.groups.direction.toLowerCase()
  const type = DEBIT_WORDS.has(direction) ? 'expense' : CREDIT_WORDS.has(direction) ? 'income' : null
  if (!type) return null
  const last4Match = GENERIC_LAST4_RE.exec(body)
  if (!last4Match) return null
  const merchantMatch = GENERIC_MERCHANT_RE.exec(body)
  return {
    amount: amountMatch.groups.amount.replace(/,/g, ''),
    type,
    last4_hint: last4Match.groups.last4,
    merchant: merchantMatch?.groups?.merchant?.trim(),
  }
}

// Pure, isomorphic — no Supabase/Next import — so it's unit-testable with plain fixtures and,
// later, reusable from the Capacitor WebView JS layer with zero network round trip. Account/card
// last4 matching and category-name resolution happen server-side at ingestion (see
// app/api/finance/pending_transactions/route.js), not here, to keep this mock-free.
export function parseSms(patterns, { sender, body }) {
  if (!sender || !body) return null
  const candidates = (patterns || [])
    .filter((p) => p.is_active !== false && !p.is_generic && matchesSender(p.sender_id_pattern, sender))
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

  // No specific pattern recognized this sender/format — fall back to the generic extractor,
  // gated behind its own is_active row so it can be toggled off without a code change.
  const genericPattern = (patterns || []).find((p) => p.is_generic && p.is_active !== false)
  if (genericPattern) {
    const generic = parseGeneric(body)
    if (generic) return { ...generic, matched_pattern_id: genericPattern.id ?? null, sender_id: sender }
  }
  return null
}

function matchesSender(senderPattern, sender) {
  if (!senderPattern) return false
  try { return new RegExp(senderPattern).test(sender) } catch { return senderPattern === sender }
}
