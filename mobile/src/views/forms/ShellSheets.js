import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { Bell, CheckCheck, Coins, CreditCard, Landmark, Mail, RefreshCw, Repeat, Target, UserPlus, Users } from 'lucide-react-native'
import { BottomSheet } from '../../ui/BottomSheet'
import { EmptyState } from '../../ui/EmptyState'
import { Icon } from '../../ui/Icon'
import { ToggleSwitch } from '../../ui/ToggleSwitch'
import { DateInput, Field, FormSheet, Input } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { money, todayISO } from '../../lib/format'
import { relativeTime } from '../../lib/shared'
import { disablePush, enablePush, inviteRouteFor, pushPermissionStatus } from '../../lib/push'
import { useRouter } from 'expo-router'
import { dialog } from '../../ui/Dialogs'

// Port of features/notifications/NotificationBell.jsx's mobile sheet, plus this phone's push
// on/off switch (the native app's own setting).
const TYPE_ICON = {
  card_due: CreditCard, loan_due: Landmark, chit_fund_due: Coins, budget_overspend: Target,
  recurring_generated: Repeat, recurring_money_profile_generated: Repeat, app_update: RefreshCw,
  share_invite: UserPlus, share_accepted: Users, report_ready: Mail,
}

export function NotificationsSheet({ open, onClose, onNavigate, onUnreadChange }) {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [push, setPush] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    pushPermissionStatus().then(setPush, () => setPush('undetermined'))
    api('/finance/notifications').then((r) => { setItems(r.items || []); setLoaded(true) }, () => setLoaded(true))
  }, [open])
  const unread = items.filter((n) => !n.read_at).length
  useEffect(() => { if (loaded) onUnreadChange?.(unread) }, [unread, loaded])

  const togglePush = async () => {
    setBusy(true)
    try {
      if (push !== 'on') {
        const ok = await enablePush()
        if (!ok) dialog.alert('Notifications are off', 'Allow notifications for Personal Fin in Android settings to get reminders.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }])
      } else await disablePush({ optOut: true })
      setPush(await pushPermissionStatus())
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }
  const openItem = (n) => {
    if (!n.read_at) api('/finance/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => {})
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
    onClose()
    // In-app links (share invites) open their native screen; a full web URL opens the browser.
    const invite = inviteRouteFor(n.link)
    if (invite) router.push(invite)
    else if (/^https?:\/\//.test(n.link || '')) Linking.openURL(n.link).catch(() => toast.push("Couldn't open that link", 'error'))
    else if (n.view) onNavigate(n.view)
    else if (n.link) onNavigate((String(n.link).match(/[?&]view=([a-z_]+)/) || [])[1] || 'dashboard')
  }
  const markAll = () => {
    api('/finance/notifications/read', { method: 'POST', body: { all: true } }).catch(() => {})
    setItems((list) => list.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
  }

  return (
    <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Notifications">
      {/* Only a nudge while push is off — once it's on, it's managed from Settings › Notifications. */}
      {push !== null && push !== 'on' && <Pressable disabled={busy} onPress={togglePush} className={tw('mb-3 flex-row items-center justify-between gap-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-4 py-3')}>
        <View className="flex-1">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Push reminders on this phone</Text>
          <Text className="text-[11px] text-slate-500">Bills, EMIs, chit fund dues and budget alerts.</Text>
        </View>
        <ToggleSwitch checked={false} onChange={togglePush} disabled={busy} />
      </Pressable>}
      {unread > 0 && (
        <Pressable onPress={markAll} className="-mt-1 mb-2 flex-row items-center justify-end gap-1.5">
          <Icon as={CheckCheck} size={14} className={tw('text-accent-300 light:text-accent-700')} />
          <Text className={tw('text-xs font-medium text-accent-300 light:text-accent-700')}>Mark all as read</Text>
        </Pressable>
      )}
      {loaded && items.length === 0 ? (
        <EmptyState compact icon={Bell} title="You're all caught up" message="Reminders, detected transactions and invites will show up here." />
      ) : (
        <View className="gap-1 pb-4">
          {items.map((n) => {
            const isUnread = !n.read_at
            return (
              <Pressable key={n.id} onPress={() => openItem(n)} className={tw('flex-row items-start gap-3 rounded-xl px-3 py-2.5', isUnread && 'bg-accent-400/[.06]')}>
                <View className={tw('mt-0.5 h-8 w-8 items-center justify-center rounded-lg bg-white/[.06] light:bg-black/[.05]')}><Icon as={TYPE_ICON[n.type] || Bell} size={15} className={tw('text-slate-300 light:text-slate-600')} /></View>
                <View className="min-w-0 flex-1">
                  <Text className={tw('text-sm', isUnread ? 'font-semibold text-white light:text-slate-900' : 'text-slate-300 light:text-slate-700')}>{n.title}</Text>
                  {n.body ? <Text className={tw('mt-0.5 text-xs leading-5 text-slate-400 light:text-slate-500')}>{n.body}</Text> : null}
                  <Text className="mt-1 text-[11px] text-slate-500">{relativeTime(n.created_at)}</Text>
                </View>
                {isUnread ? <View className="mt-2 h-2 w-2 rounded-full bg-accent-300" /> : null}
              </Pressable>
            )
          })}
        </View>
      )}
    </BottomSheet>
  )
}

// Port of features/credit-cards/CardPayForm.jsx.
export function CardPayForm({ open, onClose, onSaved, card, accounts, profile }) {
  const blank = () => ({ amount: card ? String(card.current_outstanding || '') : '', account_id: accounts.find((a) => a.type !== 'debit_card')?.id || '', date: todayISO(), notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [open, card?.id])
  if (!card) return null
  const save = async () => {
    const amount = Number(form.amount)
    if (!(amount > 0) || !form.account_id) { toast.push('Enter an amount and choose an account.', 'error'); return }
    const account = accounts.find((a) => a.id === form.account_id)
    if (account && amount > Number(account.current_balance || 0) && profile?.block_insufficient_funds !== false) { toast.push(`"${account.name}" doesn't have ${money(amount)}.`, 'error'); return }
    setBusy(true)
    try {
      await api(`/finance/credit_cards/${card.id}/pay_bill`, { method: 'POST', body: { ...form, amount } })
      toast.push('Bill paid')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title="Pay bill" onSubmit={save} busy={busy} submitLabel={busy ? 'Paying…' : 'Pay bill'}>
      <Text className="-mt-1 mb-4 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</Text>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v.replace(/[^0-9.]/g, '') }))} /></Field>
      <Field label="Pay from account"><View className="mt-2"><Select value={form.account_id} onChange={(v) => setForm((f) => ({ ...f, account_id: v }))} options={[{ value: '', label: 'Choose account…' }, ...accounts.filter((a) => a.type !== 'debit_card' && a.type !== 'credit_card').map((a) => ({ value: a.id, label: `${a.name} · ${money(a.current_balance)}` }))]} title="Pay from account" /></View></Field>
      <Field label="Date"><DateInput value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} /></Field>
    </FormSheet>
  )
}
