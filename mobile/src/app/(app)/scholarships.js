import { Card, EmptyState, ListRow, Screen } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { dayLabel, money } from '../../lib/format'
import { scholarshipDisplayStatus } from '../../lib/shared'
import { colors } from '../../lib/theme'

const STATUS = { pending: 'Pending', received: 'Received', partial: 'Part paid to college', paid: 'Paid to college' }

export default function Scholarships() {
  const { data } = useData()
  const list = [...(data.scholarships || [])].sort((a, b) => String(b.academic_year || '').localeCompare(String(a.academic_year || '')))
  return (
    <Screen title="Scholarships" back>
      {list.length === 0 ? <EmptyState icon="award" title="No scholarships" message="Add scholarships on the web app." /> : (
        <Card style={{ paddingVertical: 2 }}>
          {list.map((s, i) => {
            const status = scholarshipDisplayStatus(s)
            const owed = Math.max(0, Number(s.total_amount || 0) - Number(s.amount_paid_to_college || 0))
            return (
              <ListRow
                key={s.id}
                title={s.name}
                detail={[STATUS[status] || status, s.academic_year, s.due_date && status === 'pending' && `due ${dayLabel(s.due_date)}`].filter(Boolean).join(' · ')}
                value={money(s.total_amount)}
                subValue={status !== 'pending' && owed > 0 ? `${money(owed)} still to pay college` : null}
                valueColor={status === 'paid' ? colors.textFaint : undefined}
                last={i === list.length - 1}
              />
            )
          })}
        </Card>
      )}
    </Screen>
  )
}
