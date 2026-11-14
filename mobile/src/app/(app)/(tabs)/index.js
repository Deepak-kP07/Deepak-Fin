import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, EmptyState, ErrorBanner, Loading, Screen, SectionLabel, styles as ui } from '../../../components/ui'
import { TransactionRow } from '../../../components/TransactionRow'
import { useData } from '../../../state/DataProvider'
import { useAuth } from '../../../state/AuthProvider'
import { MONTH_NAMES, capitalizeFirst, money, todayISO } from '../../../lib/format'
import { dedupeTransfers, listableTransactions, monthTotals, sortNewestFirst } from '../../../lib/transactions'
import { colors } from '../../../lib/theme'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const { data, loading, error, refresh, accent } = useData()
  const [refreshing, setRefreshing] = useState(false)
  const [showMoney, setShowMoney] = useState(true)
  const { accounts, categories, transactions, credit_cards: creditCards = [], profile } = data

  const ym = todayISO().slice(0, 7)
  const month = useMemo(() => monthTotals(transactions, ym), [transactions, ym])
  // Debit cards share their linked bank account's balance, so they're not added twice.
  const cashAndBank = accounts.filter((a) => a.type !== 'debit_card').reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const cardDues = creditCards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const recent = useMemo(() => sortNewestFirst(dedupeTransfers(listableTransactions(transactions))).slice(0, 6), [transactions])

  if (loading) return <Loading />
  const firstName = (profile?.full_name || user?.user_metadata?.full_name || user?.email || '').split(/[ @]/)[0]
  const show = (v) => (showMoney ? money(v) : '••••')
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false) }

  return (
    <Screen
      title={firstName ? `Hi, ${capitalizeFirst(firstName)}` : 'Home'}
      right={<Pressable hitSlop={12} onPress={() => setShowMoney((v) => !v)}><Feather name={showMoney ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} /></Pressable>}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ErrorBanner message={error} onRetry={refresh} />
      <Card>
        <Text style={ui.muted}>Bank & cash balance</Text>
        <Text style={styles.hero}>{show(cashAndBank)}</Text>
        {cardDues > 0 && <Text style={[ui.muted, { marginTop: 6 }]}>Credit card dues {show(cardDues)}</Text>}
        <Pressable onPress={() => router.push('/transaction')} style={[styles.addButton, { backgroundColor: accent }]}>
          <Feather name="plus" size={16} color="#07101c" />
          <Text style={styles.addText}>Add transaction</Text>
        </Pressable>
      </Card>

      <SectionLabel>{MONTH_NAMES[Number(ym.slice(5, 7)) - 1]}</SectionLabel>
      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={ui.muted}>Income</Text><Text style={[styles.statValue, { color: colors.income }]}>{show(month.income)}</Text></Card>
        <Card style={styles.stat}><Text style={ui.muted}>Spent</Text><Text style={[styles.statValue, { color: colors.expense }]}>{show(month.expense)}</Text></Card>
      </View>
      <Card style={{ marginTop: 10 }}>
        <Text style={ui.muted}>Saved this month</Text>
        <Text style={[styles.statValue, { color: month.net >= 0 ? colors.income : colors.expense }]}>{show(month.net)}</Text>
      </Card>

      <View style={styles.sectionRow}>
        <SectionLabel>Recent</SectionLabel>
        <Pressable hitSlop={8} onPress={() => router.push('/transactions')}><Text style={[ui.muted, { marginTop: 14 }]}>See all</Text></Pressable>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {recent.length === 0 ? (
          <EmptyState icon="list" title="No transactions yet" message="Add your first income or expense to see it here." />
        ) : recent.map((t) => (
          <TransactionRow key={t.id} t={t} accounts={accounts} categories={categories} creditCards={creditCards} onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })} />
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { color: colors.text, fontSize: 34, fontWeight: '700', marginTop: 6, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  addButton: { marginTop: 18, minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { color: '#07101c', fontWeight: '700', fontSize: 15 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
