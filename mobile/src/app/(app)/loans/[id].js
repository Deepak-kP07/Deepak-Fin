import { Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Card, EmptyState, ListRow, ProgressBar, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { dayLabel, money } from '../../../lib/format'
import { liveOutstanding, nextLoanDueDate, paymentTypeLabel } from '../../../lib/shared'
import { colors } from '../../../lib/theme'

export default function LoanDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data } = useData()
  const loan = (data.loans || []).find((l) => l.id === id)
  if (!loan) return <Screen title="Loan" back><EmptyState title="Loan not found" /></Screen>
  const payments = (data.loan_payments || []).filter((p) => p.loan_id === loan.id)
    .sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '') || String(b.created_at).localeCompare(String(a.created_at)))
  const outstanding = loan.status === 'closed' ? 0 : liveOutstanding(loan, payments)
  const principal = Number(loan.principal || 0)
  const repaidPct = principal > 0 ? ((principal - outstanding) / principal) * 100 : 0
  const due = loan.status !== 'closed' ? nextLoanDueDate(loan, new Date(), payments) : null
  const interestSaved = Number(loan.interest_saved || 0)

  return (
    <Screen title={loan.name} back>
      <Card>
        <Text style={ui.muted}>Outstanding today{loan.lender ? ` · ${loan.lender}` : ''}</Text>
        <Text style={{ color: loan.status === 'closed' ? colors.income : colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{loan.status === 'closed' ? 'Closed' : money(outstanding)}</Text>
        <ProgressBar pct={repaidPct} color={colors.income} />
        <Text style={[ui.muted, { marginTop: 8 }]}>{Math.round(repaidPct)}% of {money(principal)} repaid · {Number(loan.interest_rate || 0)}% a year</Text>
      </Card>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Stat label="EMI" value={money(loan.emi_amount)} />
        <Stat label="Next due" value={due ? dayLabel(due) : '—'} />
      </View>
      {interestSaved > 0 && <Card style={{ marginTop: 10 }}><Text style={ui.muted}>Interest saved by prepaying</Text><Text style={{ color: colors.income, fontSize: 20, fontWeight: '700', marginTop: 6 }}>{money(interestSaved)}</Text></Card>}
      {loan.status !== 'closed' && <Button label="Log payment" icon="check-circle" style={{ marginTop: 14 }} onPress={() => router.push({ pathname: '/forms/loan-payment', params: { id: loan.id } })} />}

      <SectionLabel>Payments</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {payments.length === 0 ? <EmptyState icon="list" title="No payments yet" /> : payments.map((p, i) => (
          <ListRow
            key={p.id}
            title={paymentTypeLabel(p)}
            detail={[dayLabel(p.payment_date), Number(p.interest_saved) > 0 && `saved ${money(p.interest_saved)}`].filter(Boolean).join(' · ')}
            value={money(p.amount)}
            valueColor={p.type === 'adjustment' ? colors.textMuted : undefined}
            last={i === payments.length - 1}
          />
        ))}
      </Card>
      <Text style={[ui.muted, { marginTop: 10, fontSize: 12 }]}>To reverse a payment or sync with your lender, use the Loans page on the web app.</Text>
    </Screen>
  )
}
