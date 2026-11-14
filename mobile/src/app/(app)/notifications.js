import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, Switch, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Card, EmptyState, ListRow, Screen, SectionLabel, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { api } from '../../lib/api'
import { disablePush, enablePush, pushPermissionStatus, routeForView } from '../../lib/push'
import { colors } from '../../lib/theme'

const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.round(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`
}

// Push on/off for this phone, plus the same in-app notification list as the web bell.
export default function NotificationsScreen() {
  const router = useRouter()
  const { accent } = useData()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    setStatus(await pushPermissionStatus().catch(() => 'undetermined'))
    try { const res = await api('/finance/notifications'); setItems(res.items || []) } catch { setItems([]) }
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const toggle = async (on) => {
    setBusy(true)
    try {
      if (on) {
        const ok = await enablePush()
        if (!ok) Alert.alert('Notifications are off', 'Allow notifications for Personal Fin in Android settings to get reminders.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }])
      } else {
        await disablePush({ optOut: true })
      }
      setStatus(await pushPermissionStatus())
    } catch (e) { Alert.alert('Could not update notifications', e.message) } finally { setBusy(false) }
  }

  const open = async (n) => {
    if (!n.read_at) api('/finance/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => {})
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
    if (n.view) router.push(routeForView(n.view))
  }
  const markAll = async () => {
    await api('/finance/notifications/read', { method: 'POST', body: { all: true } }).catch(() => {})
    setItems((list) => list.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
  }
  const unread = (items || []).filter((n) => !n.read_at).length

  return (
    <Screen title="Notifications" back right={unread > 0 ? <Pressable hitSlop={10} onPress={markAll}><Text style={ui.muted}>Mark all read</Text></Pressable> : null}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>Push reminders on this phone</Text>
            <Text style={[ui.muted, { marginTop: 2 }]}>Bills, EMIs, chit fund dues and budget alerts.</Text>
          </View>
          <Switch value={status === 'on'} disabled={busy || status === null} onValueChange={toggle} trackColor={{ true: accent }} />
        </View>
      </Card>
      <SectionLabel>Recent</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {items === null ? <Text style={[ui.muted, { padding: 12 }]}>Loading…</Text> : items.length === 0 ? <EmptyState icon="bell" title="You're all caught up" /> : items.map((n, i) => (
          <ListRow key={n.id} dot={n.read_at ? colors.border : accent} title={n.title} detail={[n.body, ago(n.created_at)].filter(Boolean).join(' · ')} onPress={() => open(n)} last={i === items.length - 1} />
        ))}
      </Card>
    </Screen>
  )
}
