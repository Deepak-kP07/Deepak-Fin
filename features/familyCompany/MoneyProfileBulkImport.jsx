'use client'

import { CsvBulkImport } from '@/components/shared/CsvBulkImport'
import { formatDate, money, todayISO } from '@/lib/format'

const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true, detect: (l) => l.includes('desc') || l === 'narration' || l === 'particulars' },
  { key: 'amount', label: 'Amount', required: true, detect: (l) => l === 'amount' || l.includes('amount') || l === 'value' },
  { key: 'entry_type', label: 'Type', required: false, detect: (l) => l === 'type' || l === 'entry_type' || l === 'kind' },
  { key: 'category', label: 'Category', required: false, detect: (l) => l.includes('categ') },
  { key: 'paid_party', label: 'Paid to / Received from', required: false, detect: (l) => l.includes('paid') || l.includes('received') || l.includes('party') },
  { key: 'notes', label: 'Notes', required: false, detect: (l) => l.includes('note') },
]

const TEMPLATE_HEADERS = ['date', 'entry_type', 'category', 'description', 'amount', 'paid_party', 'notes']
const TEMPLATE_EXAMPLE = '15/01/2026,income,Salary,January salary,50000,Acme Pvt Ltd,\n18/01/2026,expense,Groceries,Weekly groceries,2400,BigBasket,'

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE}\n`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'family-company-entries-template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Matches a CSV row's free-text category name against the real category list (case-insensitive,
// scoped to the right income/expense type) — there's no per-row "create if missing" here, since
// silently minting a category per typo'd CSV value would pollute the real category list; an
// unmatched name just leaves the entry uncategorized instead.
function resolveCategoryId(name, entryType, categories) {
  if (!name) return null
  const type = entryType === 'expense' ? 'expense' : 'income'
  const match = categories.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())
  return match?.id || null
}

export function MoneyProfileBulkImport({ open, onClose, onImported, profile, categories = [], toast }) {
  if (!profile) return null

  const parseRow = (r, mapping) => {
    const rawAmount = String(r[mapping.amount] || '').replace(/[,₹\s]/g, '')
    const amount = Number(rawAmount)
    const description = String(r[mapping.description] || '').trim().slice(0, 200)
    const rawType = (mapping.entry_type ? String(r[mapping.entry_type] || '').toLowerCase() : '')
    let entry_type = 'expense'
    if (rawType.includes('income') || rawType === 'cr' || rawType === 'credit') entry_type = 'income'
    else if (rawType.includes('capital')) entry_type = 'capital'
    else if (rawType.includes('expense') || rawType === 'dr' || rawType === 'debit') entry_type = 'expense'
    else if (rawAmount.startsWith('-')) entry_type = 'expense'
    let date = r[mapping.date] || todayISO()
    const m = String(date).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; date = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
    const categoryName = mapping.category ? String(r[mapping.category] || '').trim() || null : null
    const category_id = resolveCategoryId(categoryName, entry_type, categories)
    const paid_party = mapping.paid_party ? String(r[mapping.paid_party] || '').trim() || null : null
    const notes = mapping.notes ? String(r[mapping.notes] || '').trim() || null : null
    const valid = !!description && !!amount && !isNaN(amount)
    return { valid, date, entry_type, category_id, categoryName, description, amount: Math.abs(amount), paid_party, notes }
  }

  return (
    <CsvBulkImport
      open={open}
      onClose={onClose}
      onImported={onImported}
      toast={toast}
      title="Bulk import entries"
      subtitle={`Into ${profile.name} · review before importing`}
      itemLabel="entry"
      uploadHint="Columns: date, type (income/capital/expense), category, description, amount, paid to / received from"
      fields={FIELDS}
      parseRow={parseRow}
      invalidLabel="missing description/amount, will be skipped"
      onDownloadTemplate={downloadTemplate}
      renderTableHead={() => (
        <>
          <th className="px-3 py-2 text-left">Date</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-left">Category</th>
          <th className="px-3 py-2 text-left">Description</th>
          <th className="px-3 py-2 text-right">Amount</th>
        </>
      )}
      renderTableRow={(r) => (
        <>
          <td className="px-3 py-2 text-slate-400">{r.valid ? formatDate(r.date) : '—'}</td>
          <td className="px-3 py-2 capitalize text-slate-400">{r.entry_type}</td>
          <td className="px-3 py-2 text-slate-400">{r.categoryName || '—'}</td>
          <td className="px-3 py-2 text-slate-300">{r.description || '—'}{!r.valid && <span className="ml-2 rounded-full bg-rose-300/15 px-1.5 py-0.5 text-[10px] text-rose-200">invalid</span>}</td>
          <td className="px-3 py-2 text-right text-slate-300">{r.valid ? money(r.amount) : '—'}</td>
        </>
      )}
      belowTable={(toImport) => {
        const net = toImport.reduce((s, r) => s + (r.entry_type === 'expense' ? -r.amount : r.amount), 0)
        return <div className="mt-3 text-xs text-slate-400">Net effect on balance: <span className="font-semibold text-white">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</span></div>
      }}
      onImportRow={async (r) => {
        const { valid, categoryName, ...payload } = r
        const res = await fetch('/api/finance/money_profile_entries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, profile_id: profile.id }),
        })
        return res.ok
      }}
    />
  )
}
