import { Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Card, EmptyState, ListRow, ProgressBar, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { dateToLocalISO, dayLabel, money } from '../../../lib/format'
import { nextChitFundDueDate } from '../../../lib/shared'
import { chitMonthsPaid, chitNetPaid, chitPayments } from '../../../lib/modules'
import { colors } from '../../../lib/theme'

export default function ChitFundDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data } = useData()
  const fund = (data.chit_funds || []).find((c) => c.id === id)
  if (!fund) return <Screen title="Chit fund" back><EmptyState title="Chit fund not found" /></Screen>
  const all = data.chit_fund_payments || []
  const months = chitMonthsPaid(all, id)
  const total = Number(fund.duration_months || 0)
  const netPaid = chitNetPaid(all, id)
  const next = fund.status !== 'completed' ? nextChitFundDueDate(fund, months) : null
  const payments = [...chitPayments(all, id)].sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))

  return (
    <Screen title={fund.name} back>
      <Card>
        <Text style={ui.muted}>Paid in so far (after dividends)</Text>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{money(netPaid)}</Text>
        <ProgressBar pct={total > 0 ? (months / total) * 100 : 0} />
        <Text style={[ui.muted, { marginTop: 8 }]}>{months} of {total} months · {money(fund.monthly_contribution)} a month</Text>
      </Card>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Stat label="Next due" value={next ? dayLabel(dateToLocalISO(next)) : '—'} />
        <Stat label="Payout" value={fund.payout_status === 'taken' ? money(fund.payout_amount) : 'Not taken'} color={fund.payout_status === 'taken' ? colors.income : undefined} />
      </View>
      {fund.status !== 'completed' && months < total && <Button label="Log payment" icon="check-circle" style={{ marginTop: 14 }} onPress={() => router.push({ pathname: '/forms/chit-payment', params: { id } })} />}
      <SectionLabel>Payments</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {payments.length === 0 ? <EmptyState icon="list" title="No payments yet" /> : payments.map((p, i) => (
          <ListRow key={p.id} title={dayLabel(p.payment_date)} detail={Number(p.dividend_received) > 0 ? `Dividend ${money(p.dividend_received)}` : null} value={money(p.amount)} last={i === payments.length - 1} />
        ))}
      </Card>
      <Text style={[ui.muted, { marginTop: 10, fontSize: 12 }]}>Taking the payout, editing payments and completing the fund are on the web app for now.</Text>
    </Screen>
  )
}
