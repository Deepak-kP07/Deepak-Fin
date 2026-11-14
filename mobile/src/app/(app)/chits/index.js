import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Card, EmptyState, ListRow, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { money } from '../../../lib/format'
import { chitMonthsPaid, chitNetPaid } from '../../../lib/modules'
import { colors } from '../../../lib/theme'

export default function ChitFunds() {
  const router = useRouter()
  const { data } = useData()
  const funds = data.chit_funds || []
  const payments = data.chit_fund_payments || []
  const active = funds.filter((c) => c.status !== 'completed')
  const done = funds.filter((c) => c.status === 'completed')
  const receivable = active.filter((c) => c.payout_status === 'not_taken').reduce((s, c) => s + chitNetPaid(payments, c.id), 0)
  const stillToPay = active.reduce((s, c) => s + Math.max(0, Number(c.duration_months) - chitMonthsPaid(payments, c.id)) * Number(c.monthly_contribution), 0)

  const row = (c, i, list) => {
    const months = chitMonthsPaid(payments, c.id)
    return (
      <ListRow
        key={c.id}
        title={c.name}
        detail={[`${months} of ${c.duration_months} months paid`, c.payout_status === 'taken' ? 'Payout taken' : null, c.status === 'completed' ? 'Completed' : null].filter(Boolean).join(' · ')}
        value={money(c.monthly_contribution)}
        subValue="a month"
        onPress={() => router.push(`/chits/${c.id}`)}
        last={i === list.length - 1}
      />
    )
  }

  return (
    <Screen title="Chit funds" back>
      {funds.length === 0 ? <EmptyState icon="layers" title="No chit funds" message="Add chit funds on the web app — they show up here." /> : (
        <>
          <View style={ui.row}>
            <Stat label="Paid in, not yet taken" value={money(receivable)} color={colors.income} />
            <Stat label="Still to pay" value={money(stillToPay)} />
          </View>
          {active.length > 0 && <><SectionLabel>Active</SectionLabel><Card style={{ paddingVertical: 2 }}>{active.map(row)}</Card></>}
          {done.length > 0 && <><SectionLabel>Completed</SectionLabel><Card style={{ paddingVertical: 2 }}>{done.map(row)}</Card></>}
        </>
      )}
    </Screen>
  )
}
