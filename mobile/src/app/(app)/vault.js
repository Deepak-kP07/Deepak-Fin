import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { Card, EmptyState, Screen, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { api } from '../../lib/api'
import { colors } from '../../lib/theme'

const TYPE_LABEL = { bank_account: 'Bank account', debit_card: 'Debit card', credit_card: 'Credit card' }
const group = (v) => String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

// Vault items show masked; tapping reveals the decrypted details for this item only (the
// server's reveal route), and they're dropped again when you leave the screen.
function VaultItem({ item }) {
  const [secrets, setSecrets] = useState(null)
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    if (secrets) { setSecrets(null); return }
    setBusy(true)
    try { const res = await api(`/finance/vault_items/${item.id}/reveal`, { method: 'POST' }); setSecrets(res.secrets || {}) }
    catch (e) { Alert.alert('Could not reveal', e.message) } finally { setBusy(false) }
  }
  const isBank = item.item_type === 'bank_account'
  return (
    <Card style={{ marginBottom: 10, borderLeftWidth: 3, borderLeftColor: item.color || colors.border }}>
      <Pressable onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.label}</Text>
          <Text style={[ui.muted, { marginTop: 2 }]}>{[TYPE_LABEL[item.item_type], item.bank_name, item.last4 && `•• ${item.last4}`].filter(Boolean).join(' · ')}</Text>
        </View>
        {busy ? <ActivityIndicator color={colors.textMuted} /> : <Feather name={secrets ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />}
      </Pressable>
      {secrets && (
        <View style={{ marginTop: 12, gap: 6 }}>
          {secrets.holder_name ? <Text style={ui.muted}>Holder: <Text style={{ color: colors.text }}>{secrets.holder_name}</Text></Text> : null}
          {isBank ? (
            <>
              <Text selectable style={{ color: colors.text, fontSize: 16, letterSpacing: 1.5, fontVariant: ['tabular-nums'] }}>{secrets.account_number || '—'}</Text>
              {secrets.ifsc_code ? <Text selectable style={ui.muted}>IFSC: <Text style={{ color: colors.text }}>{secrets.ifsc_code}</Text></Text> : null}
              {secrets.branch ? <Text style={ui.muted}>Branch: <Text style={{ color: colors.text }}>{secrets.branch}</Text></Text> : null}
            </>
          ) : (
            <>
              <Text selectable style={{ color: colors.text, fontSize: 16, letterSpacing: 1.5, fontVariant: ['tabular-nums'] }}>{group(secrets.card_number) || '—'}</Text>
              <Text style={ui.muted}>Expiry: <Text style={{ color: colors.text }}>{secrets.expiry_month || '--'}/{secrets.expiry_year || '--'}</Text></Text>
            </>
          )}
          {secrets.notes ? <Text style={ui.muted}>{secrets.notes}</Text> : null}
        </View>
      )}
    </Card>
  )
}

export default function Vault() {
  // Block screenshots and the recent-apps preview while card/account numbers can be on screen.
  usePreventScreenCapture()
  const { data } = useData()
  const items = [...(data.vault_items || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  return (
    <Screen title="Vault" back>
      <Text style={[ui.muted, { marginBottom: 12 }]}>Encrypted on the server. Tap an item to show its details.</Text>
      {items.length === 0 ? <EmptyState icon="lock" title="Vault is empty" message="Add bank accounts and cards to the vault on the web app." /> : items.map((it) => <VaultItem key={it.id} item={it} />)}
    </Screen>
  )
}
