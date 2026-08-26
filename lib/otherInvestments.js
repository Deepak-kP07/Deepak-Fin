// Physical/alternative assets (gold jewelry, silver, land, ...) have no live price feed, so
// "current value" can only ever be a projection: the last known value (a real revaluation the
// user entered, or the original purchase if there's never been one) compounded forward at the
// expected CAGR from whenever that baseline was set. Recomputed fresh on every read — it drifts
// forward with today's date automatically, never goes stale the way a hand-typed number would.
//
// Bonds are the one category that doesn't fit that model — a bond isn't a growth projection,
// it's a known contract: you paid purchase_value and are guaranteed face_value at maturity_date
// (loosely; ignores default risk, which is out of scope for a personal tracker). So instead of
// compounding, its value straight-line accretes from purchase_value up to face_value between
// purchase_date and maturity_date, landing exactly on face_value once matured. Coupon interest
// payments aren't modeled as cash flows (no recurring-income engine here) — interest_frequency
// is informational display only, not part of this calculation.
export function currentValueOf(item) {
  if (item.category === 'bond') return bondCurrentValue(item)
  const baseValue = item.last_known_value != null ? Number(item.last_known_value) : Number(item.purchase_value)
  const baseDate = item.last_known_value_date || item.purchase_date
  const years = Math.max(0, (Date.now() - new Date(baseDate).getTime()) / (365.25 * 86400000))
  const rate = Number(item.expected_cagr_pct || 0) / 100
  return baseValue * Math.pow(1 + rate, years)
}

function bondCurrentValue(item) {
  const purchaseValue = Number(item.purchase_value || 0)
  const faceValue = item.face_value != null ? Number(item.face_value) : purchaseValue
  if (!item.maturity_date) return purchaseValue
  const start = new Date(item.purchase_date).getTime()
  const end = new Date(item.maturity_date).getTime()
  const now = Date.now()
  if (now >= end) return faceValue
  if (now <= start || end <= start) return purchaseValue
  const progress = (now - start) / (end - start)
  return purchaseValue + (faceValue - purchaseValue) * progress
}

export const OTHER_INVESTMENT_CATEGORIES = [
  { value: 'gold', label: 'Gold jewelry / physical gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'land', label: 'Land / real estate' },
  { value: 'bond', label: 'Bond' },
  { value: 'other', label: 'Other' },
]

export const BOND_INTEREST_FREQUENCIES = [
  { value: 'annual', label: 'Annual' },
  { value: 'semi_annual', label: 'Semi-annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'cumulative', label: 'Cumulative (paid at maturity)' },
]

// Shared category badge colors — used on both a portfolio's own "Other investments" cards and
// the cross-portfolio combined view, so the two never drift apart the way the Kite
// token-freshness window did when it lived as separate copies in two files.
export const CATEGORY_BADGE_STYLE = {
  gold: 'bg-amber-400/15 text-amber-200 light:text-amber-700',
  silver: 'bg-slate-300/15 text-slate-200',
  land: 'bg-lime-400/15 text-lime-200',
  bond: 'bg-indigo-400/15 text-indigo-200',
  other: 'bg-rose-400/15 text-rose-200 light:text-rose-700',
}
