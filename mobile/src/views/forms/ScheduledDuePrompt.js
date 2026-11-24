import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CalendarClock, Check, X } from 'lucide-react-native'
import { BottomSheet } from '../../ui/BottomSheet'
import { DateInput, SubmitButton } from '../../ui/FormKit'
import { Icon } from '../../ui/Icon'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { dateToLocalISO, formatDate, money, todayISO } from '../../lib/format'

// Port of features/scheduled/ScheduledDuePrompt.jsx. Scheduled transactions whose date has arrived
// (or passed): confirm each one happened (it then counts in balances), push it to a later date, or
// remove it. `items` is one row per transaction (one leg per transfer).
const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dateToLocalISO(d) }

function DueItem({ t, sourceName, busy, onConfirm, onReschedule, onCancel }) {
  const [mode, setMode] = useState(null) // null | 'reschedule' | 'cancel'
  const [newDate, setNewDate] = useState(tomorrowISO())
  const overdue = t.date < todayISO()
  const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
  const dateOk = newDate > todayISO()
  return (
    <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-white/[.03] light:bg-black/[.02] p-4')}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className={tw('text-sm font-semibold text-white light:text-slate-900')}>{t.description || (t.type === 'transfer' ? 'Transfer' : 'Transaction')}</Text>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>{formatDate(t.date)}{sourceName ? ` · ${sourceName}` : ''}</Text>
            {overdue && <View className="rounded-full bg-amber-400/15 px-1.5 py-0.5"><Text className={tw('text-[10px] font-semibold text-amber-200 light:text-amber-700')}>Overdue</Text></View>}
          </View>
        </View>
        <Text className={tw('text-sm font-semibold', t.type === 'transfer' ? 'text-slate-200 light:text-slate-700' : isIn ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700')}>
          {t.type === 'transfer' ? '' : isIn ? '+' : '-'}{money(t.amount)}
        </Text>
      </View>

      {mode === 'reschedule' ? (
        <View className="mt-3">
          <DateInput value={newDate} onChange={setNewDate} />
          {!dateOk && <Text className={tw('mt-1.5 text-[11px] text-amber-300 light:text-amber-700')}>Pick a date after today.</Text>}
          <View className="mt-2 flex-row gap-2">
            <Pressable disabled={busy || !dateOk} onPress={() => onReschedule(newDate)} className={tw('flex-1 items-center rounded-xl bg-accent-300/20 px-3 py-2.5', (busy || !dateOk) && 'opacity-50')}>
              <Text className={tw('text-xs font-semibold text-accent-100 light:text-accent-700')}>Move to this date</Text>
            </Pressable>
            <Pressable onPress={() => setMode(null)} className="rounded-xl px-3 py-2.5"><Text className="text-xs text-slate-400">Back</Text></Pressable>
          </View>
        </View>
      ) : mode === 'cancel' ? (
        <View className="mt-3">
          <Text className={tw('text-xs text-slate-300 light:text-slate-700')}>Remove it — it isn't happening?</Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable disabled={busy} onPress={onCancel} className={tw('rounded-xl bg-rose-400/15 px-3 py-2', busy && 'opacity-50')}><Text className={tw('text-xs font-semibold text-rose-200 light:text-rose-700')}>Yes, remove</Text></Pressable>
            <Pressable onPress={() => setMode(null)} className="rounded-xl px-3 py-2"><Text className="text-xs text-slate-400">Keep</Text></Pressable>
          </View>
        </View>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <Pressable disabled={busy} onPress={onConfirm} className={tw('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-400/15 px-2 py-2.5', busy && 'opacity-50')}>
            <Icon as={Check} size={14} className="text-emerald-200 light:text-emerald-700" /><Text className={tw('text-xs font-semibold text-emerald-200 light:text-emerald-700')}>Confirm</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => setMode('reschedule')} className={tw('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-2 py-2.5', busy && 'opacity-50')}>
            <Icon as={CalendarClock} size={14} className="text-slate-200 light:text-slate-700" /><Text className={tw('text-xs font-medium text-slate-200 light:text-slate-700')}>Not yet</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => setMode('cancel')} className={tw('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-2 py-2.5', busy && 'opacity-50')}>
            <Icon as={X} size={14} className="text-slate-400 light:text-slate-500" /><Text className={tw('text-xs font-medium text-slate-400 light:text-slate-500')}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export function ScheduledDuePrompt({ open, onClose, items, accounts = [], creditCards = [], onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const sourceName = (t) => accounts.find((a) => a.id === t.account_id)?.name || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id)?.name : null)
  const patchTx = (id, body) => api(`/finance/transactions/${id}`, { method: 'PATCH', body })
  const run = async (id, fn, okMsg) => {
    setBusyId(id)
    try { await fn(); toast.push(okMsg); await onChanged() } catch (e) { toast.push(e.message || 'Could not update', 'error') } finally { setBusyId(null) }
  }
  const confirmAll = () => run('all', async () => { for (const t of items) await patchTx(t.id, { status: 'confirmed' }) }, `${items.length} transaction${items.length === 1 ? '' : 's'} confirmed`)
  const title = `${items.length} scheduled transaction${items.length === 1 ? '' : 's'} to confirm`
  return (
    <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={title}>
      <Text className={tw('text-xs leading-5 text-slate-400 light:text-slate-500')}>These were scheduled for today or earlier. Confirm the ones that happened — they'll count in your balance from then on.</Text>
      <View className="mt-4 gap-3">
        {items.map((t) => (
          <DueItem key={t.id} t={t} sourceName={sourceName(t)} busy={!!busyId}
            onConfirm={() => run(t.id, () => patchTx(t.id, { status: 'confirmed' }), 'Confirmed — now counted in your balance')}
            onReschedule={(date) => run(t.id, () => patchTx(t.id, { date }), `Moved to ${formatDate(date)}`)}
            onCancel={() => run(t.id, () => api(`/finance/transactions/${t.id}`, { method: 'DELETE' }), 'Scheduled transaction removed')} />
        ))}
      </View>
      {items.length > 1 && <SubmitButton className="mt-4 mb-2" label={busyId === 'all' ? 'Confirming…' : `Confirm all ${items.length}`} busy={busyId === 'all'} disabled={!!busyId} onPress={confirmAll} />}
    </BottomSheet>
  )
}

// Same selection as the PWA Shell's `dueScheduled`: date today or earlier, hidden ones only while
// unlocked, one row per transfer, oldest first.
export function dueScheduledOf(scheduled, hiddenRevealed) {
  const today = todayISO()
  const seen = new Set()
  return (scheduled || [])
    .filter((t) => t.date <= today && (hiddenRevealed || !t.is_hidden))
    .filter((t) => { if (!t.transfer_group_id) return true; if (seen.has(t.transfer_group_id)) return false; seen.add(t.transfer_group_id); return true })
    .sort((a, b) => a.date.localeCompare(b.date))
}
