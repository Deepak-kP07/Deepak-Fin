// Same formatting as the web app (lib/format.js there) — keep the two in step.
export const money = (value) => {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : ''
  return `${sign}₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))}`
}

export const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Local calendar date as YYYY-MM-DD (toISOString would shift to UTC and roll back a day in IST).
export const dateToLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayISO = () => dateToLocalISO(new Date())
export const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export function dayLabel(iso) {
  const today = todayISO()
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (iso === today) return 'Today'
  if (iso === dateToLocalISO(y)) return 'Yesterday'
  const [yr, m, d] = iso.split('-').map(Number)
  const sameYear = yr === new Date().getFullYear()
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)}${sameYear ? '' : ` ${yr}`}`
}

export function timeLabel(t) {
  if (!t) return ''
  const [h, m] = String(t).slice(0, 5).split(':')
  const hn = parseInt(h, 10)
  if (Number.isNaN(hn)) return ''
  return `${((hn + 11) % 12) + 1}:${m} ${hn >= 12 ? 'PM' : 'AM'}`
}
