import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card, EmptyState, ErrorBanner, Loading, Screen, SectionLabel, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { money } from '../../lib/format'
import { colors } from '../../lib/theme'

const TYPE_LABEL = { bank: 'Bank', cash: 'Cash', wallet: 'Wallet', debit_card: 'Debit card' }

function Row({ name, detail, amount, amountColor, dot }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dot || colors.textFaint }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      {amount != null && <Text style={[styles.amount, amountColor && { color: amountColor }]}>{amount}</Text>}
    </View>
  )
}

export default function Accounts() {
  const { data, loading, error, refresh } = useData()
  const [refreshing, setRefreshing] = useState(false)
  if (loading) return <Loading />
  const accounts = data.accounts.filter((a) => a.is_active !== false)
  const balanceAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCards = accounts.filter((a) => a.type === 'debit_card')
  const cards = data.credit_cards || []
  const total = balanceAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)

  return (
    <Screen title="Accounts" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false) }}>
      <ErrorBanner message={error} onRetry={refresh} />
      <Card>
        <Text style={ui.muted}>Total balance</Text>
        <Text style={styles.total}>{money(total)}</Text>
      </Card>

      <SectionLabel>Bank, cash & wallets</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {balanceAccounts.length === 0 ? <EmptyState icon="credit-card" title="No accounts yet" message="Add accounts on the web app for now — they show up here automatically." /> : balanceAccounts.map((a) => (
          <Row key={a.id} name={a.name} dot={a.color} detail={[TYPE_LABEL[a.type] || a.type, a.bank_name, a.account_number_last4 && `•• ${a.account_number_last4}`].filter(Boolean).join(' · ')} amount={money(a.current_balance)} amountColor={Number(a.current_balance) < 0 ? colors.expense : undefined} />
        ))}
      </Card>

      {debitCards.length > 0 && (
        <>
          <SectionLabel>Debit cards</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            {debitCards.map((c) => (
              <Row key={c.id} name={c.name} dot={c.color} detail={`Draws from ${accounts.find((a) => a.id === c.linked_account_id)?.name || 'a bank account'}`} />
            ))}
          </Card>
        </>
      )}

      {cards.length > 0 && (
        <>
          <SectionLabel>Credit cards</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            {cards.map((c) => {
              const limit = Number(c.credit_limit || 0)
              const used = Number(c.current_outstanding || 0)
              return <Row key={c.id} name={c.name} dot={c.color} detail={limit > 0 ? `${Math.round((used / limit) * 100)}% of ${money(limit)} used` : 'Outstanding'} amount={money(used)} amountColor={used > 0 ? colors.expense : undefined} />
            })}
          </Card>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  total: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { color: colors.text, fontSize: 15, fontWeight: '500' },
  detail: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
})
