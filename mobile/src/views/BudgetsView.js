import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { AlertTriangle, ArrowDownRight, Calendar, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Target, Trash2, TrendingUp, Unlock, Upload, X } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { DonutChart } from '../ui/DonutChart'
import { BackLink, CARD, EyeButton, HERO, MoreMenu, PageTitle, ProgressBar, SectionHeader } from '../ui/DetailKit'
import { Field, FormSheet, Input, SubmitButton } from '../ui/FormKit'
import { Select } from '../ui/Select'
import { tw } from '../lib/tw'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { money, todayISO } from '../lib/format'
import { getCategoryIcon } from '../lib/categoryIcons'
import { budgetInsights, buildBudgetsExportCsv, categoryBreakdown, monthLabel, planTotals } from '../lib/shared'

// Port of features/budgets/* (BudgetsView, BudgetMonthDetailView, BudgetMonthForm, BudgetForm).
const DISMISS_KEY = 'dismissedBudgetInsights'
const barTone = (pct) => (pct >= 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400')
const textTone = (pct) => (pct >= 100 ? 'text-rose-300 light:text-rose-700' : pct >= 80 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700')

async function exportBudgets(payload) {
  try {
    const name = `budgets-${todayISO()}.csv`
    const file = new File(Paths.cache, name)
    if (file.exists) file.delete()
    await file.write(buildBudgetsExportCsv(payload))
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: name })
  } catch (e) { Alert.alert('Export failed', e.message) }
}

function Donut({ title, mix, showMoney }) {
  if (mix.length === 0) return null
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{title}</Text>
      <DonutChart data={mix} height={220} />
      <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1">
        {mix.map((m) => (
          <View key={m.name} className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
            <Text className="text-[11px] text-slate-400">{m.name}{showMoney ? ` · ${money(m.value)}` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function BudgetsView({ data, onSetMonth, onCloseMonth, onReopenMonth, onDeleteMonth, onAddYearly, onEditYearly, onDeleteYearly, showMoney, onToggleMoney }) {
  const { budgets = [], budget_months = [], budget_month_categories = [], categories = [], transactions = [] } = data
  const now = new Date()
  const [selectedClosedId, setSelectedClosedId] = useState(null)
  const [dismissedInsights, setDismissedInsights] = useState(new Set())
  useEffect(() => { SecureStore.getItemAsync(DISMISS_KEY).then((v) => setDismissedInsights(new Set(JSON.parse(v || '[]')))).catch(() => {}) }, [])
  const dismissInsight = (lineId) => setDismissedInsights((d) => {
    const next = new Set(d).add(lineId)
    SecureStore.setItemAsync(DISMISS_KEY, JSON.stringify([...next].slice(-200))).catch(() => {})
    return next
  })

  const linesFor = (planId) => budget_month_categories.filter((l) => l.budget_month_id === planId)
  const activePlan = budget_months.find((p) => p.status === 'active' && p.year === now.getFullYear() && p.month === now.getMonth())
  const upcomingPlans = budget_months.filter((p) => p.status === 'active' && p !== activePlan && !(p.year === now.getFullYear() && p.month === now.getMonth())).sort((a, b) => (a.year - b.year) || (a.month - b.month))
  const closedPlans = budget_months.filter((p) => p.status === 'closed').sort((a, b) => (b.year - a.year) || (b.month - a.month))
  const selectedClosed = closedPlans.find((p) => p.id === selectedClosedId)
  const yearlyBudgets = budgets.filter((b) => b.period === 'yearly')
  const exportPayload = { budgetMonths: budget_months, budgetMonthCategories: budget_month_categories, yearlyBudgets, categories, transactions }

  if (selectedClosed) {
    return <BudgetMonthDetailView plan={selectedClosed} lines={linesFor(selectedClosed.id)} categories={categories} transactions={transactions}
      onBack={() => setSelectedClosedId(null)} onReopen={(p) => { onReopenMonth(p); setSelectedClosedId(null) }} onDelete={(p) => onDeleteMonth(p, () => setSelectedClosedId(null))} />
  }

  const activeLines = activePlan ? linesFor(activePlan.id) : []
  const activeTotals = activePlan ? planTotals(activePlan, transactions) : null
  const activeBreakdown = activePlan ? categoryBreakdown(activePlan, activeLines, categories, transactions) : []
  const insights = (activePlan ? budgetInsights(activePlan, activeLines, budget_months, budget_month_categories, categories, transactions) : []).filter((ins) => !dismissedInsights.has(ins.line.id))
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(0, daysInCurrentMonth - now.getDate())
  const allocationMix = activeBreakdown.filter((b) => b.budgeted > 0).map((b) => ({ name: b.category?.name || 'Category', value: b.budgeted, color: b.category?.color || '#94a3b8' }))
  const spendMix = activeBreakdown.filter((b) => b.spent > 0).map((b) => ({ name: b.category?.name || 'Category', value: b.spent, color: b.category?.color || '#94a3b8' }))

  return (
    <View className="gap-5 pb-8">
      <View className="flex-row items-end justify-between gap-3">
        <PageTitle eyebrow="Guardrails" title="Budgets" />
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      <View className={tw(HERO, 'z-20')}>
        <View className="z-20 flex-row items-center justify-between gap-3">
          <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{monthLabel(now.getFullYear(), now.getMonth())}</Text>
          <MoreMenu width={192} items={[
            { icon: Pencil, label: 'Edit', onPress: () => onSetMonth(activePlan.year, activePlan.month), hidden: !activePlan },
            { icon: Lock, label: 'Close month', onPress: () => onCloseMonth(activePlan), hidden: !activePlan },
            { icon: Trash2, label: 'Delete month', onPress: () => onDeleteMonth(activePlan), danger: true, hidden: !activePlan },
            { icon: Upload, label: 'Export', onPress: () => exportBudgets(exportPayload), hidden: budget_months.length === 0 && yearlyBudgets.length === 0 },
          ]} />
        </View>

        {!activePlan ? (
          <EmptyState compact icon={Target} title="No budget set for this month" message="Set an overall monthly budget and however many category limits you want, all together." cta="Set this month's budget" onCta={() => onSetMonth(now.getFullYear(), now.getMonth())} />
        ) : (
          <>
            <View className="mt-5">
              <Text className="text-xs uppercase tracking-widest text-slate-400">Budgeted</Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                <Text className={tw('text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(activeTotals.budgeted) : '••••••'}</Text>
                {activeTotals.remaining >= 0 ? (
                  <View className="rounded-full border border-emerald-300/30 bg-emerald-300/5 px-2 py-0.5"><Text className={tw('text-[11px] font-semibold text-emerald-200 light:text-emerald-700')}>Remaining {showMoney ? money(activeTotals.remaining) : '••••'}</Text></View>
                ) : (
                  <View className="rounded-full border border-rose-300/30 bg-rose-300/5 px-2 py-0.5"><Text className={tw('text-[11px] font-semibold text-rose-200 light:text-rose-700')}>Over by {showMoney ? money(Math.abs(activeTotals.remaining)) : '••••'}</Text></View>
                )}
              </View>
              <View className="mt-5 flex-row gap-3">
                <HeroStatTile icon={TrendingUp} label="Spent so far" value={showMoney ? money(activeTotals.spent) : '••••'} valueTone="text-rose-300 light:text-rose-700" sub={`${activeTotals.pct}% of budget`} />
                <HeroStatTile icon={Calendar} label="Days left" value={`${daysLeft}`} sub={`${now.getDate()} of ${daysInCurrentMonth} days used`} />
              </View>
            </View>

            {insights.length > 0 && (
              <View className="mt-4 gap-2">
                {insights.map((ins) => (
                  <View key={ins.line.id} className="gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5">
                    <View className="flex-row items-start gap-2">
                      <Icon as={AlertTriangle} size={13} className={tw('mt-0.5 text-amber-200 light:text-amber-700')} />
                      <Text className={tw('flex-1 text-xs leading-5 text-amber-200 light:text-amber-700')}>
                        <Text className="font-bold">{ins.category?.name}</Text>{' '}
                        {ins.overPace ? `is trending over — at this pace, ~${money(ins.projected)} by month end against a ${money(ins.budgeted)} budget.` : `has gone over budget ${ins.streak} months running.`}
                        {ins.overPace && ins.streak >= 2 ? ` Over budget ${ins.streak} months running.` : ''}
                        {ins.vsLastMonth ? ` · ${money(ins.vsLastMonth.spent)} last month` : ''}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-end gap-1.5">
                      <Pressable onPress={() => onSetMonth(activePlan.year, activePlan.month)} className="rounded-lg bg-amber-300/20 px-2.5 py-1"><Text className={tw('text-[11px] font-semibold text-amber-100 light:text-amber-800')}>Adjust budget</Text></Pressable>
                      <Pressable onPress={() => dismissInsight(ins.line.id)} hitSlop={6} className="rounded-lg p-1 opacity-60"><Icon as={X} size={13} className={tw('text-amber-200 light:text-amber-700')} /></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeBreakdown.length > 0 && (
              <View className="mt-5 gap-3">
                {activeBreakdown.map((b) => (
                  <View key={b.line.id}>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className={tw('flex-shrink text-sm text-white light:text-slate-900')}>{b.category?.name || 'Category'}</Text>
                      <Text className={tw('text-sm text-slate-400 light:text-slate-500')}>{showMoney ? `${money(b.spent)} of ${money(b.budgeted)}` : '••••'}</Text>
                    </View>
                    <ProgressBar pct={b.pct} className="mt-1.5 h-1.5" color={barTone(b.pct)} />
                  </View>
                ))}
                <View className="mt-3 gap-6">
                  <Donut title="Budget allocation" mix={allocationMix} showMoney={showMoney} />
                  <Donut title="Spend split" mix={spendMix} showMoney={showMoney} />
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {upcomingPlans.length > 0 && (
        <View>
          <Text className="mb-3 text-xs uppercase tracking-widest text-slate-400">Other planned months · {upcomingPlans.length}</Text>
          <View className="gap-4">
            {upcomingPlans.map((p) => {
              const t = planTotals(p, transactions)
              const isFuture = p.year > now.getFullYear() || (p.year === now.getFullYear() && p.month > now.getMonth())
              return (
                <Pressable key={p.id} onPress={() => onSetMonth(p.year, p.month)} className="rounded-2xl border border-accent-300/15 bg-accent-300/[.03] p-5 active:opacity-80">
                  <View className="flex-row items-center gap-2">
                    <Icon as={Calendar} size={14} className={tw('text-accent-300/70 light:text-accent-700')} />
                    <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{monthLabel(p.year, p.month)}</Text>
                    <View className="rounded-full bg-accent-400/15 px-1.5 py-0.5"><Text className={tw('text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700')}>{isFuture ? 'Upcoming' : 'Reopened'}</Text></View>
                  </View>
                  <Text className={tw('mt-3 text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(t.budgeted) : '••••'}</Text>
                  <Text className="text-xs text-slate-400">{isFuture ? 'Planned' : `${money(t.spent)} spent so far`}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      )}

      {closedPlans.length > 0 && (
        <View>
          <Text className="mb-3 text-xs uppercase tracking-widest text-slate-400">Past months · {closedPlans.length}</Text>
          <View className="gap-4">
            {closedPlans.map((p) => {
              const t = planTotals(p, transactions)
              return (
                <Pressable key={p.id} onPress={() => setSelectedClosedId(p.id)} className={tw(CARD, 'p-5 active:opacity-80')}>
                  <View className="flex-row items-center gap-2">
                    <Icon as={Calendar} size={14} className="text-slate-500" />
                    <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{monthLabel(p.year, p.month)}</Text>
                  </View>
                  <View className="mt-3 flex-row items-end justify-between">
                    <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(t.spent) : '••••'}</Text>
                    <Text className="text-xs text-slate-400">of {showMoney ? money(t.budgeted) : '••••'}</Text>
                  </View>
                  <Text className={tw('mt-1 text-xs', textTone(t.pct))}>{t.pct}% used</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      )}

      <View>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs uppercase tracking-widest text-slate-400">Yearly budgets</Text>
          <Pressable onPress={onAddYearly} className={tw('flex-row items-center gap-1.5 rounded-lg bg-white/[.06] light:bg-black/[.04] px-2.5 py-1.5')}>
            <Icon as={Plus} size={13} className={tw('text-white light:text-slate-900')} />
            <Text className={tw('text-xs font-semibold text-white light:text-slate-900')}>Add</Text>
          </Pressable>
        </View>
        {yearlyBudgets.length === 0 ? (
          <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-5 py-6')}><Text className="text-sm text-slate-400">No yearly budgets set.</Text></View>
        ) : (
          <View className="gap-4">
            {yearlyBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.category_id)
              const spent = transactions.filter((t) => t.type === 'expense' && t.category_id === b.category_id && new Date(t.date).getFullYear() === now.getFullYear()).reduce((s, t) => s + Number(t.amount || 0), 0)
              const limit = Number(b.amount || 0)
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
              const CatIcon = getCategoryIcon(cat?.name)
              const color = cat?.color || '#94a3b8'
              return (
                <View key={b.id} className={tw(CARD, 'p-5')}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}22` }}><CatIcon size={16} color={color} /></View>
                      <View>
                        <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{cat?.name || 'Category'}</Text>
                        <Text className="text-[11px] capitalize text-slate-400">yearly</Text>
                      </View>
                    </View>
                    <View className="flex-row gap-1">
                      <Pressable onPress={() => onEditYearly(b)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                      <Pressable onPress={() => onDeleteYearly(b)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                    </View>
                  </View>
                  <View className="mt-5 flex-row items-end justify-between">
                    <Text className={tw('text-2xl font-semibold tracking-tight text-white light:text-slate-900')}>{showMoney ? money(spent) : '••••'}</Text>
                    <Text className="text-xs text-slate-400">of {showMoney ? money(limit) : '••••'}</Text>
                  </View>
                  <ProgressBar pct={pct} color={barTone(pct)} />
                  <Text className={tw('mt-2 text-xs', textTone(pct))}>{showMoney ? (pct >= 100 ? `Over budget by ${money(spent - limit)}` : `${pct}% used · ${money(limit - spent)} left`) : `${pct}% used`}</Text>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

function BudgetMonthDetailView({ plan, lines, categories, transactions, onBack, onReopen, onDelete }) {
  const { budgeted, spent, remaining, pct } = planTotals(plan, transactions)
  const breakdown = categoryBreakdown(plan, lines, categories, transactions)
  const closedOn = plan.closed_at ? (() => { const d = new Date(plan.closed_at); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` })() : '—'
  return (
    <View className="gap-5 pb-8">
      <BackLink label="Back to budgets" onPress={onBack} />
      <View className="gap-4">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className={tw('text-2xl font-semibold text-white light:text-slate-900')}>{monthLabel(plan.year, plan.month)}</Text>
            <View className="rounded-full bg-slate-500/20 px-2 py-0.5"><Text className={tw('text-[10px] font-semibold uppercase tracking-widest text-slate-300 light:text-slate-700')}>Closed</Text></View>
          </View>
          <Text className="mt-1 text-xs text-slate-500">Closed on {closedOn}</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => onReopen(plan)} className={tw('flex-row items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5')}>
            <Icon as={Unlock} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={tw('text-sm font-medium text-slate-300 light:text-slate-700')}>Reopen</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(plan)} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2.5')}><Icon as={Trash2} size={15} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
        </View>
      </View>

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">{remaining >= 0 ? 'Came in under by' : 'Went over by'}</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px]', remaining >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700')}>{money(Math.abs(remaining))}</Text>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile icon={Target} label="Budgeted" value={money(budgeted)} />
          <HeroStatTile icon={ArrowDownRight} label="Spent" value={money(spent)} valueTone="text-rose-300 light:text-rose-700" sub={`${pct}% of budget`} />
        </View>
      </View>

      <View className={tw(CARD)}>
        <SectionHeader>Category breakdown · {breakdown.length}</SectionHeader>
        {breakdown.length === 0 ? (
          <EmptyState compact icon={Target} title="No categories set" message="This month's budget had no category breakdown." />
        ) : breakdown.map((b, i) => (
          <View key={b.line.id} className={tw('px-5 py-4', i > 0 && 'border-t border-white/5 light:border-black/5')}>
            <View className="flex-row items-center justify-between gap-3">
              <Text className={tw('flex-shrink text-sm font-medium text-white light:text-slate-900')}>{b.category?.name || 'Category'}</Text>
              <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{money(b.spent)} <Text className="text-slate-500">of {money(b.budgeted)}</Text></Text>
            </View>
            <ProgressBar pct={b.pct} className="mt-2 h-1.5" color={barTone(b.pct)} />
            <Text className={tw('mt-1.5 text-xs', textTone(b.pct))}>{b.pct >= 100 ? `Over by ${money(b.spent - b.budgeted)}` : `${b.pct}% used`}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const expenseCatsOf = (categories) => categories.filter((c) => c.type === 'expense' && !(c.hidden_in_modules || []).includes('budgets'))

export function BudgetMonthForm({ open, onClose, onSaved, initialYear, initialMonth, budgetMonths = [], budgetMonthCategories = [], categories }) {
  const [cursor, setCursor] = useState({ year: initialYear, month: initialMonth })
  useEffect(() => { if (open) setCursor({ year: initialYear, month: initialMonth }) }, [open, initialYear, initialMonth])
  const shiftMonth = (delta) => setCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const existingPlan = budgetMonths.find((p) => p.year === cursor.year && p.month === cursor.month)
  const isClosed = existingPlan?.status === 'closed'
  const expenseCats = expenseCatsOf(categories)
  const buildInitial = () => {
    const source = existingPlan || [...budgetMonths].sort((a, b) => (b.year - a.year) || (b.month - a.month))[0]
    if (!source) return { total_amount: '', rows: [{ category_id: '', amount: '' }] }
    const lines = budgetMonthCategories.filter((l) => l.budget_month_id === source.id)
    return { total_amount: String(source.total_amount), rows: lines.length ? lines.map((l) => ({ category_id: l.category_id, amount: String(l.amount) })) : [{ category_id: '', amount: '' }] }
  }
  const [form, setForm] = useState(buildInitial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(buildInitial()) }, [open, cursor.year, cursor.month, existingPlan?.id])

  const setRow = (i, patch) => setForm((f) => ({ ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }))
  const total = Number(form.total_amount || 0)
  const allocated = form.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const remaining = total - allocated
  const allocatedPct = total > 0 ? Math.round((allocated / total) * 100) : 0
  const overAllocated = remaining < 0

  const save = async () => {
    if (isClosed) return
    if (form.total_amount === '') { toast.push('Enter the overall monthly budget.', 'error'); return }
    if (overAllocated) { toast.push("You've planned more across categories than your overall budget — raise the overall total or trim a category first.", 'error'); return }
    setBusy(true)
    try {
      const rows = form.rows.filter((r) => r.category_id && Number(r.amount) >= 0)
      await api('/finance/budget_months/save', { method: 'POST', body: { year: cursor.year, month: cursor.month, total_amount: total, categories: rows.map((r) => ({ category_id: r.category_id, amount: Number(r.amount) })) } })
      toast.push(existingPlan ? 'Budget updated' : 'Budget set')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const catOptions = [{ value: '', label: 'Choose category…' }, ...expenseCats.map((c) => ({ value: c.id, label: c.name }))]
  return (
    <FormSheet open={open} onClose={onClose} title={existingPlan ? 'Edit budget' : 'Set a budget'}>
      <View className="flex-row items-center justify-center gap-3">
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} className="rounded-lg p-1.5"><Icon as={ChevronLeft} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
        <Text className={tw('w-36 text-center text-sm font-medium text-white light:text-slate-900')}>{monthLabel(cursor.year, cursor.month)}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8} className="rounded-lg p-1.5"><Icon as={ChevronRight} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
      </View>
      {isClosed && (
        <View className="mt-4 rounded-xl border border-slate-500/25 bg-slate-500/5 px-4 py-2.5"><Text className={tw('text-xs text-slate-300 light:text-slate-700')}>This month is closed — reopen it from its card in your history log before editing.</Text></View>
      )}
      <View pointerEvents={isClosed ? 'none' : 'auto'} className={tw(isClosed && 'opacity-50')}>
        <View className="mt-5"><Field label="Overall monthly budget"><Input keyboardType="decimal-pad" value={form.total_amount} onChangeText={(v) => setForm((f) => ({ ...f, total_amount: v.replace(/[^0-9.]/g, '') }))} placeholder="50000" /></Field></View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Category breakdown <Text className="text-xs text-slate-500">(optional)</Text></Text>
          <Pressable onPress={() => setForm((f) => ({ ...f, rows: [...f.rows, { category_id: '', amount: '' }] }))} className={tw('flex-row items-center gap-1 rounded-lg bg-white/[.06] light:bg-black/[.04] px-2.5 py-1.5')}>
            <Icon as={Plus} size={13} className={tw('text-white light:text-slate-900')} /><Text className={tw('text-xs font-semibold text-white light:text-slate-900')}>Add category</Text>
          </Pressable>
        </View>
        {total > 0 && (
          <View className={tw('mt-3 rounded-xl border px-4 py-2.5', overAllocated ? 'border-rose-300/30 bg-rose-300/5' : 'border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02]')}>
            <View className="flex-row flex-wrap items-center justify-between gap-1">
              <Text className={tw('text-xs', overAllocated ? 'text-rose-200 light:text-rose-700' : 'text-slate-300 light:text-slate-700')}>{overAllocated ? `${money(-remaining)} over your overall budget` : `${money(remaining)} left to plan`}</Text>
              <Text className={tw('text-xs', overAllocated ? 'text-rose-300 light:text-rose-700' : 'text-slate-500')}>{money(allocated)} of {money(total)} planned · {allocatedPct}%</Text>
            </View>
            <ProgressBar pct={Math.min(100, allocatedPct)} className="mt-2 h-1.5" color={overAllocated ? 'bg-rose-400' : 'bg-accent-300'} />
            {overAllocated ? <Text className={tw('mt-2 text-[11px] text-rose-300/80 light:text-rose-700')}>Trim a category below, or raise the overall monthly budget above — you can't save while categories add up to more than the total.</Text> : null}
          </View>
        )}
        <View className="mt-3 gap-2.5">
          {form.rows.map((row, i) => (
            <View key={i} className="gap-2">
              <Select value={row.category_id} onChange={(v) => setRow(i, { category_id: v })} options={catOptions} title="Category" />
              <View className="flex-row items-center gap-2">
                <TextInput keyboardType="decimal-pad" value={row.amount} onChangeText={(v) => setRow(i, { amount: v.replace(/[^0-9.]/g, '') })} placeholder="10000" placeholderTextColor="#64748b"
                  className={tw('flex-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-sm text-white light:text-slate-900')} />
                <Pressable onPress={() => setForm((f) => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))} hitSlop={6} className="rounded-lg p-2"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
              </View>
            </View>
          ))}
        </View>
        <SubmitButton busy={busy} disabled={overAllocated} onPress={save} label={overAllocated ? 'Categories exceed overall budget' : existingPlan ? 'Update budget' : 'Save budget'} />
      </View>
    </FormSheet>
  )
}

export function BudgetForm({ open, onClose, onSaved, editing, categories }) {
  const expenseCats = expenseCatsOf(categories)
  const blank = () => (editing ? { category_id: editing.category_id, amount: String(editing.amount), period: editing.period || 'yearly', start_date: editing.start_date || todayISO() } : { category_id: expenseCats[0]?.id || '', amount: '', period: 'yearly', start_date: todayISO() })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])

  const save = async () => {
    if (!form.category_id || form.amount === '') { toast.push('Choose a category and enter a limit.', 'error'); return }
    setBusy(true)
    try {
      await api(editing ? `/finance/budgets/${editing.id}` : '/finance/budgets', { method: editing ? 'PATCH' : 'POST', body: { ...form, amount: Number(form.amount) } })
      toast.push(editing ? 'Budget updated' : 'Budget added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit yearly budget' : 'Set a yearly budget'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update budget' : 'Save budget'}>
      <Field label="Category"><View className="mt-2"><Select value={form.category_id} onChange={(v) => setForm((f) => ({ ...f, category_id: v }))} options={[{ value: '', label: 'Choose category…' }, ...expenseCats.map((c) => ({ value: c.id, label: c.name }))]} title="Category" /></View></Field>
      <Field label="Limit amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, '') }))} placeholder="10000" /></Field>
    </FormSheet>
  )
}
