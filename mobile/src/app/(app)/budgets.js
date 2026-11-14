import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Card, EmptyState, ProgressBar, Screen, SectionLabel, Stat, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { money } from '../../lib/format'
import { categoryBreakdown, monthLabel, planTotals } from '../../lib/shared'
import { colors } from '../../lib/theme'

// Monthly budget plans (budget_months.month is 0-based, like JS Date). Same maths as the web
// BudgetsView via the shared lib/budgets.js.
export default function Budgets() {
  const { data } = useData()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const plans = data.budget_months || []
  const plan = plans.find((p) => p.year === cursor.year && p.month === cursor.month)
  const lines = useMemo(() => (plan ? (data.budget_month_categories || []).filter((l) => l.budget_month_id === plan.id) : []), [plan, data.budget_month_categories])
  const totals = planTotals(plan, data.transactions)
  const rows = plan ? categoryBreakdown(plan, lines, data.categories, data.transactions) : []
  const shift = (n) => setCursor(({ year, month }) => { const d = new Date(year, month + n, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const over = totals.remaining < 0

  return (
    <Screen title="Budgets" back>
      <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
        <Pressable hitSlop={10} onPress={() => shift(-1)}><Feather name="chevron-left" size={22} color={colors.textMuted} /></Pressable>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{monthLabel(cursor.year, cursor.month)}{plan?.status === 'closed' ? ' · closed' : ''}</Text>
        <Pressable hitSlop={10} onPress={() => shift(1)}><Feather name="chevron-right" size={22} color={colors.textMuted} /></Pressable>
      </View>
      {!plan ? <EmptyState icon="target" title="No budget for this month" message="Plan a month's budget on the web app — progress shows here." /> : (
        <>
          <View style={[ui.row, { marginTop: 10 }]}>
            <Stat label="Budget" value={money(totals.budgeted)} />
            <Stat label="Spent" value={money(totals.spent)} color={over ? colors.expense : undefined} />
          </View>
          <Card style={{ marginTop: 10 }}>
            <Text style={ui.muted}>{over ? 'Over budget by' : 'Left to spend'}</Text>
            <Text style={{ color: over ? colors.expense : colors.income, fontSize: 24, fontWeight: '700', marginTop: 4 }}>{money(Math.abs(totals.remaining))}</Text>
            <ProgressBar pct={totals.pct} color={over ? colors.expense : undefined} />
          </Card>
          {rows.length > 0 && <SectionLabel>By category</SectionLabel>}
          {rows.map(({ line, category, budgeted, spent, pct }) => (
            <Card key={line.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{category?.name || 'Category'}</Text>
                <Text style={{ color: spent > budgeted ? colors.expense : colors.textMuted, fontVariant: ['tabular-nums'] }}>{money(spent)} / {money(budgeted)}</Text>
              </View>
              <ProgressBar pct={pct} color={spent > budgeted ? colors.expense : undefined} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  )
}
