import { Alert, Linking, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, EmptyState, Screen, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { api } from '../../lib/api'
import { capitalizeFirst, money } from '../../lib/format'
import { colors } from '../../lib/theme'

// Same 30-day rule as the web bucket list: wait 30 days after adding something before buying it.
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

export default function BucketList() {
  const router = useRouter()
  const { data, refresh } = useData()
  const items = [...(data.bucket_list || [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))

  const remove = (b) => Alert.alert(`Remove "${b.title}"?`, '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      try { await api(`/finance/bucket_list/${b.id}`, { method: 'DELETE' }); await refresh() } catch (e) { Alert.alert('Could not remove', e.message) }
    } },
  ])

  return (
    <Screen title="Bucket list" back>
      <Button label="Add item" icon="plus" onPress={() => router.push('/forms/bucket-item')} />
      {items.length === 0 ? <EmptyState icon="flag" title="Nothing on your list" message="Add things you want to buy. Waiting 30 days first helps you skip impulse buys." /> : items.map((b) => {
        const waited = daysSince(b.created_at)
        const ready = waited >= 30
        return (
          <Card key={b.id} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{capitalizeFirst(b.title)}</Text>
                <Text style={[ui.muted, { marginTop: 4 }]}>{[b.estimated_cost ? money(b.estimated_cost) : null, ready ? 'Waited 30 days — your call' : `${30 - waited} day${30 - waited === 1 ? '' : 's'} left to wait`].filter(Boolean).join(' · ')}</Text>
                {b.reasons ? <Text style={[ui.muted, { marginTop: 6 }]}>{capitalizeFirst(b.reasons)}</Text> : null}
              </View>
              <View style={{ gap: 14 }}>
                {b.product_url ? <Pressable hitSlop={10} onPress={() => Linking.openURL(b.product_url)}><Feather name="external-link" size={17} color={colors.textMuted} /></Pressable> : null}
                <Pressable hitSlop={10} onPress={() => remove(b)}><Feather name="trash-2" size={17} color={colors.textFaint} /></Pressable>
              </View>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}
