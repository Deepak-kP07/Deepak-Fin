import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Card, EmptyState, ListRow, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { dayLabel, money } from '../../../lib/format'
import { perspectiveType } from '../../../lib/shared'
import { colors } from '../../../lib/theme'
import { pendingOf } from '../../../lib/modules'



export default function LendBorrow() {
  const router = useRouter()
  const { data } = useData()
  const records = data.lend_borrow || []
  // A record shared with you is shown from your side: their "lent" is your "borrowed".
  const lent = records.filter((r) => perspectiveType(r) === 'lent')
  const borrowed = records.filter((r) => perspectiveType(r) === 'borrowed')
  const open = (list) => list.filter((r) => r.status !== 'returned')
  const sum = (list) => open(list).reduce((s, r) => s + pendingOf(r), 0)

  const section = (label, list) => {
    if (list.length === 0) return null
    const sorted = [...list].sort((a, b) => (a.status === 'returned') - (b.status === 'returned') || (b.date || '').localeCompare(a.date || ''))
    return (
      <>
        <SectionLabel>{label}</SectionLabel>
        <Card style={{ paddingVertical: 2 }}>
          {sorted.map((r, i) => (
            <ListRow
              key={r.id}
              title={r.person_name}
              detail={[r.status === 'returned' ? 'Settled' : r.status === 'partial' ? `Part paid · ${money(r.amount_repaid)} of ${money(r.amount)}` : `of ${money(r.amount)}`, r.due_date && r.status !== 'returned' && `due ${dayLabel(r.due_date)}`, r.my_role && r.my_role !== 'owner' && 'Shared with you'].filter(Boolean).join(' · ')}
              value={r.status === 'returned' ? '✓' : money(pendingOf(r))}
              valueColor={r.status === 'returned' ? colors.textFaint : perspectiveType(r) === 'lent' ? colors.income : colors.expense}
              onPress={() => router.push(`/lend/${r.id}`)}
              last={i === sorted.length - 1}
            />
          ))}
        </Card>
      </>
    )
  }

  return (
    <Screen title="Lend / Borrow" back>
      <View style={ui.row}>
        <Stat label="Owed to you" value={money(sum(lent))} color={colors.income} />
        <Stat label="You owe" value={money(sum(borrowed))} color={colors.expense} />
      </View>
      <Button label="New record" icon="plus" style={{ marginTop: 14 }} onPress={() => router.push('/forms/lend-record')} />
      {records.length === 0 ? <EmptyState icon="heart" title="Nothing here yet" message="Record money you lent or borrowed, then log repayments as they come in." /> : (
        <>
          {section('Lent', lent)}
          {section('Borrowed', borrowed)}
        </>
      )}
    </Screen>
  )
}
