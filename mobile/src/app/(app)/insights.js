import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Card, EmptyState, ProgressBar, Screen, Segmented, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { MONTH_NAMES, money, todayISO } from '../../lib/format'
import { colors } from '../../lib/theme'

const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// Where the money went this month, by category.
export default function Insights() {
  const { data } = useData()
  const [ym, setYm] = useState(todayISO().slice(0, 7))
  const [type, setType] = useState('expense')
  const rows = useMemo(() => {
    const byCat = new Map()
    for (const t of data.transactions) {
      if (t.type !== type || !t.date?.startsWith(ym)) continue
      byCat.set(t.category_id || 'none', (byCat.get(t.category_id || 'none') || 0) + Number(t.amount || 0))
    }
    return [...byCat.entries()].map(([id, amount]) => ({ id, amount, name: data.categories.find((c) => c.id === id)?.name || 'Uncategorised' })).sort((a, b) => b.amount - a.amount)
  }, [data.transactions, data.categories, ym, type])
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const [y, m] = ym.split('-').map(Number)

  return (
    <Screen title="Insights" back>
      <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 12 }]}>
        <Pressable hitSlop={10} onPress={() => setYm(shiftMonth(ym, -1))}><Feather name="chevron-left" size={22} color={colors.textMuted} /></Pressable>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{MONTH_NAMES[m - 1]} {y}</Text>
        <Pressable hitSlop={10} onPress={() => setYm(shiftMonth(ym, 1))}><Feather name="chevron-right" size={22} color={colors.textMuted} /></Pressable>
      </View>
      <Segmented options={[{ value: 'expense', label: 'Spending' }, { value: 'income', label: 'Income' }]} value={type} onChange={setType} />
      {rows.length === 0 ? <EmptyState icon="pie-chart" title="Nothing this month" /> : (
        <>
          <Text style={[ui.muted, { marginBottom: 10 }]}>Total {money(total)}</Text>
          {rows.map((r) => (
            <Card key={r.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{r.name}</Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{money(r.amount)} · {Math.round((r.amount / total) * 100)}%</Text>
              </View>
              <ProgressBar pct={(r.amount / total) * 100} color={type === 'expense' ? colors.expense : colors.income} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  )
}
