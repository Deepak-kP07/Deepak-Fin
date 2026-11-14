import { useMemo, useState } from 'react'
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { EmptyState, ErrorBanner, Loading, styles as ui } from '../../../components/ui'
import { TransactionRow } from '../../../components/TransactionRow'
import { useData } from '../../../state/DataProvider'
import { MONTH_NAMES, dayLabel, money, todayISO } from '../../../lib/format'
import { dedupeTransfers, listableTransactions, monthTotals, sortNewestFirst } from '../../../lib/transactions'
import { colors } from '../../../lib/theme'

const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Transactions() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data, loading, error, refresh, accent } = useData()
  const [ym, setYm] = useState(todayISO().slice(0, 7))
  const [refreshing, setRefreshing] = useState(false)
  const { accounts, categories, transactions, credit_cards: creditCards = [] } = data

  const totals = useMemo(() => monthTotals(transactions, ym), [transactions, ym])
  const sections = useMemo(() => {
    const rows = sortNewestFirst(dedupeTransfers(listableTransactions(transactions))).filter((t) => t.date?.startsWith(ym))
    const byDay = new Map()
    for (const t of rows) {
      if (!byDay.has(t.date)) byDay.set(t.date, [])
      byDay.get(t.date).push(t)
    }
    return [...byDay.entries()].map(([date, items]) => {
      const net = items.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : t.type === 'expense' ? -Number(t.amount) : 0), 0)
      return { title: dayLabel(date), net, data: items }
    })
  }, [transactions, ym])

  if (loading) return <Loading />
  const [y, m] = ym.split('-').map(Number)
  const isCurrentMonth = ym === todayISO().slice(0, 7)

  return (
    <View style={[ui.screen, { paddingTop: insets.top }]}>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false) }}
        ListHeaderComponent={(
          <View>
            <View style={ui.header}><Text style={ui.title}>Transactions</Text></View>
            <ErrorBanner message={error} onRetry={refresh} />
            <View style={styles.monthBar}>
              <Pressable hitSlop={10} onPress={() => setYm(shiftMonth(ym, -1))}><Feather name="chevron-left" size={22} color={colors.textMuted} /></Pressable>
              <Text style={styles.monthText}>{MONTH_NAMES[m - 1]} {y}</Text>
              <Pressable hitSlop={10} disabled={isCurrentMonth} onPress={() => setYm(shiftMonth(ym, 1))}><Feather name="chevron-right" size={22} color={isCurrentMonth ? colors.border : colors.textMuted} /></Pressable>
            </View>
            <View style={styles.totals}>
              <Text style={[styles.total, { color: colors.income }]}>+{money(totals.income)}</Text>
              <Text style={[styles.total, { color: colors.expense }]}>−{money(totals.expense)}</Text>
            </View>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{section.title}</Text>
            <Text style={[styles.dayTitle, { color: section.net >= 0 ? colors.income : colors.expense }]}>{section.net >= 0 ? '+' : '−'}{money(Math.abs(section.net))}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TransactionRow t={item} accounts={accounts} categories={categories} creditCards={creditCards} onPress={() => router.push({ pathname: '/transaction', params: { id: item.id } })} />
        )}
        ListEmptyComponent={<EmptyState icon="list" title="Nothing this month" message="Transactions you add for this month show up here." />}
      />
      <Pressable onPress={() => router.push('/transaction')} style={[styles.fab, { backgroundColor: accent, bottom: 20 }]} accessibilityLabel="Add transaction">
        <Feather name="plus" size={26} color="#07101c" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: 48 },
  monthText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  totals: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12, marginBottom: 4 },
  total: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 6 },
  dayTitle: { color: colors.textFaint, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  fab: { position: 'absolute', right: 20, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 6 },
})
