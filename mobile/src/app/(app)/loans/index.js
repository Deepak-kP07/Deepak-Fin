import { Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Card, EmptyState, ListRow, Screen, SectionLabel, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { dayLabel, money } from '../../../lib/format'
import { liveOutstanding, nextLoanDueDate } from '../../../lib/shared'
import { colors } from '../../../lib/theme'

export default function Loans() {
  const router = useRouter()
  const { data } = useData()
  const loans = data.loans || []
  const payments = data.loan_payments || []
  const active = loans.filter((l) => l.status !== 'closed')
  const closed = loans.filter((l) => l.status === 'closed')
  const paymentsFor = (l) => payments.filter((p) => p.loan_id === l.id)
  const total = active.reduce((s, l) => s + liveOutstanding(l, paymentsFor(l)), 0)
  const monthlyEmi = active.reduce((s, l) => s + Number(l.emi_amount || 0), 0)

  const row = (l, i, list) => {
    const due = l.status !== 'closed' ? nextLoanDueDate(l, new Date(), paymentsFor(l)) : null
    return (
      <ListRow
        key={l.id}
        title={l.name}
        detail={[l.lender, l.status === 'closed' ? 'Closed' : `EMI ${money(l.emi_amount)}`, due && `next ${dayLabel(due)}`].filter(Boolean).join(' · ')}
        value={money(l.status === 'closed' ? 0 : liveOutstanding(l, paymentsFor(l)))}
        valueColor={l.status === 'closed' ? colors.textFaint : colors.expense}
        onPress={() => router.push(`/loans/${l.id}`)}
        last={i === list.length - 1}
      />
    )
  }

  return (
    <Screen title="Loans" back>
      {loans.length === 0 ? <EmptyState icon="briefcase" title="No loans" message="Add loans on the web app — they show up here." /> : (
        <>
          <Card>
            <Text style={ui.muted}>Total outstanding today</Text>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{money(total)}</Text>
            <Text style={[ui.muted, { marginTop: 6 }]}>{money(monthlyEmi)} in EMIs every month</Text>
          </Card>
          {active.length > 0 && <><SectionLabel>Active</SectionLabel><Card style={{ paddingVertical: 2 }}>{active.map(row)}</Card></>}
          {closed.length > 0 && <><SectionLabel>Closed</SectionLabel><Card style={{ paddingVertical: 2 }}>{closed.map(row)}</Card></>}
        </>
      )}
    </Screen>
  )
}
