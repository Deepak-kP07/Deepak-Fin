import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, Share, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { captureRef } from 'react-native-view-shot'
import RNShare from 'react-native-share'
import * as Clipboard from 'expo-clipboard'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { Check, Copy, Fingerprint, KeyRound, Landmark, Pencil, Plus, RotateCcw, Share2, Trash2 } from 'lucide-react-native'
import { BankCardFace } from '../ui/BankCardFace'
import { EmptyState } from '../ui/EmptyState'
import { Field, FormSheet, Input, ColorPicker } from '../ui/FormKit'
import { Select } from '../ui/Select'
import { AccentGradient } from '../ui/Gradient'
import { tw } from '../lib/tw'
import { confirmIdentity } from '../lib/biometric'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { capitalizeFirst } from '../lib/format'
import { dialog } from '../ui/Dialogs'

// Native port of features/vault/VaultView.jsx + VaultCardFlip.jsx + VaultItemForm.jsx. Details are
// only decrypted on tap (the server's reveal route); screenshots are blocked on this screen.
const TABS = [{ key: 'bank_account', label: 'Bank accounts' }, { key: 'debit_card', label: 'Debit cards' }, { key: 'credit_card', label: 'Credit cards' }]
const group4 = (v) => String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

const TYPE_LABEL = { bank_account: 'Bank account', debit_card: 'Debit card', credit_card: 'Credit card' }

// Port of features/vault/VaultCardFlip.jsx's share caption — account/card number only, expiry and
// notes stay out of it, with the same app signature.
function shareCaption(item, secrets) {
  const who = secrets.holder_name || item.label
  const heading = item.bank_name ? [item.bank_name, who] : [who]
  const lines = item.item_type === 'bank_account'
    ? [`A/C: ${secrets.account_number || '—'}`, `IFSC: ${secrets.ifsc_code || '—'}`, secrets.branch && `Branch: ${secrets.branch}`]
    : [`Card: ${group4(secrets.card_number) || '—'}`, `Expiry: ${secrets.expiry_month || '--'}/${secrets.expiry_year || '--'}`]
  return [...heading, ...lines.filter(Boolean), '', 'Sent via Personal Fin — manage all your personal finance at personalfin.site'].join('\n')
}

// Port of VaultCardFlip: tap flips the card. The front shows the holder name from a best-effort
// `?preview=1` reveal (no expiry/IFSC/notes); the back stays masked until an explicit "Tap to
// reveal", and the revealed values are dropped the moment it flips back.
function VaultCard({ item, onEdit, onDelete }) {
  const [flipped, setFlipped] = useState(false)
  const [secrets, setSecrets] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(null)
  const spin = useRef(new Animated.Value(0)).current
  const isCard = item.item_type === 'debit_card' || item.item_type === 'credit_card'

  useEffect(() => {
    let alive = true
    api(`/finance/vault_items/${item.id}/reveal?preview=1`, { method: 'POST', timeoutMs: 15000 })
      .then((d) => { if (alive && d?.secrets) setPreview(d.secrets) })
      .catch(() => {}) // best-effort — the front just keeps the masked last4
    return () => { alive = false }
  }, [item.id])

  const flipTo = (back) => {
    setFlipped(back)
    if (!back) setSecrets(null)
    Animated.timing(spin, { toValue: back ? 1 : 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }
  const reveal = async () => {
    if (!(await confirmIdentity(`Reveal ${item.label}`))) return
    setRevealing(true)
    try { const res = await api(`/finance/vault_items/${item.id}/reveal`, { method: 'POST', timeoutMs: 20000 }); setSecrets(res.secrets || {}) }
    catch (e) { toast.push(e.status === 0 ? 'Reveal timed out — check your connection and try again.' : e.message || 'Could not reveal this item — try again.', 'error') }
    finally { setRevealing(false) }
  }
  const copyCardNumber = async () => {
    const raw = String(secrets?.card_number || '').replace(/\s+/g, '')
    if (!raw) return
    await Clipboard.setStringAsync(raw)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }
  // Same as the PWA: a PNG of the card's front exactly as it looks here, with the details as the
  // caption. If the snapshot fails, the caption still goes out on its own.
  const frontFaceRef = useRef(null)
  const [cardW, setCardW] = useState(0)
  const [sharing, setSharing] = useState(false)
  const share = async () => {
    if (sharing) return
    setSharing(true)
    const message = shareCaption(item, secrets)
    try {
      let uri = null
      try { uri = await captureRef(frontFaceRef, { format: 'png', quality: 1, result: 'tmpfile' }) } catch { uri = null }
      if (uri) {
        await RNShare.open({ url: uri.startsWith('file://') ? uri : `file://${uri}`, type: 'image/png', message, title: item.label, failOnCancel: false })
      } else {
        toast.push("Couldn't attach the card image — sharing text only.", 'error')
        await Share.share({ title: item.label, message })
      }
    } catch (e) {
      if (!/cancel/i.test(String(e?.message || ''))) toast.push('Share failed.', 'error')
    } finally { setSharing(false) }
  }

  const frontRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const face = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backfaceVisibility: 'hidden' }
  const color = item.color || (isCard ? '#a78bfa' : '#22d3ee')

  return (
    <Pressable onPress={() => flipTo(!flipped)} onLayout={(e) => setCardW(e.nativeEvent.layout.width)} className="self-center" style={{ width: '100%', maxWidth: 340, aspectRatio: 85 / 54 }}>
      <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[face, { transform: [{ perspective: 4000 }, { rotateY: frontRotate }] }]}>
        {/* The shared PNG is exactly this box: pinned to the card's own 85:54 size (not "fill the
            parent"), so the snapshot has no strip of empty space under the card. */}
        <View ref={frontFaceRef} collapsable={false} style={cardW ? { width: cardW, height: cardW * 54 / 85, borderRadius: 16, overflow: 'hidden' } : { flex: 1 }}>
        {isCard ? (
          <BankCardFace name={item.label} subtitle={item.bank_name || TYPE_LABEL[item.item_type]} last4={item.last4} color={color} holderName={preview?.holder_name || undefined} style={{ height: '100%', aspectRatio: undefined, elevation: 0 }} />
        ) : (
          <LinearGradient colors={[color, `${color}cc`, '#0b0f18']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 16, overflow: 'hidden', padding: 16, justifyContent: 'space-between' }}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent', 'rgba(0,0,0,0.25)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <Landmark size={18} color="rgba(255,255,255,0.8)" />
            <View>
              <Text style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 2.3, color: 'rgba(255,255,255,0.9)' }}>••{item.last4 || '••••'}</Text>
              <Text numberOfLines={1} className="mt-2 text-xs font-semibold text-white">{preview?.holder_name || item.label}</Text>
              {(preview?.holder_name ? item.label || item.bank_name : item.bank_name) ? (
                <Text numberOfLines={1} className="mt-0.5 text-[9px] uppercase tracking-widest text-white/60">
                  {preview?.holder_name ? [item.label, item.bank_name].filter(Boolean).join(' · ') : item.bank_name}
                </Text>
              ) : null}
            </View>
          </LinearGradient>
        )}
        </View>
      </Animated.View>

      <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[face, { transform: [{ perspective: 4000 }, { rotateY: backRotate }] }]}>
        <View className="flex-1 justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#141a28] p-3.5">
          <View className="min-h-0 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-semibold text-white">{item.label}</Text>
                <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">{TYPE_LABEL[item.item_type]}{item.bank_name ? ` · ${item.bank_name}` : ''}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                {secrets ? <Pressable disabled={sharing} onPress={share} hitSlop={6} accessibilityLabel="Share" className="rounded-lg p-1">{sharing ? <ActivityIndicator size="small" color="#64748b" /> : <Share2 size={13} color="#64748b" />}</Pressable> : null}
                <Pressable onPress={() => flipTo(false)} hitSlop={6} accessibilityLabel="Flip back" className="rounded-lg p-1"><RotateCcw size={13} color="#64748b" /></Pressable>
              </View>
            </View>
            <View className="-mx-3.5 mt-2 h-5 bg-black/70" />
            {!secrets ? (
              <View className="mt-3 items-center">
                <Pressable disabled={revealing} onPress={reveal} className={tw('flex-row items-center gap-2 rounded-xl bg-white/[.08] px-4 py-2.5 active:opacity-70', revealing && 'opacity-50')}>
                  {revealing ? <ActivityIndicator size="small" color="#fff" /> : <Fingerprint size={16} color="#fff" />}
                  <Text className="text-xs font-semibold text-white">{revealing ? 'Decrypting…' : 'Tap to reveal'}</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-2.5 gap-1">
                {item.item_type === 'bank_account' ? (
                  <>
                    <Text style={MONO} className="text-slate-200">Acc no: <Text className="text-white">{secrets.account_number || '—'}</Text></Text>
                    <Text style={MONO} className="text-slate-200">IFSC: <Text className="text-white">{secrets.ifsc_code || '—'}</Text></Text>
                    {secrets.branch ? <Text style={MONO} numberOfLines={1} className="text-slate-200">Branch: <Text className="text-white">{secrets.branch}</Text></Text> : null}
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center gap-1.5">
                      <Text style={[MONO, { letterSpacing: 1.6 }]} className="text-white">{group4(secrets.card_number) || '—'}</Text>
                      {secrets.card_number ? <Pressable onPress={copyCardNumber} hitSlop={8} accessibilityLabel="Copy card number" className="rounded p-0.5">{copied ? <Check size={11} color="#6ee7b7" /> : <Copy size={11} color="#64748b" />}</Pressable> : null}
                    </View>
                    <Text style={MONO} className="text-slate-200">Expiry: <Text className="text-white">{secrets.expiry_month || '--'}/{secrets.expiry_year || '--'}</Text></Text>
                  </>
                )}
                {secrets.notes ? <Text numberOfLines={1} style={MONO} className="pt-0.5 text-slate-400">{capitalizeFirst(secrets.notes)}</Text> : null}
              </View>
            )}
          </View>
          <View className="flex-row gap-1.5">
            <Pressable onPress={() => onEdit(item)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-white/[.08] py-2.5 active:opacity-70"><Pencil size={12} color="#fff" /><Text className="text-[11px] font-semibold text-white">Edit</Text></Pressable>
            <Pressable onPress={() => onDelete(item)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 py-2.5 active:opacity-70"><Trash2 size={12} color="#fda4af" /><Text className="text-[11px] font-semibold text-rose-300">Delete</Text></Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}
const MONO = { fontFamily: 'monospace', fontSize: 11 }

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
    if (!form.label.trim()) return dialog.alert('Enter a label')
    if (isBank ? !form.account_number || !form.ifsc_code : !form.card_number || !form.expiry_month || !form.expiry_year) return dialog.alert('Fill in the required details')
    setBusy(true)
    try {
      const secrets = isBank
        ? { holder_name: form.holder_name, account_number: form.account_number, ifsc_code: form.ifsc_code, branch: form.branch, notes: form.notes }
        : { holder_name: form.holder_name, card_number: form.card_number.replace(/\s+/g, ''), expiry_month: form.expiry_month, expiry_year: form.expiry_year, notes: form.notes }
      const last4 = String(isBank ? form.account_number : form.card_number).replace(/\s+/g, '').slice(-4)
      await api(editing ? `/finance/vault_items/${editing.id}` : '/finance/vault_items', { method: editing ? 'PATCH' : 'POST', body: { item_type: form.item_type, label: form.label, bank_name: form.bank_name || null, color: form.color, linked_account_id: form.linked_account_id || null, last4, secrets } })
      toast.push(editing ? 'Vault item updated' : 'Vault item added')
      onSaved()
    } catch (e) { dialog.alert('Could not save', e.message) } finally { setBusy(false) }
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

// Screenshots stay blocked on this screen. EXPO_PUBLIC_ALLOW_SCREENSHOTS=1 in .env.local lifts that
// for dev builds only (testing/QA screenshots); release builds always block.
const blockCapture = !(__DEV__ && process.env.EXPO_PUBLIC_ALLOW_SCREENSHOTS === '1')
function ScreenCaptureBlock() { usePreventScreenCapture(); return null }

export function VaultView({ data, refresh }) {
  const [tab, setTab] = useState('bank_account')
  const [form, setForm] = useState({ open: false, editing: null })
  const rows = (data.vault_items || []).filter((i) => i.item_type === tab)
  const remove = (item) => dialog.alert(`Delete "${item.label}" from the vault?`, "This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/finance/vault_items/${item.id}`, { method: 'DELETE' }); toast.push('Vault item deleted'); await refresh() } catch (e) { dialog.alert('Delete failed', e.message) } } },
  ])
  return (
    <View className="gap-5">
      {blockCapture ? <ScreenCaptureBlock /> : null}
      <View className="gap-3">
        <View>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Vault</Text>
        </View>
        <Pressable onPress={() => setForm({ open: true, editing: null })}>
          <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}><Plus size={15} color="#07101c" /><Text className="text-sm font-semibold text-[#07101c]">Add</Text></AccentGradient>
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
