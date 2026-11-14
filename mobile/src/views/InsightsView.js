import { Text, View } from 'react-native'
import { Sparkles, Tag, TrendingDown, TrendingUp } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { HeroStatTile } from '../ui/HeroStatTile'
import { EmptyState } from '../ui/EmptyState'
import { DonutChart } from '../ui/DonutChart'
import { CARD, EyeButton, HERO, PageTitle } from '../ui/DetailKit'
import { tw } from '../lib/tw'
import { MONTH_NAMES, money } from '../lib/format'

// Port of features/insights/InsightsView.jsx.
const TONES = {
  good: ['border-emerald-400/25 bg-emerald-500/5', 'text-emerald-100 light:text-emerald-800'],
  warn: ['border-amber-400/25 bg-amber-500/5', 'text-amber-100 light:text-amber-800'],
  info: ['border-accent-400/20 bg-accent-400/5', 'text-accent-100 light:text-accent-700'],
}

export function InsightsView({ data, showMoney, onToggleMoney }) {
  const { transactions = [], categories = [] } = data
  const fmt = (v) => (showMoney ? money(v) : '••••')
  const now = new Date()
  const monthTx = transactions.filter((t) => { const d = new Date(t.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && t.type !== 'transfer' })
  const incomeTx = monthTx.filter((t) => t.type === 'income')
  const expenseTx = monthTx.filter((t) => t.type === 'expense')
  const income = incomeTx.reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = expenseTx.reduce((s, t) => s + Number(t.amount || 0), 0)
  const savings = income - expense
  const rate = income > 0 ? Math.round((savings / income) * 100) : 0

  const byCat = {}
  expenseTx.forEach((t) => { const key = t.category_id || 'uncat'; byCat[key] = (byCat[key] || 0) + Number(t.amount || 0) })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, value]) => {
    const cat = categories.find((c) => c.id === id)
    return { name: cat?.name || 'Uncategorised', value, color: cat?.color || '#64748b' }
  })

  const insights = []
  if (income > 0) {
    if (rate >= 30) insights.push({ tone: 'good', text: `Impressive! You're saving ${rate}% of your income this month — well above the 20% benchmark.` })
    else if (rate >= 20) insights.push({ tone: 'good', text: `Solid month — you're saving ${rate}% of your income.` })
    else if (rate >= 0) insights.push({ tone: 'warn', text: `Only ${rate}% saved so far this month. Try to trim one variable expense category.` })
    else insights.push({ tone: 'warn', text: "You've spent more than you earned this month. Review your top category below." })
  }
  if (topCats[0]) insights.push({ tone: 'info', text: `Biggest expense category: ${topCats[0].name} at ${fmt(topCats[0].value)}.` })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  if (expense > 0) insights.push({ tone: 'info', text: `Daily burn: ${fmt(Math.round(expense / daysPassed))} · projected month ${fmt(Math.round((expense / daysPassed) * daysInMonth))}.` })
  const good = rate >= 20 ? 'text-emerald-300 light:text-emerald-700' : 'text-amber-300 light:text-amber-700'

  return (
    <View className="gap-6 pb-8">
      <View className="flex-row items-end justify-between gap-3">
        <PageTitle eyebrow="Smart spending" title={`Insights · ${MONTH_NAMES[now.getMonth()]}`} />
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Savings</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px]', good)}>{fmt(savings)}</Text>
        <Text className={tw('mt-1 text-sm', good)}>{rate}% of income</Text>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile icon={TrendingUp} label="Income this month" value={fmt(income)} valueTone="text-emerald-300 light:text-emerald-700" sub={`${incomeTx.length} entries`} />
          <HeroStatTile icon={TrendingDown} label="Expenses this month" value={fmt(expense)} valueTone="text-rose-300 light:text-rose-700" sub={`${expenseTx.length} entries`} />
        </View>
      </View>

      <View className={tw(CARD, 'p-5')}>
        <Text className={tw('mb-4 text-sm font-semibold text-white light:text-slate-900')}>Where money goes</Text>
        {topCats.length === 0 ? (
          <EmptyState icon={Tag} title="No expense data" message="Log a few expenses to see your top categories." />
        ) : (
          <>
            <DonutChart data={topCats} height={240} />
            <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-1">
              {topCats.map((c) => (
                <View key={c.name} className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <Text className="text-xs text-slate-400">{c.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View className={tw(CARD, 'p-5')}>
        <Text className={tw('mb-4 text-sm font-semibold text-white light:text-slate-900')}>Smart insights</Text>
        {insights.length === 0 ? (
          <EmptyState icon={Sparkles} title="Nothing to analyse yet" message="Log a few transactions this month and we'll surface patterns." />
        ) : (
          <View className="gap-3">
            {insights.map((ins, i) => {
              const [box, text] = TONES[ins.tone]
              return (
                <View key={i} className={tw('flex-row gap-3 rounded-xl border px-4 py-3', box)}>
                  <Icon as={Sparkles} size={16} className={tw('mt-0.5', text)} />
                  <Text className={tw('flex-1 text-sm', text)}>{ins.text}</Text>
                </View>
              )
            })}
          </View>
        )}
        <View className="mt-6 gap-2">
          <Text className="text-xs uppercase tracking-widest text-slate-500">Top categories</Text>
          {topCats.length === 0 ? <Text className="text-sm text-slate-500">No expense categories yet.</Text> : topCats.map((c) => {
            const pct = expense > 0 ? Math.round((c.value / expense) * 100) : 0
            return (
              <View key={c.name}>
                <View className="flex-row items-center justify-between">
                  <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>{c.name}</Text>
                  <Text className={tw('text-xs text-white light:text-slate-900')}>{fmt(c.value)} · {pct}%</Text>
                </View>
                <View className={tw('mt-1 h-1.5 overflow-hidden rounded-full bg-white/5 light:bg-black/5')}>
                  <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}
