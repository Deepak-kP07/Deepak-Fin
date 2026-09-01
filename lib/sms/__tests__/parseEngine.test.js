import { describe, expect, it } from 'vitest'
import { parseSms } from '@/lib/sms/parseEngine'
import { SMS_PATTERN_SEEDS } from '@/lib/sms/patterns.seed'

// Representative sample SMS text for each seeded pattern. Approximate real-world formats — see
// the retention note in patterns.seed.js. Each case targets the PRD's >90% amount+type accuracy
// bar for a message that DOES match one of the seeded patterns; the last block covers messages
// that should correctly fail to match (no pattern should ever guess wrong rather than abstain).
const CASES = [
  {
    label: 'HDFC Bank debit',
    sender: 'HDFCBK',
    body: 'Rs 500.00 debited from A/c XX4521 on 01-Sep-26 to VPA rahul@okhdfcbank Ref No 402312345678. Not you? SMS BLOCKUPI to 7308080808 -HDFC Bank',
    expect: { amount: '500.00', type: 'expense', last4_hint: '4521', merchant: 'rahul@okhdfcbank' },
  },
  {
    label: 'HDFC Bank debit, alphanumeric sender prefix',
    sender: 'VM-HDFCBK',
    body: 'Rs 1,250.50 debited from A/c XX9981 on 02-Sep-26 to VPA store@okaxis Ref No 402312399999. Not you? SMS BLOCKUPI to 7308080808 -HDFC Bank',
    expect: { amount: '1250.50', type: 'expense', last4_hint: '9981', merchant: 'store@okaxis' },
  },
  {
    label: 'ICICI Bank debit',
    sender: 'ICICIB',
    body: 'ICICI Bank Acct XX7890 debited with INR 799.00 on 01-Sep-26; Amazon Pay credited. UPI:402312345678. Call 18002662 for dispute',
    expect: { amount: '799.00', type: 'expense', last4_hint: '7890', merchant: 'Amazon Pay' },
  },
  {
    label: 'SBI UPI debit',
    sender: 'AD-SBIUPI',
    body: 'Dear UPI user A/C X1234 debited by 350.0 on date 01Sep26 trf to Swiggy Refno 402312345678. If not u, SMS BLOCKUPI to 9223008333 -SBI',
    expect: { amount: '350.0', type: 'expense', last4_hint: '1234', merchant: 'Swiggy' },
  },
  {
    label: 'Axis Bank debit',
    sender: 'AXISBK',
    body: 'INR 1,200.00 debited from A/c no. XX5678 on 01-09-2026 towards UPI/P2M/402312345678/Zomato. Avl Bal INR 15,400.00 -Axis Bank',
    expect: { amount: '1200.00', type: 'expense', last4_hint: '5678', merchant: 'Zomato' },
  },
  {
    label: 'Google Pay UPI credit',
    sender: 'GPAY',
    body: 'You received Rs.500 from Rahul Sharma via UPI. UPI Ref No 402312345678.',
    expect: { amount: '500', type: 'income', merchant: 'Rahul Sharma' },
  },
  {
    // Real sender is "JX-PHONPE-S" — see lib/sms/patterns.seed.js.
    label: 'PhonePe UPI debit',
    sender: 'JX-PHONPE-S',
    body: 'Payment of Rs.240 made to Swiggy via PhonePe UPI. Ref: 402312345678',
    expect: { amount: '240', type: 'expense', merchant: 'Swiggy' },
  },
  {
    label: 'Paytm UPI debit',
    sender: 'PAYTM',
    body: 'Paid Rs.199 to Swiggy via Paytm. UPI Ref No 402312345678',
    expect: { amount: '199', type: 'expense', merchant: 'Swiggy' },
  },
  {
    // Real observed format (not a guess) — see lib/sms/patterns.seed.js. No last4_hint: Canara
    // only reveals the last 3 digits ("XXX601"), which can never match a real 4-digit last4.
    label: 'Canara Bank debit',
    sender: 'AD-CANBNK',
    body: 'Dear Customer, Acct XXX601 Dr. INR 90.00 on 30/08/26 to PENTUMANI VE; UPI: 128758271865; Bal INR 10,060.87.Not you? SMS BLOCKUPI to 9901771222-CanaraBank',
    expect: { amount: '90.00', type: 'expense', merchant: 'PENTUMANI VE' },
  },
  {
    // Real observed format (not a guess), sent from "AD-IPBMSG-S" — see lib/sms/patterns.seed.js.
    label: 'IPPB debit',
    sender: 'AD-IPBMSG-S',
    body: 'A/C X1486 Debit Rs.10.00 for UPI to 7989101143@pty on 01-09-26 Ref 624450441029. Avl Bal Rs.929.14. If not you? SMS FREEZE "full a/c" to 7669034700-IPPB',
    expect: { amount: '10.00', type: 'expense', last4_hint: '1486', merchant: '7989101143@pty' },
  },
  {
    // Real sender is "JM-SBICRD-S" — see lib/sms/patterns.seed.js.
    label: 'SBI Card spend',
    sender: 'JM-SBICRD-S',
    body: 'Your SBI Credit Card ending 9090 used for Rs.1,500.00 at Amazon on 01-Sep-26. Avl limit Rs.48,500.00',
    expect: { amount: '1500.00', type: 'expense', last4_hint: '9090', merchant: 'Amazon' },
  },
  {
    label: 'Union Bank of India debit (unverified guess — see patterns.seed.js)',
    sender: 'AD-UNIONB',
    body: 'A/c *3311 Debited for Rs:410.00 on 01-09-26 19:06:21 by Mob Bk ref no 624450441030 Avl Bal Rs:6500.00.Never Share OTP/PIN/CVV-Union Bank of India',
    expect: { amount: '410.00', type: 'expense', last4_hint: '3311' },
  },
  {
    // Real observed format (not a guess) — see lib/sms/patterns.seed.js. Note "Rs:" with a colon
    // and "*" as the mask character, both different from every other bank seeded so far.
    label: 'Union Bank of India credit',
    sender: 'AD-UNIONB',
    body: 'A/c *5780 Credited for Rs:10.00 on 01-09-2026 19:06:21 by Mob Bk ref no 624450441029 Avl Bal Rs:219.03.Never Share OTP/PIN/CVV-Union Bank of India',
    expect: { amount: '10.00', type: 'income', last4_hint: '5780' },
  },
]

describe('parseSms', () => {
  for (const c of CASES) {
    it(`extracts amount + type from a ${c.label} SMS`, () => {
      const result = parseSms(SMS_PATTERN_SEEDS, { sender: c.sender, body: c.body })
      expect(result).not.toBeNull()
      expect(result.amount).toBe(c.expect.amount)
      expect(result.type).toBe(c.expect.type)
      if (c.expect.last4_hint) expect(result.last4_hint).toBe(c.expect.last4_hint)
      if (c.expect.merchant) expect(result.merchant).toBe(c.expect.merchant)
      expect(result.sender_id).toBe(c.sender)
    })
  }

  it('falls back to the generic extractor for an unrecognized sender when the message still has a recognizable amount + direction + last4', () => {
    // Kotak Bank has no dedicated pattern — this is exactly the case the generic fallback exists
    // for (see lib/sms/parseEngine.js's parseGeneric).
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'KOTAKBK', body: 'INR 500.00 debited from your Kotak Bank A/c XX4521 towards payment to Zomato on 01-Sep-26. Avl Bal INR 5000.00' })
    expect(result).not.toBeNull()
    expect(result.amount).toBe('500.00')
    expect(result.type).toBe('expense')
    expect(result.last4_hint).toBe('4521')
  })

  it('generic extractor also matches when the direction word comes before the amount, and with a single-X last4 mask', () => {
    // The exact shape that slipped through before this was fixed — "Debit Rs.X" (bare "Debit",
    // word before the amount) instead of "Rs.X debited" (word after) — real IPPB SMS look like
    // this (see the IPPB debit case above, which has its own dedicated pattern precisely because
    // this shape is common enough to be worth a specific one); this covers an unrecognized
    // sender hitting the same shape via the fallback instead.
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'SOMEBANK', body: 'A/C X9988 Debit Rs.75.00 for UPI to merchant@ok on 01-09-26 Ref 111222333. Avl Bal Rs.500.00' })
    expect(result).not.toBeNull()
    expect(result.amount).toBe('75.00')
    expect(result.type).toBe('expense')
    expect(result.last4_hint).toBe('9988')
  })

  it('generic-matches a real SBI ATM cash withdrawal (a different SBI message shape than the UPI-debit specific pattern)', () => {
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'SBIINB', body: 'Dear SBI Customer, Rs.100 withdrawn at SBI ATM T1NW000580015 from A/cX1766 on 29Aug26 Transaction Number 163. Available Balance Rs.100.00. If not withdrawn by you, forward this SMS to 7400165218 / call 1800111109 to block your card.' })
    expect(result).not.toBeNull()
    expect(result.amount).toBe('100')
    expect(result.type).toBe('expense')
    expect(result.last4_hint).toBe('1766')
  })

  it('never treats an OTP request as a completed transaction, even one naming a real merchant/card/amount', () => {
    // Real example: reads exactly like a completed Flipkart credit-card spend to every other
    // check here — only the OTP guard stops it from becoming a pending transaction.
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'JM-SBICRD-S', body: '075906 is the OTP for Trxn. of INR 596.00 at Flipkart with your credit card ending 1037. OTP is valid for 10 mins. Do not share it with anyone - SBI Card' })
    expect(result).toBeNull()
  })

  it('does not treat "credit card"/"debit card" mentioned as a noun phrase as an actual credit/debit event', () => {
    // A bill-due reminder, not a real transaction — without the (?!\s*card) exclusion, bare
    // "credit" (from "credit card") would have matched CREDIT_WORDS and this would have
    // incorrectly become a pending ₹2,000 income transaction.
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'AXISBK', body: 'Rs.2,000.00 is the total due on your credit card ending 4521 for this billing cycle. Pay by 05-09-26.' })
    expect(result).toBeNull()
  })

  it('does not generic-match a real Canara Bank fraud-alert format with no merchant and only 3 digits of account shown', () => {
    // Real example — only 3 digits ("XXX601") are ever revealed in this Canara format, never a
    // full last4, so this correctly can't resolve one; account matching for it happens entirely
    // via genericCrud.js's bank-name fallback (outside parseEngine's own scope to test).
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'CANBNK', body: 'An amount of INR 300.00 has been DEBITED to your account XXX601 on 20/06/2026. Total Avail.bal INR 63,745.32.Dial 1930 to report cyber fraud - Canara Bank' })
    expect(result).toBeNull()
  })

  it('does not generic-match a message with no last4 to cross-check — no evidence it is actually the user\'s own transaction', () => {
    // A promotional text that happens to mention an amount and "credited" but carries no
    // account/card reference at all — exactly the false-positive case the last4 requirement
    // (lib/server/genericCrud.js) exists to keep out of the Pending queue.
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'PROMO', body: 'Cashback of Rs.50 has been credited to your wallet. T&C apply, no refund.' })
    expect(result).toBeNull()
  })

  it('does not generic-match a message with no amount/direction wording at all', () => {
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'UNKNOWN', body: 'Your OTP is 483920. Do not share it with anyone.' })
    expect(result).toBeNull()
  })

  it('returns null for a recognized sender whose message does not match its own expected format, or anything generic', () => {
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'HDFCBK', body: 'Your OTP is 483920. Do not share it with anyone.' })
    expect(result).toBeNull()
  })

  it('returns null when sender or body is missing', () => {
    expect(parseSms(SMS_PATTERN_SEEDS, { sender: '', body: 'Rs 500.00 debited' })).toBeNull()
    expect(parseSms(SMS_PATTERN_SEEDS, { sender: 'HDFCBK', body: '' })).toBeNull()
  })

  it('ignores inactive patterns (isolated from the generic fallback, which is tested separately above)', () => {
    const patterns = SMS_PATTERN_SEEDS
      .filter((p) => !p.is_generic)
      .map((p) => (p.sender_id_pattern === 'HDFCBK$' ? { ...p, is_active: false } : p))
    const result = parseSms(patterns, { sender: 'HDFCBK', body: 'Rs 500.00 debited from A/c XX4521 on 01-Sep-26 to VPA rahul@okhdfcbank Ref No 402312345678.' })
    expect(result).toBeNull()
  })

  it('an inactive generic fallback is not used either', () => {
    const patterns = SMS_PATTERN_SEEDS.map((p) => (p.is_generic ? { ...p, is_active: false } : p))
    const result = parseSms(patterns, { sender: 'KOTAKBK', body: 'INR 500.00 debited from your Kotak Bank A/c XX4521 towards payment to Zomato on 01-Sep-26.' })
    expect(result).toBeNull()
  })

  it('prefers the higher-priority pattern when several patterns match the same sender', () => {
    const patterns = [
      { id: 'low', sender_id_pattern: 'HDFCBK$', message_regex: String.raw`Rs (?<amount>[\d.]+)`, field_mapping: { amount: { from: 'amount' }, type: { literal: 'expense' } }, priority: 1 },
      { id: 'high', sender_id_pattern: 'HDFCBK$', message_regex: String.raw`Rs (?<amount>[\d.]+) debited`, field_mapping: { amount: { from: 'amount' }, type: { literal: 'expense' } }, priority: 100 },
    ]
    const result = parseSms(patterns, { sender: 'HDFCBK', body: 'Rs 500.00 debited from A/c XX4521' })
    expect(result.matched_pattern_id).toBe('high')
  })
})
