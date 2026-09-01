import { applyFieldMapping } from '@/lib/sms/fieldMapping'

// Just the amount — direction is checked separately (see below) since real bank SMS disagree on
// which side of the amount the debit/credit word lands on ("Rs.10.00 debited..." vs "Debit
// Rs.10.00..."), and tying them together by proximity/order missed the second shape entirely.
// Takes the FIRST Rs/INR amount in the message, which in every observed format is the actual
// transaction amount — a trailing "Avl Bal Rs.X" always comes later in the text. [.:]? (not just
// \.?) — Union Bank writes "Rs:10.00" with a colon, not a period.
const GENERIC_AMOUNT_RE = /(?:Rs|INR)[.:]?\s?(?<amount>[\d,]+(?:\.\d{1,2})?)/i
// (?!\s*card) — "your debit card ending 4521" / "credit card statement" mention the word without
// describing an actual debit/credit event; without this exclusion a bill-due reminder or a card-
// dispatch notice reads as a real transaction. \bdr\.|\bcr\. — Canara Bank abbreviates to "Dr."/
// "Cr." rather than spelling out debited/credited.
const GENERIC_DEBIT_RE = /\b(?:debited|debit|withdrawn|spent|paid|sent)\b(?!\s*card)|\bdr\./i
const GENERIC_CREDIT_RE = /\b(?:credited|credit|received|deposited)\b(?!\s*card)|\bcr\./i
// x{1,6} (not x{2,6}) — a single "X" mask ("A/C X1486") is just as common as "XX1234"/"**1234".
const GENERIC_LAST4_RE = /(?:a\/?c|acct|account|card)[^\d\n]{0,20}(?:x{1,6}|\*{1,6})?(?<last4>\d{4})\b/i
// Merchant can start with a digit — UPI handles are often phone-number-based ("to 98765xxxxx@ok").
const GENERIC_MERCHANT_RE = /\b(?:to|at|from|towards)\s+(?<merchant>[A-Za-z0-9][\w.@&' -]{1,40}?)(?=[.,;]|\s+(?:on|via|refno|ref no|ref|avl|bal)\b|$)/i

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
  const isDebit = GENERIC_DEBIT_RE.test(body)
  const isCredit = GENERIC_CREDIT_RE.test(body)
  if (isDebit === isCredit) return null // neither, or both (ambiguous) — too uncertain to guess
  const type = isDebit ? 'expense' : 'income'
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
  // An OTP request is a pending, not-yet-completed transaction — never treat it as a real one,
  // regardless of which pattern might otherwise match ("...at Flipkart with your credit card
  // ending 1037. OTP is valid for 10 mins..." reads exactly like a real spend to every other
  // check here). Centralized so it protects specific patterns too, not just the generic fallback.
  // NOT a bare /otp/ check — most real transaction SMS append a "Never Share OTP/PIN/CVV" security
  // disclaimer to routine, already-completed alerts too, which a blanket check would wrongly
  // exclude. Only matches phrasings that mean "here is/this concerns an OTP code" ("is the OTP
  // for...", "OTP is...", "OTP: 123456"), not a generic mention of the word.
  if (/\b(?:is\s+(?:your|the)\s+otp\b|otp\s*(?:is|for|:|\d))/i.test(body)) return null
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
