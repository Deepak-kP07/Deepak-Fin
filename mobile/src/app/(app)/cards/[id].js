import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Card, EmptyState, ListRow, ProgressBar, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { capitalizeFirst, dayLabel, money } from '../../../lib/format'
import { isBillPaidThisCycle, nextBillDue, utilisationSeverity } from '../../../lib/shared'
import { colors, severityColor } from '../../../lib/theme'

export default function CreditCardDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data } = useData()
  const card = (data.credit_cards || []).find((c) => c.id === id)

  // Card activity = spends logged against the card (transactions linked to it) and bill payments
  // into it, newest first. Same two sources as the web CreditCardDetailView.
  const activity = useMemo(() => {
    if (!card) return []
    return data.transactions
      .filter((t) => (t.linked_module === 'credit_card' || t.linked_module === 'credit_card_bill_payment') && t.linked_module_id === card.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.time || '').localeCompare(String(a.time || '')))
      .slice(0, 60)
  }, [data.transactions, card])

  if (!card) return <Screen title="Credit card" back><EmptyState title="Card not found" /></Screen>
  const used = Number(card.current_outstanding || 0)
  const limit = Number(card.credit_limit || 0)
  const util = limit > 0 ? (used / limit) * 100 : 0
  const sev = utilisationSeverity(util)
  const { due, days } = nextBillDue(card)
  const paid = isBillPaidThisCycle(card, data.transactions)
  const dueISO = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`

  return (
    <Screen title={card.name} back>
      <Card>
        <Text style={ui.muted}>Outstanding</Text>
        <Text style={{ color: used > 0 ? colors.expense : colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{money(used)}</Text>
        {limit > 0 && (
          <>
            <ProgressBar pct={util} color={severityColor(sev.label)} />
            <Text style={[ui.muted, { marginTop: 8 }]}>{Math.round(util)}% of {money(limit)} · {money(Math.max(0, limit - used))} available</Text>
          </>
        )}
      </Card>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Stat label="Bill due" value={dayLabel(dueISO)} />
        <Stat label={paid ? 'This cycle' : 'Days left'} value={paid ? 'Paid' : String(days)} color={paid ? colors.income : days <= 3 ? colors.expense : undefined} />
      </View>
      <View style={[ui.row, { marginTop: 14 }]}>
        <Button label="Pay bill" icon="check-circle" onPress={() => router.push({ pathname: '/forms/pay-card', params: { id: card.id } })} style={{ flex: 1 }} />
        <Button label="Add spend" icon="plus" variant="secondary" onPress={() => router.push({ pathname: '/transaction', params: { source: `cc:${card.id}` } })} style={{ flex: 1 }} />
      </View>

      <SectionLabel>Activity</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {activity.length === 0 ? <EmptyState icon="list" title="No activity yet" /> : activity.map((t, i) => {
          const isPayment = t.linked_module === 'credit_card_bill_payment'
          const refund = !isPayment && t.type === 'income'
          return (
            <ListRow
              key={t.id}
              title={isPayment ? 'Bill payment' : capitalizeFirst(t.description) || 'Spend'}
              detail={dayLabel(t.date)}
              value={`${isPayment || refund ? '−' : '+'}${money(t.amount)}`}
              valueColor={isPayment || refund ? colors.income : colors.expense}
              onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })}
              last={i === activity.length - 1}
            />
          )
        })}
      </Card>
    </Screen>
  )
}
