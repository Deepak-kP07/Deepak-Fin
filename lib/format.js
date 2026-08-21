import { accrueInterest, daysBetween } from '@/lib/amortization'

export const money = (value) => {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : ''
  return `${sign}₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))}`
}

export const money2 = (value) => `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(value || 0)))}`

export const maskedMoney = (value, showMoney) => (showMoney ? money(value) : '••••')

export const monthName = (d) => new Date(d).toLocaleString('en-IN', { month: 'short' })

export const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}-${dt.toLocaleString('en-IN', { month: 'short' })}-${dt.getFullYear()}`
}

export const formatDateTime = (d, t) => {
  const base = formatDate(d)
  if (!t) return base
  const [h, m] = String(t).slice(0, 5).split(':')
  if (!h || !m) return base
  const hn = parseInt(h, 10); const ampm = hn >= 12 ? 'PM' : 'AM'; const h12 = ((hn + 11) % 12) + 1
  return `${base} (${h12}:${m} ${ampm})`
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const monthAbbr = (dateStr) => MONTH_NAMES[Number((dateStr || '').slice(5, 7)) - 1]?.slice(0, 3) || ''

// A lender's "outstanding" isn't frozen between payments — interest keeps accruing on it every
// single day, so what you'd owe to close the loan out grows a little day over day until your
// next payment resets the clock. The stored `outstanding` is only current as of the last real
// payment; this adds today's not-yet-billed interest on top so the figure matches what the
// lender's own app would show right now. Sync/adjustment entries don't reset this clock — they
// correct the principal baseline, not the date interest was last actually paid.
export const liveOutstanding = (loan, payments) => {
  const outstanding = Number(loan.outstanding || 0)
  if (loan.status === 'closed' || outstanding <= 0) return outstanding
  const realPayments = (payments || []).filter((p) => p.type !== 'adjustment')
  const lastDate = realPayments.length > 0 ? realPayments.reduce((latest, p) => (p.payment_date > latest ? p.payment_date : latest), realPayments[0].payment_date) : (loan.start_date || todayISO())
  const days = Math.max(0, daysBetween(lastDate, todayISO()))
  return outstanding + accrueInterest(outstanding, Number(loan.interest_rate || 0), days)
}

export const paymentTypeLabel = (p) => {
  if (p.type === 'adjustment') return 'Synced with lender'
  const modeSuffix = p.prepay_mode ? ` · ${p.prepay_mode === 'reduce_emi' ? 'Reduce EMI' : 'Reduce tenure'}` : ''
  if (p.type === 'emi') return p.prepay_mode ? `EMI + prepayment${modeSuffix}` : 'EMI'
  // A "Prepayment" that ended up with no genuine excess (interest owed ate all of it, or it
  // exactly matched a standard EMI) has no reduce-mode to speak of — don't imply one.
  return p.prepay_mode ? `Prepayment${modeSuffix}` : 'Prepayment'
}

export function addMonthsToDate(dateStr, n) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function relativeTime(iso) {
  if (!iso) return null
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
