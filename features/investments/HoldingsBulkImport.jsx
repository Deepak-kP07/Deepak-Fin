'use client'

import { CsvBulkImport } from '@/components/shared/CsvBulkImport'
import { money, money2 } from '@/lib/format'
import { detectAssetType } from '@/lib/investmentAssetType'

const FIELDS = [
  { key: 'symbol', label: 'Symbol', required: true },
  { key: 'exchange', label: 'Exchange', required: false },
  { key: 'qty', label: 'Quantity', required: true, detect: (h) => h.includes('qty') || h.includes('quantity') },
  { key: 'avg_buy_price', label: 'Avg buy price', required: true, detect: (h) => h.includes('avg_buy_price') || h.includes('average_price') || h.includes('avg buy') || h.includes('avg price') || h.includes('avg trading price') },
  { key: 'current_price', label: 'Current price', required: false, detect: (h) => h.includes('current_price') || h.includes('current price') || h.includes('ltp') },
  { key: 'company_name', label: 'Company name', required: false, detect: (h) => h.includes('company') },
]

const TEMPLATE_HEADERS = ['symbol', 'exchange', 'qty', 'avg_buy_price', 'current_price', 'company_name']
const TEMPLATE_EXAMPLE = 'RELIANCE,NSE,10,2450.50,2610.00,Reliance Industries\nHDFCBANK,NSE,25,1520.00,1548.75,HDFC Bank'

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE}\n`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'holdings-template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function parseRow(r, mapping) {
  const symbol = String(r[mapping.symbol] || '').trim().toUpperCase()
  const exchange = (mapping.exchange ? String(r[mapping.exchange] || '').trim().toUpperCase() : '') || 'NSE'
  const qty = Number(String(r[mapping.qty] || '').replace(/,/g, ''))
  const avg_buy_price = Number(String(r[mapping.avg_buy_price] || '').replace(/,/g, ''))
  const current_price = mapping.current_price && r[mapping.current_price] ? Number(String(r[mapping.current_price]).replace(/,/g, '')) : avg_buy_price
  const company_name = mapping.company_name ? String(r[mapping.company_name] || '').trim() || null : null
  const valid = !!symbol && qty > 0 && avg_buy_price > 0
  return { valid, symbol, exchange, qty, avg_buy_price, current_price, company_name, asset_type: detectAssetType(symbol), cost: qty * avg_buy_price }
}

export function HoldingsBulkImport({ open, onClose, onImported, portfolio, toast }) {
  if (!portfolio) return null

  return (
    <CsvBulkImport
      open={open}
      onClose={onClose}
      onImported={onImported}
      toast={toast}
      title="Bulk import holdings"
      subtitle={`Into ${portfolio.name} · review before importing`}
      itemLabel="holding"
      uploadHint="Columns: symbol, exchange, qty, avg buy price, current price (optional), company name (optional)"
      fields={FIELDS}
      parseRow={parseRow}
      invalidLabel="invalid (missing symbol/qty/price), will be skipped"
      onDownloadTemplate={downloadTemplate}
      renderTableHead={() => (
        <>
          <th className="px-3 py-2 text-left">Symbol</th>
          <th className="px-3 py-2 text-left">Exch</th>
          <th className="px-3 py-2 text-right">Qty</th>
          <th className="px-3 py-2 text-right">Avg buy</th>
          <th className="px-3 py-2 text-right">Current</th>
          <th className="px-3 py-2 text-right">Cost</th>
        </>
      )}
      renderTableRow={(r) => (
        <>
          <td className="px-3 py-2 text-white light:text-slate-900">
            {r.symbol || '—'}
            {r.asset_type === 'gold' && <span className="ml-2 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200 light:text-amber-700">Gold</span>}
            {!r.valid && <span className="ml-2 rounded-full bg-rose-300/15 px-1.5 py-0.5 text-[10px] text-rose-200 light:text-rose-700">invalid</span>}
          </td>
          <td className="px-3 py-2 text-slate-400 light:text-slate-500">{r.exchange}</td>
          <td className="px-3 py-2 text-right text-slate-300 light:text-slate-700">{r.qty || '—'}</td>
          <td className="px-3 py-2 text-right text-slate-300 light:text-slate-700">{r.avg_buy_price ? money2(r.avg_buy_price) : '—'}</td>
          <td className="px-3 py-2 text-right text-slate-300 light:text-slate-700">{r.current_price ? money2(r.current_price) : '—'}</td>
          <td className="px-3 py-2 text-right text-slate-400 light:text-slate-500">{r.valid ? money2(r.cost) : '—'}</td>
        </>
      )}
      belowTable={(toImport) => {
        const totalCost = toImport.reduce((s, r) => s + r.cost, 0)
        return (
          // Imported holdings are recorded as already-owned (source: 'import'), so unlike
          // "+ Holding" they don't spend this portfolio's cash — this is just an informational
          // total, not a cash-available check.
          <div className="mt-3 text-xs text-slate-400 light:text-slate-500">Total value: <span className="font-semibold text-white light:text-slate-900">{money(totalCost)}</span></div>
        )
      }}
      onImportRow={async (r) => {
        const { valid, cost, ...payload } = r
        const res = await fetch('/api/finance/holdings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          // source: 'import' — these are holdings you already own elsewhere, not a purchase
          // funded by this portfolio's cash, so they're exempt from the cash_balance check
          // (see drizzle/0013_holdings_import_source_no_cash.sql).
          body: JSON.stringify({ ...payload, portfolio_id: portfolio.id, source: 'import', last_price_updated_at: new Date().toISOString() }),
        })
        return res.ok
      }}
    />
  )
}
