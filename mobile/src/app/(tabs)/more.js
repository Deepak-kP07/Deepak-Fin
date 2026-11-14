import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Screen, SectionLabel, styles as ui } from '../../components/ui'
import { useAuth } from '../../state/AuthProvider'
import { useData } from '../../state/DataProvider'
import { API_URL, api } from '../../lib/api'
import { colors } from '../../lib/theme'

// Modules not rebuilt natively yet — they open the web app until their native screens land.
const WEB_MODULES = [
  { label: 'Credit cards', icon: 'credit-card' },
  { label: 'Investments', icon: 'trending-up' },
  { label: 'Loans', icon: 'briefcase' },
  { label: 'Lend / Borrow', icon: 'heart' },
  { label: 'Budgets', icon: 'target' },
  { label: 'Family / Company', icon: 'users' },
  { label: 'Chit funds', icon: 'layers' },
  { label: 'Scholarships', icon: 'award' },
  { label: 'Bucket list', icon: 'flag' },
  { label: 'Vault', icon: 'lock' },
  { label: 'Settings', icon: 'settings' },
]

function LinkRow({ icon, label, onPress, color }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Feather name={icon} size={18} color={color || colors.textMuted} />
      <Text style={[styles.rowText, color && { color }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.textFaint} />
    </Pressable>
  )
}

export default function More() {
  const { user, signOut } = useAuth()
  const { data } = useData()
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const name = data.profile?.full_name || user?.user_metadata?.full_name || ''

  const openWeb = (path = '/') => WebBrowser.openBrowserAsync(`${API_URL}${path}`)

  const deleteAccount = async () => {
    setBusy(true)
    try {
      await api('/account/delete', { method: 'POST', body: { confirm: 'DELETE' } })
      await signOut()
      Alert.alert('Account deleted', 'Your Personal Fin account and all of its data have been permanently deleted.')
    } catch (e) {
      Alert.alert('Could not delete your account', e.message)
    } finally { setBusy(false) }
  }

  return (
    <Screen title="More">
      <Card>
        <Text style={styles.name}>{name || 'Your profile'}</Text>
        <Text style={ui.muted}>{user?.email}</Text>
      </Card>

      <SectionLabel>On the web for now</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {WEB_MODULES.map((m) => <LinkRow key={m.label} icon={m.icon} label={m.label} onPress={() => openWeb('/')} />)}
      </Card>
      <Text style={[ui.muted, { marginTop: 8, fontSize: 12 }]}>These open personalfin.site. Native screens for them are coming in the next updates.</Text>

      <SectionLabel>Account</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        <LinkRow icon="shield" label="Privacy policy" onPress={() => openWeb('/privacy')} />
        <LinkRow icon="log-out" label="Sign out" onPress={() => Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: signOut }])} />
        <LinkRow icon="trash-2" label="Delete account" color={colors.danger} onPress={() => { setConfirmText(''); setDeleting(true) }} />
      </Card>

      {deleting && (
        <Card style={{ marginTop: 12, borderColor: 'rgba(251,113,133,0.3)' }}>
          <Text style={styles.dangerTitle}>Delete your account?</Text>
          <Text style={[ui.muted, { marginTop: 6, lineHeight: 19 }]}>This permanently erases your login, every record across the app, and every file you uploaded. It can't be undone.</Text>
          <Text style={[ui.muted, { marginTop: 14 }]}>Type DELETE to confirm</Text>
          <TextInput value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" placeholderTextColor={colors.textFaint} style={[ui.input, { marginTop: 6 }]} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setDeleting(false)} style={{ flex: 1 }} />
            <Button label="Delete" variant="danger" icon="trash-2" busy={busy} disabled={confirmText.trim() !== 'DELETE'} onPress={deleteAccount} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50 },
  rowText: { color: colors.text, fontSize: 15, flex: 1 },
  dangerTitle: { color: colors.danger, fontSize: 16, fontWeight: '600' },
})
