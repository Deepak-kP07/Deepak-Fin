import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Card, EmptyState, ListRow, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { capitalizeFirst, dayLabel, money } from '../../../lib/format'
import { categoriesFor, profileTotals } from '../../../lib/shared'
import { colors } from '../../../lib/theme'

const SIGN = { income: '+', capital: '+', expense: '−' }
const COLOR = { income: colors.income, capital: '#93c5fd', expense: colors.expense }

export default function MoneyProfileDetail() {
  const { id } = useLocalSearchParams()
  const { data } = useData()
  const profile = (data.money_profiles || []).find((p) => p.id === id)
  if (!profile) return <Screen title="Profile" back><EmptyState title="Profile not found" /></Screen>
  const entries = (data.money_profile_entries || []).filter((e) => e.profile_id === id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.created_at).localeCompare(String(a.created_at)))
  const totals = profileTotals(profile, entries)
  const cats = categoriesFor(profile, data.categories)
  const catName = (cid) => cats.find((c) => c.id === cid)?.name

  return (
    <Screen title={profile.name} back>
      <Card>
        <Stat label="Balance" value={money(totals.balance)} color={totals.balance < 0 ? colors.expense : undefined} style={{ borderWidth: 0, padding: 0, backgroundColor: 'transparent' }} />
      </Card>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Stat label="Income" value={money(totals.income)} color={colors.income} />
        <Stat label="Capital" value={money(totals.capital)} color={COLOR.capital} />
        <Stat label="Spent" value={money(totals.expense)} color={colors.expense} />
      </View>
      <SectionLabel>Entries</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {entries.length === 0 ? <EmptyState icon="list" title="No entries yet" /> : entries.slice(0, 100).map((e, i, list) => (
          <ListRow key={e.id} title={capitalizeFirst(e.description) || catName(e.category_id) || 'Entry'} detail={[dayLabel(e.date), catName(e.category_id), e.paid_party].filter(Boolean).join(' · ')} value={`${SIGN[e.entry_type] || ''}${money(e.amount)}`} valueColor={COLOR[e.entry_type]} last={i === list.length - 1} />
        ))}
      </Card>
      <Text style={[ui.muted, { marginTop: 10, fontSize: 12 }]}>Adding and editing entries is on the web app for now.</Text>
    </Screen>
  )
}
