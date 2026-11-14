import { useRouter } from 'expo-router'
import { Card, EmptyState, ListRow, Screen, SectionLabel } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { money } from '../../../lib/format'
import { PROFILE_TYPES, profileTotals } from '../../../lib/shared'
import { colors } from '../../../lib/theme'

export default function FamilyCompany() {
  const router = useRouter()
  const { data } = useData()
  const profiles = data.money_profiles || []
  const entries = data.money_profile_entries || []
  const typeLabel = (t) => PROFILE_TYPES.find((p) => p.value === t)?.label || t
  const section = (label, list) => list.length === 0 ? null : (
    <>
      <SectionLabel>{label}</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {list.map((p, i) => {
          const { balance } = profileTotals(p, entries.filter((e) => e.profile_id === p.id))
          return (
            <ListRow
              key={p.id}
              title={p.name}
              detail={[typeLabel(p.profile_type), p.my_role && p.my_role !== 'owner' ? 'Shared with you' : null].filter(Boolean).join(' · ')}
              value={money(balance)}
              valueColor={balance < 0 ? colors.expense : undefined}
              onPress={() => router.push(`/family/${p.id}`)}
              last={i === list.length - 1}
            />
          )
        })}
      </Card>
    </>
  )
  return (
    <Screen title="Family / Company" back>
      {profiles.length === 0 ? <EmptyState icon="users" title="No profiles yet" message="Track money you manage for family or a company. Add profiles on the web app." /> : (
        <>
          {section('Active', profiles.filter((p) => p.status !== 'closed'))}
          {section('Closed', profiles.filter((p) => p.status === 'closed'))}
        </>
      )}
    </Screen>
  )
}
