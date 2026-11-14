import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, ListChecks, Lock,
  LockOpen, Paperclip, PieChart, Repeat, Search, Tag, Trash2, Wallet, X,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { Select } from '../ui/Select'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { BottomSheet } from '../ui/BottomSheet'
import { EmptyState } from '../ui/EmptyState'
import { DonutChart } from '../ui/DonutChart'
import { CreditCardBillAlert } from '../ui/CreditCardBillAlert'
import { usePinDialog } from '../ui/PinDialog'
import { DateField } from '../components/forms'
import { tw } from '../lib/tw'
import { api } from '../lib/api'
import { MONTH_NAMES, capitalizeFirst, money } from '../lib/format'
import { getTransactionIcon } from '../lib/categoryIcons'
import { hiddenTransferGroups, isHiddenTx, useHiddenTx } from '../state/HiddenTx'
import { useTheme } from '../state/ThemeProvider'

// Native port of TransactionsView (app/page.js), phone layout: month pill (tap the month for a
// custom range), hidden-transactions lock, amounts toggle, search + Filters sheet (type, account,
// category, chart view, export), day-grouped list with daily totals, long-press multi-select with
// bulk delete, and the category chart (Overall / Income / Expense).
const formatDate = (d) => { if (!d) return ''; const dt = new Date(`${d}T00:00:00`); return `${String(dt.getDate()).padStart(2, '0')}-${MONTH_NAMES[dt.getMonth()].slice(0, 3)}-${dt.getFullYear()}` }

function rotateHue(hex, deg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60
  }
  h = (h + deg) % 360
  const k = (x) => (x + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (x) => Math.round((l - a * Math.max(-1, Math.min(k(x) - 3, Math.min(9 - k(x), 1)))) * 255)
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function TransactionsView({ data, showMoney, onToggleMoney, onOpenTxForm, onEditTx, onDeleteTxBulk, onPayCardBill, onImport, onOpenRecurring }) {
  const { accentColor } = useTheme()
  const { transactions, accounts, categories, credit_cards: creditCards = [] } = data
  const [query, setQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [type, setType] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [chartView, setChartView] = useState(false)
  const [catView, setCatView] = useState('all')
  const [activeSliceIndex, setActiveSliceIndex] = useState(-1)
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [customRange, setCustomRange] = useState(null)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [rangeDraft, setRangeDraft] = useState({ start: '', end: '' })
  const [page, setPage] = useState(0)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const activeFilterCount = [type !== 'all', accountId !== 'all', categoryId !== 'all'].filter(Boolean).length
  const { revealed: hiddenRevealed, unlock: unlockHidden, lock: lockHidden } = useHiddenTx()
  const pinDialog = usePinDialog()
  useEffect(() => { setPage(0) }, [type, accountId, categoryId, customRange, monthCursor, query])

  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }
  const handleRowTap = (t) => (selectMode ? toggleSelect(t.id) : onEditTx(t))
  const handleLongPress = (t) => { if (!selectMode) { setSelectMode(true); toggleSelect(t.id) } }
  const handleBulkDelete = async () => { if (await onDeleteTxBulk([...selectedIds])) exitSelectMode() }
  const shiftMonth = (delta) => { setCustomRange(null); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const resolveSource = (t) => accounts.find((a) => a.id === t.account_id) || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id) : null)

  const hiddenGroups = useMemo(() => hiddenTransferGroups(transactions), [transactions])
  const scheduledTx = data.scheduled_transactions || []
  const inPeriodAll = useMemo(() => [...transactions, ...scheduledTx].filter((t) => {
    if (type !== 'all' && t.type !== type) return false
    if (accountId !== 'all') {
      if (accountId.startsWith('cc:')) { if (!(t.linked_module === 'credit_card' && t.linked_module_id === accountId.slice(3))) return false }
      else if (t.account_id !== accountId) return false
    }
    if (categoryId !== 'all' && t.category_id !== categoryId) return false
    if (customRange) { if (t.date < customRange.start || t.date > customRange.end) return false }
    else { const d = new Date(`${t.date}T00:00:00`); if (d.getFullYear() !== monthCursor.year || d.getMonth() !== monthCursor.month) return false }
    return true
  }), [transactions, scheduledTx, type, accountId, categoryId, customRange, monthCursor])
  const inPeriod = useMemo(() => inPeriodAll.filter((t) => t.status !== 'scheduled'), [inPeriodAll])
  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return inPeriodAll.filter((t) => {
      if (!hiddenRevealed && isHiddenTx(t, hiddenGroups)) return false
      if (!q) return true
      const acc = resolveSource(t)
      const cat = categories.find((c) => c.id === t.category_id)
      return `${t.description || ''} ${t.notes || ''} ${t.type || ''} ${acc?.name || ''} ${cat?.name || ''}`.toLowerCase().includes(q)
    })
  }, [inPeriodAll, hiddenRevealed, hiddenGroups, query, accounts, creditCards, categories])
  const chartSource = query ? visible.filter((t) => t.status !== 'scheduled') : inPeriod
  const sorted = useMemo(() => [...visible].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)), [visible])
  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const dayTotals = useMemo(() => {
    const map = {}
    for (const t of sorted) {
      if (t.type === 'transfer' || t.status === 'scheduled') continue
      const bucket = map[t.date] || { income: 0, expense: 0 }
      if (t.type === 'income') bucket.income += Number(t.amount || 0); else bucket.expense += Number(t.amount || 0)
      map[t.date] = bucket
    }
    return map
  }, [sorted])
  const dayHeaderParts = (dateStr) => { const d = new Date(`${dateStr}T00:00:00`); return { weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate(), month: d.toLocaleDateString('en-IN', { month: 'short' }) } }

  const categoryBreakdown = useMemo(() => {
    const byCat = {}
    chartSource.filter((t) => t.type !== 'transfer' && (catView === 'all' || t.type === catView)).forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const key = cat?.id || 'uncat'
      if (!byCat[key]) byCat[key] = { name: cat?.name || 'Uncategorised', value: 0, color: cat?.color || '#64748b', type: cat?.type || t.type }
      byCat[key].value += Number(t.amount || 0)
    })
    let rows = Object.values(byCat).sort((a, b) => b.value - a.value)
    if (catView === 'all') {
      const counts = {}; rows.forEach((r) => { counts[r.name] = (counts[r.name] || 0) + 1 })
      rows = rows.map((r) => (counts[r.name] > 1 ? { ...r, name: `${r.name} (${r.type})` } : r))
    }
    const used = new Set()
    return rows.map((e) => { let color = e.color, n = 0; while (used.has(color) && n < 8) { color = rotateHue(color, 40); n++ } used.add(color); return { ...e, color } })
  }, [chartSource, categories, catView])

  // Same columns as the web export; written to a real file and handed to the share sheet (save to
  // Files/Drive, mail, WhatsApp…).
  const shareFile = async (name, write, mimeType) => {
    try {
      const file = new File(Paths.cache, name)
      if (file.exists) file.delete()
      await write(file)
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name })
    } catch (e) { Alert.alert('Export failed', e.message) }
  }
  const exportCsv = async () => {
    const csv = ['Date,Description,Type,Amount,Category,Account,Notes', ...sorted.map((r) => [r.date, JSON.stringify(r.description || ''), r.type, r.amount, JSON.stringify(categories.find((c) => c.id === r.category_id)?.name || ''), JSON.stringify(resolveSource(r)?.name || ''), JSON.stringify(r.notes || '')].join(','))].join('\n')
    setMobileFiltersOpen(false)
    await shareFile('personal-finance-transactions.csv', (f) => f.write(csv), 'text/csv')
  }
  // Same statement layout as the web's jsPDF export (title, period, Date/Description/Type/
  // Category/Account/Amount table), rendered by the system print engine.
  const exportPdf = async () => {
    setMobileFiltersOpen(false)
    const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    const amt = (v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(v || 0)))
    const body = sorted.map((r) => `<tr><td>${formatDate(r.date)}</td><td>${esc(r.description)}</td><td>${r.type}</td><td>${esc(categories.find((c) => c.id === r.category_id)?.name || 'Uncategorised')}</td><td>${esc(resolveSource(r)?.name || '')}</td><td class="r">${amt(r.amount)}</td></tr>`).join('')
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial;padding:24px}h1{font-size:18px;margin:0}p{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:12px}th{background:#1e293b;color:#fff;text-align:left;padding:6px}td{padding:5px 6px;border-bottom:1px solid #e2e8f0}.r{text-align:right}</style></head><body><h1>Personal Fin - Transaction Statement</h1><p>${esc(rangeLabel)}</p><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Category</th><th>Account</th><th class="r">Amount</th></tr></thead><tbody>${body}</tbody></table></body></html>`
    try {
      const { uri } = await Print.printToFileAsync({ html })
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'personal-finance-transactions.pdf' })
    } catch (e) { Alert.alert('Export failed', e.message) }
  }
  const openAttachment = async (t) => {
    try { const { url } = await api(`/finance/transactions/${t.id}/attachment`); if (url) await WebBrowser.openBrowserAsync(url) } catch { /* the row stays as-is */ }
  }

  const accountOptions = [{ value: 'all', label: 'All accounts' }, ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name })), ...creditCards.map((c) => ({ value: `cc:${c.id}`, label: `${c.name} (card)` }))]
  const categoryOptions = [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]
  const typeOptions = [{ value: 'all', label: 'All types' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, { value: 'transfer', label: 'Transfer' }]
  const filterSelect = 'mt-1.5 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-4 py-2.5'
  const iconBtn = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'
  const rangeLabel = customRange ? `${formatDate(customRange.start)} – ${formatDate(customRange.end)}` : `${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`

  return (
    <View className="gap-5">
      <CreditCardBillAlert creditCards={creditCards} transactions={transactions} onPay={onPayCardBill} showMoney={showMoney} />

      <View className="flex-row flex-wrap items-end justify-between gap-3">
        <View>
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Money movement</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Transactions</Text>
        </View>
        <View className="flex-row flex-wrap items-center justify-end gap-2">
          <View className={tw('flex-row items-center rounded-xl border', customRange ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
            <Pressable disabled={!!customRange} onPress={() => shiftMonth(-1)} className={tw('rounded-l-xl p-2.5', customRange && 'opacity-40')}><Icon as={ChevronLeft} size={15} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
            <Pressable onPress={() => { setRangeDraft(customRange || { start: '', end: '' }); setRangeOpen(true) }} className="px-0.5">
              <Text className={tw('text-center text-xs font-semibold uppercase tracking-wider', customRange ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700')}>{customRange ? 'Custom' : MONTH_NAMES[monthCursor.month].slice(0, 3)}</Text>
            </Pressable>
            <Pressable disabled={!!customRange} onPress={() => shiftMonth(1)} className={tw('rounded-r-xl p-2.5', customRange && 'opacity-40')}><Icon as={ChevronRight} size={15} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
          </View>
          {data.profile?.has_hidden_pin && (
            <Pressable onPress={() => (hiddenRevealed ? lockHidden() : pinDialog.ask({ title: 'Show hidden transactions', message: 'Enter your PIN. They lock again when you leave the app.', submit: unlockHidden }))}
              className={tw('rounded-xl border p-2.5', hiddenRevealed ? 'border-accent-300/40 bg-accent-400/15' : 'border-white/10 light:border-black/10')}>
              <Icon as={hiddenRevealed ? LockOpen : Lock} size={16} className={hiddenRevealed ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} />
            </Pressable>
          )}
          <Pressable onPress={onToggleMoney} className={tw(iconBtn)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
        </View>
      </View>
      {pinDialog.view}

      {selectMode ? (
        <View className="flex-row items-center gap-2">
          <Pressable onPress={exitSelectMode} className={tw(iconBtn)}><Icon as={X} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
          <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{selectedIds.size} selected</Text>
          <Pressable disabled={selectedIds.size === 0} onPress={handleBulkDelete} className={tw('rounded-xl border border-rose-300/30 bg-rose-300/10 p-2.5', selectedIds.size === 0 && 'opacity-40')}><Icon as={Trash2} size={16} className={tw('text-rose-300 light:text-rose-700')} /></Pressable>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <View className="relative flex-1 justify-center">
            <View className="absolute left-3 z-10"><Icon as={Search} size={16} className="text-slate-600" /></View>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search transactions" placeholderTextColor="#64748b"
              className={tw('w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] py-2.5 pl-10 pr-4 text-sm text-white light:text-slate-900')} />
          </View>
          <Pressable onPress={() => setMobileFiltersOpen(true)} className={tw('relative rounded-xl border p-2.5', activeFilterCount > 0 ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
            <Icon as={ListChecks} size={16} className={activeFilterCount > 0 ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} />
            {activeFilterCount > 0 && <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-accent-400"><Text className="text-[9px] font-bold text-[#07101c]">{activeFilterCount}</Text></View>}
          </Pressable>
        </View>
      )}

      <BottomSheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} title="Filters">
        <View className="gap-4 pb-4">
          <View><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Type</Text><Select value={type} onChange={setType} options={typeOptions} className={filterSelect} textClassName="text-slate-300 light:text-slate-700" title="Type" /></View>
          <View><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Account</Text><Select value={accountId} onChange={setAccountId} options={accountOptions} className={filterSelect} textClassName="text-slate-300 light:text-slate-700" title="Account" /></View>
          <View><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Category</Text><Select value={categoryId} onChange={setCategoryId} options={categoryOptions} className={filterSelect} textClassName="text-slate-300 light:text-slate-700" title="Category" /></View>
          <Pressable onPress={() => setChartView((v) => !v)} className={tw('flex-row items-center justify-between rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-4 py-3')}>
            <View className="flex-row items-center gap-2"><Icon as={PieChart} size={15} className={tw('text-slate-300 light:text-slate-700')} /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Chart view</Text></View>
            <ToggleSwitch checked={chartView} onChange={() => setChartView((v) => !v)} />
          </Pressable>
          <View className={tw('border-t border-white/10 light:border-black/10 pt-2')}>
            <Pressable onPress={() => { setMobileFiltersOpen(false); onImport() }} className="rounded-lg px-1 py-2.5"><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Import CSV</Text></Pressable>
            <Pressable onPress={exportCsv} className="rounded-lg px-1 py-2.5"><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Export as CSV</Text></Pressable>
            <Pressable onPress={exportPdf} className="rounded-lg px-1 py-2.5"><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Export as PDF</Text></Pressable>
            <Pressable onPress={() => { setMobileFiltersOpen(false); onOpenRecurring() }} className="flex-row items-center gap-2 rounded-lg px-1 py-2.5"><Icon as={Repeat} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Recurring transactions</Text></Pressable>
          </View>
        </View>
      </BottomSheet>

      <BottomSheet open={rangeOpen} onOpenChange={setRangeOpen} title="Custom range">
        <View className="pb-4">
          <DateField label="Start date" value={rangeDraft.start} onChange={(v) => setRangeDraft((d) => ({ ...d, start: v }))} allowFuture />
          <DateField label="End date" value={rangeDraft.end} onChange={(v) => setRangeDraft((d) => ({ ...d, end: v }))} allowFuture />
          <View className="flex-row gap-2">
            {customRange && (
              <Pressable onPress={() => { setCustomRange(null); setRangeDraft({ start: '', end: '' }); setRangeOpen(false) }} className={tw('flex-1 items-center rounded-xl border border-white/10 light:border-black/10 px-3 py-2.5')}><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Clear</Text></Pressable>
            )}
            <Pressable disabled={!rangeDraft.start || !rangeDraft.end || rangeDraft.start > rangeDraft.end} onPress={() => { setCustomRange({ ...rangeDraft }); setRangeOpen(false) }}
              className={tw('flex-1 items-center rounded-xl bg-accent-400 px-3 py-2.5', (!rangeDraft.start || !rangeDraft.end || rangeDraft.start > rangeDraft.end) && 'opacity-50')}>
              <Text className="text-sm font-semibold text-[#07101c]">Apply</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {chartView ? (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-4 glassy:glass-card')}>
          <View className="mb-1 gap-3">
            <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>By category · {rangeLabel}</Text>
            <View className="flex-row items-center gap-5">
              {[{ key: 'all', label: 'Overall' }, { key: 'income', label: 'Income' }, { key: 'expense', label: 'Expense' }].map((tab) => (
                <Pressable key={tab.key} onPress={() => { setCatView(tab.key); setActiveSliceIndex(-1) }} className={tw('border-b-2 pb-1.5', catView === tab.key ? 'border-accent-300 light:border-accent-600' : 'border-transparent')}>
                  <Text className={tw('text-sm font-medium', catView === tab.key ? 'text-white light:text-slate-900' : 'text-slate-500')}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {categoryBreakdown.length === 0 ? (
            <EmptyState compact icon={Tag} title="No category data" message="Nothing categorised in the current filters yet." />
          ) : (
            <View className="mt-4 gap-6">
              <DonutChart data={categoryBreakdown} activeIndex={activeSliceIndex} onSlicePress={(i) => setActiveSliceIndex((p) => (p === i ? -1 : i))} />
              <View className="gap-1">
                {categoryBreakdown.map((c, i) => (
                  <Pressable key={i} onPress={() => setActiveSliceIndex((p) => (p === i ? -1 : i))} className={tw('flex-row items-center justify-between gap-3 rounded-lg px-2 py-1.5', activeSliceIndex === i && 'bg-white/[.06] light:bg-black/[.05]')}>
                    <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <Text numberOfLines={1} className={tw('flex-1 text-sm text-slate-300 light:text-slate-700')}>{c.name}</Text>
                    </View>
                    <Text className={tw('text-sm font-medium text-white light:text-slate-900')}>{showMoney ? money(c.value) : '••••'}</Text>
                  </Pressable>
                ))}
                <View className={tw('mt-1 border-t border-white/20 light:border-black/15')} />
                <View className="flex-row items-center justify-between gap-3 px-2 py-1">
                  <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Total</Text>
                  <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(categoryBreakdown.reduce((s, c) => s + c.value, 0)) : '••••'}</Text>
                </View>
                <View className={tw('border-t border-white/20 light:border-black/15')} />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View className={tw('overflow-hidden rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
          {sorted.length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions match" message="Try adjusting filters, or add your first entry." cta="Add transaction" onCta={onOpenTxForm} />
          ) : pageRows.map((t, i) => {
            const cat = categories.find((c) => c.id === t.category_id)
            const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
            const isTransfer = t.type === 'transfer'
            const CatIcon = getTransactionIcon(t.description, cat?.name)
            const amountTone = isIn ? 'text-emerald-300 light:text-emerald-700' : isTransfer ? 'text-accent-300 light:text-accent-700' : 'text-rose-300 light:text-rose-700'
            const iconColor = cat?.color || (isTransfer ? accentColor(300) : '#94a3b8')
            const showDayHeader = i === 0 || pageRows[i - 1].date !== t.date
            const dayTotal = dayTotals[t.date]
            const overdue = t.status === 'scheduled' && t.date < new Date().toISOString().slice(0, 10)
            return (
              <Fragment key={t.id}>
                {showDayHeader && (() => {
                  const { weekday, day, month } = dayHeaderParts(t.date)
                  return (
                    <View className={tw('flex-row items-center justify-between gap-3 bg-white/[.02] light:bg-black/[.02] px-5 py-2', i > 0 && 'border-t border-white/5 light:border-black/5')}>
                      <View className="flex-row items-center gap-2">
                        <View className={tw('h-6 w-6 items-center justify-center rounded-lg bg-white/[.06] light:bg-black/[.05]')}><Text className={tw('text-[11px] font-semibold text-slate-300 light:text-slate-700')}>{day}</Text></View>
                        <Text className="text-xs text-slate-500">{weekday} · {month}</Text>
                      </View>
                      {dayTotal && (
                        <View className="flex-row items-center gap-2">
                          {dayTotal.income > 0 && <Text className={tw('text-xs font-semibold text-emerald-300 light:text-emerald-700')}>{showMoney ? `+${money(dayTotal.income)}` : '••••'}</Text>}
                          {dayTotal.expense > 0 && <Text className={tw('text-xs font-semibold text-rose-300 light:text-rose-700')}>{showMoney ? `-${money(dayTotal.expense)}` : '••••'}</Text>}
                        </View>
                      )}
                    </View>
                  )
                })()}
                <Pressable onPress={() => handleRowTap(t)} onLongPress={() => handleLongPress(t)} delayLongPress={500}
                  className={tw('flex-row items-center gap-3 border-t border-white/5 light:border-black/5 px-5 py-3', t.status === 'scheduled' && 'opacity-70')}>
                  {selectMode ? (
                    selectedIds.has(t.id) ? <Icon as={CheckCircle2} size={22} className="text-accent-400" /> : <View className={tw('h-[22px] w-[22px] rounded-full border-2 border-white/20 light:border-black/20')} />
                  ) : (
                    <View className={tw('h-10 w-10 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}>
                      {(() => { const I = isTransfer ? ArrowLeftRight : CatIcon || (isIn ? ArrowUpRight : ArrowDownRight); return <I size={16} color={iconColor} /> })()}
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text numberOfLines={1} className={tw('shrink text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(t.description)}</Text>
                      {isHiddenTx(t, hiddenGroups) && <Icon as={Lock} size={11} className="text-slate-500" />}
                      {t.status === 'scheduled' && (
                        <View className={tw('rounded-full px-1.5 py-0.5', overdue ? 'bg-amber-400/15' : 'bg-sky-400/15')}><Text className={tw('text-[10px] font-semibold', overdue ? 'text-amber-200 light:text-amber-700' : 'text-sky-200 light:text-sky-700')}>{overdue ? 'Overdue' : 'Scheduled'}</Text></View>
                      )}
                      {t.attachment_path ? <Pressable hitSlop={8} onPress={() => openAttachment(t)} className="pl-0.5"><Icon as={Paperclip} size={12} className="text-slate-500" /></Pressable> : null}
                      {t.recurring_source_id ? <Icon as={Repeat} size={11} className="text-slate-500" /> : null}
                    </View>
                    <Text numberOfLines={1} className="text-[11px] text-slate-500">{cat?.name || (isTransfer ? 'Transfer' : 'Uncategorised')} · {formatDate(t.date)}</Text>
                  </View>
                  <Text className={tw('text-sm font-semibold', amountTone)}>{showMoney ? `${isIn ? '+' : '-'}${money(t.amount).replace('-', '')}` : '••••'}</Text>
                </Pressable>
              </Fragment>
            )
          })}
          {totalPages > 1 && (
            <View className={tw('flex-row items-center justify-between border-t border-white/10 light:border-black/10 px-5 py-3')}>
              <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Page {page + 1} of {totalPages} · {sorted.length} transactions</Text>
              <View className="flex-row gap-2">
                <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} className={tw('rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5', page === 0 && 'opacity-40')}><Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Previous</Text></Pressable>
                <Pressable disabled={page >= totalPages - 1} onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className={tw('rounded-lg border border-white/10 light:border-black/10 px-3 py-1.5', page >= totalPages - 1 && 'opacity-40')}><Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Next</Text></Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
