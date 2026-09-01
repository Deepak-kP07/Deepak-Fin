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
    label: 'PhonePe UPI debit',
    sender: 'PHONEPE',
    body: 'Payment of Rs.240 made to Swiggy via PhonePe UPI. Ref: 402312345678',
    expect: { amount: '240', type: 'expense', merchant: 'Swiggy' },
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

  it('returns null for an unrecognized sender', () => {
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'UNKNOWN', body: 'Rs 500.00 debited from A/c XX4521' })
    expect(result).toBeNull()
  })

  it('returns null for a recognized sender whose message does not match the expected format', () => {
    const result = parseSms(SMS_PATTERN_SEEDS, { sender: 'HDFCBK', body: 'Your OTP is 483920. Do not share it with anyone.' })
    expect(result).toBeNull()
  })

  it('returns null when sender or body is missing', () => {
    expect(parseSms(SMS_PATTERN_SEEDS, { sender: '', body: 'Rs 500.00 debited' })).toBeNull()
    expect(parseSms(SMS_PATTERN_SEEDS, { sender: 'HDFCBK', body: '' })).toBeNull()
  })

  it('ignores inactive patterns', () => {
    const patterns = SMS_PATTERN_SEEDS.map((p) => (p.sender_id_pattern === 'HDFCBK$' ? { ...p, is_active: false } : p))
    const result = parseSms(patterns, { sender: 'HDFCBK', body: 'Rs 500.00 debited from A/c XX4521 on 01-Sep-26 to VPA rahul@okhdfcbank Ref No 402312345678.' })
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
