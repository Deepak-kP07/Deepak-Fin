'use client'

import { CsvBulkImport } from '@/components/shared/CsvBulkImport'
import { formatDate, money, todayISO } from '@/lib/format'

const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true, detect: (l) => l.includes('desc') || l === 'narration' || l === 'particulars' },
  { key: 'amount', label: 'Amount', required: true, detect: (l) => l === 'amount' || l.includes('amount') || l === 'value', hint: "Always stored as a positive number — whether a row counts as income or expense comes from the category, not a plus/minus sign." },
  { key: 'category', label: 'Category', required: false, detect: (l) => l.includes('categ'), hint: 'Match this to one of your category names to auto-fill income vs. expense. If your file only marks the type (e.g. a column of "Income"/"Expense"/"Capital"), map that here instead — those are picked up automatically.' },
  { key: 'paid_party', label: 'Paid to / Received from', required: false, detect: (l) => l.includes('paid') || l.includes('received') || l.includes('party') },
  { key: 'notes', label: 'Notes', required: false, detect: (l) => l.includes('note') },
]

const TEMPLATE_HEADERS = ['date', 'category', 'description', 'amount', 'paid_party', 'notes']
const TEMPLATE_EXAMPLE = '15/01/2026,income,January salary,50000,Acme Pvt Ltd,\n18/01/2026,expense,Weekly groceries,2400,BigBasket,'

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_EXAMPLE}\n`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'family-company-entries-template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// The single "Category" column has to double as the type signal too, since asking for a separate
// "Type" mapping just to hold literal "Income"/"Expense"/"Capital" values (rather than a real
// category name) is exactly what made this confusing — some banks/exports genuinely only carry a
// column like that. So this first checks whether the mapped text IS a type keyword; only if it
// isn't does it try to match it against a real category name (any type — whichever the matched
// category itself is — since there's no separate "type" input left to scope the search with).
function detectTypeKeyword(text) {
  if (text.includes('income') || text === 'cr' || text === 'credit') return 'income'
  if (text.includes('capital')) return 'capital'
  if (text.includes('expense') || text === 'dr' || text === 'debit') return 'expense'
  return null
}

// No per-row "create if missing" here — silently minting a category per typo'd CSV value would
// pollute the real category list; an unmatched name just leaves the entry uncategorized instead.
function findCategoryByName(name, categories) {
  if (!name) return null
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null
}

export function MoneyProfileBulkImport({ open, onClose, onImported, profile, categories = [], toast }) {
  if (!profile) return null

  const parseRow = (r, mapping) => {
    const rawAmount = String(r[mapping.amount] || '').replace(/[,₹\s]/g, '')
    const amount = Number(rawAmount)
    const description = String(r[mapping.description] || '').trim().slice(0, 200)
    const rawCategory = mapping.category ? String(r[mapping.category] || '').trim() : ''
    const keywordType = detectTypeKeyword(rawCategory.toLowerCase())
    const matchedCategory = keywordType ? null : findCategoryByName(rawCategory, categories)
    const entry_type = keywordType || matchedCategory?.type || 'expense'
    let date = r[mapping.date] || todayISO()
    const m = String(date).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; date = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
    const category_id = matchedCategory?.id || null
    const categoryName = keywordType ? null : (rawCategory || null)
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
      uploadHint="Columns: date, category (or type — income/capital/expense), description, amount, paid to / received from"
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
          <td className="px-3 py-2 text-slate-400 light:text-slate-500">{r.valid ? formatDate(r.date) : '—'}</td>
          <td className="px-3 py-2 capitalize text-slate-400 light:text-slate-500">{r.entry_type}</td>
          <td className="px-3 py-2 text-slate-400 light:text-slate-500">{r.categoryName || '—'}</td>
          <td className="px-3 py-2 text-slate-300 light:text-slate-700">{r.description || '—'}{!r.valid && <span className="ml-2 rounded-full bg-rose-300/15 px-1.5 py-0.5 text-[10px] text-rose-200 light:text-rose-700">invalid</span>}</td>
          <td className="px-3 py-2 text-right text-slate-300 light:text-slate-700">{r.valid ? money(r.amount) : '—'}</td>
        </>
      )}
      belowTable={(toImport) => {
        const net = toImport.reduce((s, r) => s + (r.entry_type === 'expense' ? -r.amount : r.amount), 0)
        return <div className="mt-3 text-xs text-slate-400 light:text-slate-500">Net effect on balance: <span className="font-semibold text-white light:text-slate-900">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</span></div>
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
