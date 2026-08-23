import { categoryBreakdown, monthLabel, planTotals } from '@/lib/budgets'

const HEADERS = ['Month', 'Type', 'Category', 'Budgeted', 'Spent', '% used', 'Status']

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// One flat CSV across every monthly plan (an "Overall" row plus one row per category line) and
// every yearly budget — same shape as lib/exportFamilyCompany.js, so the export always matches
// what's on screen.
export function buildBudgetsExportCsv({ budgetMonths, budgetMonthCategories, yearlyBudgets, categories, transactions }) {
  const rows = []
  for (const plan of budgetMonths) {
    const label = monthLabel(plan.year, plan.month)
    const totals = planTotals(plan, transactions)
    rows.push([label, 'Overall', '—', totals.budgeted.toFixed(2), totals.spent.toFixed(2), `${totals.pct}%`, plan.status])
    const lines = budgetMonthCategories.filter((l) => l.budget_month_id === plan.id)
    for (const b of categoryBreakdown(plan, lines, categories, transactions)) {
      rows.push([label, 'Category', b.category?.name || 'Category', b.budgeted.toFixed(2), b.spent.toFixed(2), `${b.pct}%`, plan.status])
    }
  }
  const now = new Date()
  for (const b of yearlyBudgets) {
    const cat = categories.find((c) => c.id === b.category_id)
    const limit = Number(b.amount || 0)
    const spent = transactions.filter((t) => t.type === 'expense' && t.category_id === b.category_id && new Date(t.date).getFullYear() === now.getFullYear()).reduce((s, t) => s + Number(t.amount || 0), 0)
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
    rows.push([`${now.getFullYear()} (yearly)`, 'Category', cat?.name || 'Category', limit.toFixed(2), spent.toFixed(2), `${pct}%`, 'yearly'])
  }
  return [HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

export function downloadBudgetsExport(payload, dateStamp) {
  const csv = buildBudgetsExportCsv(payload)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `budgets-${dateStamp}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
