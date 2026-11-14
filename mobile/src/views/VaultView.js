import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { BankCardFace } from '../ui/BankCardFace'
import { EmptyState } from '../ui/EmptyState'
import { Field, FormSheet, Input, ColorPicker } from '../ui/FormKit'
import { Select } from '../ui/Select'
import { AccentGradient } from '../ui/Gradient'
import { tw } from '../lib/tw'
import { api } from '../lib/api'

// Native port of features/vault/VaultView.jsx + VaultCardFlip.jsx + VaultItemForm.jsx. Details are
// only decrypted on tap (the server's reveal route); screenshots are blocked on this screen.
const TABS = [{ key: 'bank_account', label: 'Bank accounts' }, { key: 'debit_card', label: 'Debit cards' }, { key: 'credit_card', label: 'Credit cards' }]
const group4 = (v) => String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

function VaultCard({ item, onEdit, onDelete }) {
  const [secrets, setSecrets] = useState(null)
  const [busy, setBusy] = useState(false)
  const isBank = item.item_type === 'bank_account'
  const reveal = async () => {
    if (secrets) return setSecrets(null)
    setBusy(true)
    try { const res = await api(`/finance/vault_items/${item.id}/reveal`, { method: 'POST' }); setSecrets(res.secrets || {}) } catch (e) { Alert.alert('Could not reveal', e.message) } finally { setBusy(false) }
  }
  const number = isBank ? secrets?.account_number : secrets?.card_number
  return (
    <View className="gap-2 self-center" style={{ width: '100%', maxWidth: 340 }}>
      <Pressable onPress={reveal}>
        <BankCardFace name={item.label} subtitle={item.bank_name || (isBank ? 'Bank account' : item.item_type === 'debit_card' ? 'Debit card' : 'Credit card')} last4={item.last4} color={item.color || '#22d3ee'}
          revealedNumber={number ? (isBank ? number : group4(number)) : undefined} holderName={secrets?.holder_name} />
        {busy ? <View className="absolute inset-0 items-center justify-center"><ActivityIndicator color="#fff" /></View> : null}
      </Pressable>
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[11px] text-slate-500">{secrets ? (isBank ? `IFSC ${secrets.ifsc_code || '—'}${secrets.branch ? ` · ${secrets.branch}` : ''}` : `Expiry ${secrets.expiry_month || '--'}/${secrets.expiry_year || '--'}`) : 'Tap the card to reveal'}</Text>
        <View className="flex-row gap-1">
          {number ? <Pressable onPress={() => Clipboard.setStringAsync(number)} className="rounded-lg p-1.5"><Icon as={Copy} size={13} className="text-slate-500" /></Pressable> : null}
          <Pressable onPress={() => onEdit(item)} className="rounded-lg p-1.5"><Icon as={Pencil} size={13} className="text-slate-500" /></Pressable>
          <Pressable onPress={() => onDelete(item)} className="rounded-lg p-1.5"><Icon as={Trash2} size={13} className="text-rose-300/70 light:text-rose-700" /></Pressable>
        </View>
      </View>
      {secrets?.notes ? <Text className="px-1 text-[11px] text-slate-400">{secrets.notes}</Text> : null}
    </View>
  )
}

function VaultItemForm({ open, onClose, onSaved, editing, defaultType, accounts }) {
  const empty = { item_type: defaultType, label: '', bank_name: '', color: '#22d3ee', linked_account_id: '', holder_name: '', account_number: '', ifsc_code: '', branch: '', card_number: '', expiry_month: '', expiry_year: '', notes: '' }
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [prefilling, setPrefilling] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  useEffect(() => {
    if (!open) return
    if (!editing) { setForm({ ...empty, item_type: defaultType }); return }
    setForm({ ...empty, ...editing, bank_name: editing.bank_name || '', linked_account_id: editing.linked_account_id || '' })
    setPrefilling(true)
    api(`/finance/vault_items/${editing.id}/reveal`, { method: 'POST' }).then((d) => setForm((f) => ({ ...f, ...(d.secrets || {}), card_number: group4(d.secrets?.card_number) }))).catch(() => {}).finally(() => setPrefilling(false))
  }, [open, editing])
  const isBank = form.item_type === 'bank_account'
  const save = async () => {
    if (!form.label.trim()) return Alert.alert('Enter a label')
    if (isBank ? !form.account_number || !form.ifsc_code : !form.card_number || !form.expiry_month || !form.expiry_year) return Alert.alert('Fill in the required details')
    setBusy(true)
    try {
      const secrets = isBank
        ? { holder_name: form.holder_name, account_number: form.account_number, ifsc_code: form.ifsc_code, branch: form.branch, notes: form.notes }
        : { holder_name: form.holder_name, card_number: form.card_number.replace(/\s+/g, ''), expiry_month: form.expiry_month, expiry_year: form.expiry_year, notes: form.notes }
      const last4 = String(isBank ? form.account_number : form.card_number).replace(/\s+/g, '').slice(-4)
      await api(editing ? `/finance/vault_items/${editing.id}` : '/finance/vault_items', { method: editing ? 'PATCH' : 'POST', body: { item_type: form.item_type, label: form.label, bank_name: form.bank_name || null, color: form.color, linked_account_id: form.linked_account_id || null, last4, secrets } })
      onSaved()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit vault item' : 'Add to vault'} submitLabel={busy ? 'Saving…' : editing ? 'Update' : 'Save to vault'} onSubmit={prefilling ? null : save} busy={busy}>
      {prefilling ? <Text className="py-10 text-center text-sm text-slate-500">Decrypting…</Text> : (
        <>
          <Field label="Type"><View className="mt-2"><Select value={form.item_type} onChange={(v) => set({ item_type: v })} options={[{ value: 'bank_account', label: 'Bank account' }, { value: 'debit_card', label: 'Debit card' }, { value: 'credit_card', label: 'Credit card' }]} /></View></Field>
          <Field label="Label"><Input value={form.label} onChangeText={(v) => set({ label: v })} placeholder={isBank ? 'HDFC Salary Account' : 'HDFC Millennia'} /></Field>
          <View className="flex-row gap-3">
            <Field label="Bank" style={{ flex: 1 }}><Input value={form.bank_name} onChangeText={(v) => set({ bank_name: v })} placeholder="HDFC Bank" /></Field>
            <Field label="Linked account" style={{ flex: 1 }}><View className="mt-2"><Select value={form.linked_account_id} onChange={(v) => set({ linked_account_id: v })} placeholder="None" options={[{ value: '', label: 'None' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} /></View></Field>
          </View>
          <Field label={isBank ? 'Account holder name' : 'Cardholder name'}><Input value={form.holder_name} onChangeText={(v) => set({ holder_name: v })} placeholder="As it appears on the card/passbook" /></Field>
          {isBank ? (
            <>
              <Field label="Account number"><Input keyboardType="number-pad" value={form.account_number} onChangeText={(v) => set({ account_number: v.replace(/\D/g, '') })} /></Field>
              <View className="flex-row gap-3">
                <Field label="IFSC code" style={{ flex: 1 }}><Input autoCapitalize="characters" value={form.ifsc_code} onChangeText={(v) => set({ ifsc_code: v.toUpperCase() })} placeholder="HDFC0001234" /></Field>
                <Field label="Branch" style={{ flex: 1 }}><Input value={form.branch} onChangeText={(v) => set({ branch: v })} placeholder="Koramangala" /></Field>
              </View>
            </>
          ) : (
            <>
              <Field label="Card number"><Input keyboardType="number-pad" value={form.card_number} onChangeText={(v) => set({ card_number: group4(v.replace(/\D/g, '').slice(0, 19)) })} placeholder="4111 1111 1111 1111" /></Field>
              <Field label="Expiry (MM/YY)">
                <View className="flex-row gap-2">
                  <Input className="w-16" maxLength={2} keyboardType="number-pad" value={form.expiry_month} onChangeText={(v) => set({ expiry_month: v.replace(/\D/g, '') })} placeholder="MM" />
                  <Input className="w-16" maxLength={2} keyboardType="number-pad" value={form.expiry_year} onChangeText={(v) => set({ expiry_year: v.replace(/\D/g, '') })} placeholder="YY" />
                </View>
              </Field>
            </>
          )}
          <Field label="Notes" optional><Input value={form.notes} onChangeText={(v) => set({ notes: v })} placeholder="Anything else worth remembering" /></Field>
          <Field label="Colour"><ColorPicker value={form.color} onChange={(c) => set({ color: c })} /></Field>
        </>
      )}
    </FormSheet>
  )
}

export function VaultView({ data, refresh }) {
  usePreventScreenCapture()
  const [tab, setTab] = useState('bank_account')
  const [form, setForm] = useState({ open: false, editing: null })
  const rows = (data.vault_items || []).filter((i) => i.item_type === tab)
  const remove = (item) => Alert.alert(`Delete "${item.label}" from the vault?`, "This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/finance/vault_items/${item.id}`, { method: 'DELETE' }); await refresh() } catch (e) { Alert.alert('Delete failed', e.message) } } },
  ])
  return (
    <View className="gap-5">
      <View className="gap-3">
        <View>
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Encrypted at rest</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Vault</Text>
        </View>
        <Pressable onPress={() => setForm({ open: true, editing: null })}>
          <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}><Plus size={15} color="#07101c" /><Text className="text-sm font-semibold text-[#07101c]">Add {TABS.find((t) => t.key === tab).label.toLowerCase().replace(/s$/, '')}</Text></AccentGradient>
        </Pressable>
      </View>
      <View className={tw('flex-row gap-1.5 rounded-xl bg-black/20 light:bg-black/[.06] p-1')}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} className={tw('flex-1 items-center rounded-lg py-2', tab === t.key && 'bg-accent-400/15')}>
            <Text className={tw('text-sm font-medium', tab === t.key ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {rows.length === 0 ? (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
          <EmptyState icon={KeyRound} title="Nothing here yet" message="Store this account or card's details securely — nothing is shown until you tap to reveal it." cta="Add to vault" onCta={() => setForm({ open: true, editing: null })} />
        </View>
      ) : <View className="gap-6">{rows.map((item) => <VaultCard key={item.id} item={item} onEdit={(i) => setForm({ open: true, editing: i })} onDelete={remove} />)}</View>}
      <VaultItemForm open={form.open} editing={form.editing} defaultType={tab} accounts={data.accounts} onClose={() => setForm({ open: false, editing: null })} onSaved={async () => { setForm({ open: false, editing: null }); await refresh() }} />
    </View>
  )
}
