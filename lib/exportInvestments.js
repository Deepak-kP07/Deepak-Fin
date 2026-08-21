import { currentValueOf } from '@/lib/otherInvestments'

const HEADERS = ['Portfolio', 'Type', 'Category', 'Name', 'Exchange / Folio', 'Quantity / Units', 'Buy Price / NAV / Purchase Value', 'Current Price / NAV', 'Invested', 'Current Value', 'P&L', 'P&L %', 'Details']

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// One flat CSV across every portfolio and every asset type (holdings, SIPs, other investments
// including bonds) — a single downloadable snapshot of the whole investments module, not scoped
// to one portfolio. Numbers are computed the same way each view already displays them, so the
// export always matches what's on screen.
export function buildInvestmentsExportCsv({ portfolios, holdings, sips, otherInvestments }) {
  const portfolioName = (id) => portfolios.find((p) => p.id === id)?.name || ''
  const rows = []

  holdings.forEach((h) => {
    const invested = Number(h.qty) * Number(h.avg_buy_price)
    const current = Number(h.qty) * Number(h.current_price || h.avg_buy_price)
    const pnl = current - invested
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
    rows.push([
      portfolioName(h.portfolio_id), 'Holding', h.asset_type === 'gold' ? 'Gold' : 'Equity', h.symbol, h.exchange,
      h.qty, h.avg_buy_price, h.current_price, invested.toFixed(2), current.toFixed(2), pnl.toFixed(2), pnlPct.toFixed(2),
      h.company_name || '',
    ])
  })

  sips.forEach((s) => {
    const invested = Number(s.units_held) * Number(s.average_price ?? s.nav)
    const current = Number(s.units_held) * Number(s.nav)
    const pnl = current - invested
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
    rows.push([
      s.portfolio_id ? portfolioName(s.portfolio_id) : '', 'SIP', 'Mutual Fund', s.fund_name, s.folio_number || '',
      s.units_held, s.average_price ?? '', s.nav, invested.toFixed(2), current.toFixed(2), pnl.toFixed(2), pnlPct.toFixed(2),
      s.monthly_amount > 0 ? `Monthly ₹${s.monthly_amount}` : '',
    ])
  })

  otherInvestments.forEach((o) => {
    const invested = Number(o.purchase_value)
    const current = currentValueOf(o)
    const pnl = current - invested
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
    const details = o.category === 'bond'
      ? `Face ${o.face_value ?? '—'} · Matures ${o.maturity_date || '—'}${o.coupon_rate_pct != null ? ` · ${o.coupon_rate_pct}% coupon` : ''}`
      : `${o.expected_cagr_pct}% CAGR${o.last_known_value != null ? ` · revalued ${o.last_known_value_date}` : ''}`
    rows.push([
      portfolioName(o.portfolio_id), 'Other investment', o.category, o.name, '',
      '', invested.toFixed(2), '', invested.toFixed(2), current.toFixed(2), pnl.toFixed(2), pnlPct.toFixed(2),
      details,
    ])
  })

  return [HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

export function downloadInvestmentsExport(payload, dateStamp) {
  const csv = buildInvestmentsExportCsv(payload)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `investments-export-${dateStamp}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
