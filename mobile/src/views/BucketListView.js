import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { CheckCircle2, Clock, ExternalLink, Mountain, Pencil, Trash2 } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { CARD, EyeButton, HERO, PageTitle, ProgressBar } from '../ui/DetailKit'
import { Field, FormSheet, Input } from '../ui/FormKit'
import { tw } from '../lib/tw'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { capitalizeFirst, money } from '../lib/format'

// Port of features/buckets/BucketListView.jsx + BucketForm.jsx.
const WAIT_DAYS = 30
const daysSince = (dateStr) => Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000))

export function BucketListView({ data, onAdd, onEdit, onDelete, showMoney, onToggleMoney }) {
  const bucket_list = data.bucket_list || []
  const ready = bucket_list.filter((b) => daysSince(b.created_at) >= WAIT_DAYS)
  const readyCount = ready.length
  const readyValue = ready.reduce((s, b) => s + Number(b.estimated_cost || 0), 0)
  const stillWaitingValue = bucket_list.filter((b) => daysSince(b.created_at) < WAIT_DAYS).reduce((s, b) => s + Number(b.estimated_cost || 0), 0)

  return (
    <View className="gap-5 pb-8">
      <View className="flex-row items-end justify-between gap-3">
        <PageTitle eyebrow="The 30-day rule" title="Bucket list" />
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      {bucket_list.length > 0 && (
        <View className={tw(HERO)}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Ready to buy</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px]', readyCount > 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-white light:text-slate-900')}>{readyCount}</Text>
          <Text className="mt-1 text-sm text-slate-500">{readyCount === 1 ? 'item has' : 'items have'} passed the 30-day wait</Text>
          <View className="mt-5 flex-row gap-3">
            <HeroStatTile label="Ready to buy value" value={showMoney ? money(readyValue) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${readyCount} item${readyCount === 1 ? '' : 's'}`} />
            <HeroStatTile label="Still waiting" value={showMoney ? money(stillWaitingValue) : '••••'} sub={`${bucket_list.length - readyCount} item${bucket_list.length - readyCount === 1 ? '' : 's'}`} />
          </View>
        </View>
      )}

      {bucket_list.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Mountain} title="Nothing waiting" message="Before buying something, add it here with why you want it — come back in 30 days and see if you still do." cta="Add first item" onCta={onAdd} /></View>
      ) : (
        <View className={tw(CARD)}>
          {bucket_list.map((b, idx) => {
            const days = daysSince(b.created_at)
            const isReady = days >= WAIT_DAYS
            const pct = Math.min(100, Math.round((days / WAIT_DAYS) * 100))
            return (
              <View key={b.id} className={tw('gap-3 px-5 py-4', idx > 0 && 'border-t border-white/5 light:border-black/5')}>
                <View className="flex-row items-start gap-2">
                  <View className="min-w-0 flex-1">
                    {b.product_url ? (
                      <Pressable onPress={() => Linking.openURL(b.product_url).catch(() => toast.push('Could not open that link', 'error'))} className="flex-row items-center gap-1.5">
                        <Text numberOfLines={1} className={tw('flex-shrink text-sm font-medium text-accent-200 light:text-accent-700')}>{capitalizeFirst(b.title)}</Text>
                        <Icon as={ExternalLink} size={12} className={tw('text-accent-300/70 light:text-accent-700')} />
                      </Pressable>
                    ) : (
                      <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(b.title)}</Text>
                    )}
                    {b.estimated_cost != null ? <Text className="text-xs text-slate-500">{showMoney ? money(b.estimated_cost) : '••••'}</Text> : null}
                  </View>
                  <Pressable onPress={() => onEdit(b)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                  <Pressable onPress={() => onDelete(b)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                </View>
                {b.reasons?.length > 0 ? (
                  <View className="gap-0.5">{b.reasons.map((r, i) => <Text key={i} numberOfLines={1} className={tw('text-xs text-slate-400 light:text-slate-500')}>· {capitalizeFirst(r)}</Text>)}</View>
                ) : null}
                <View>
                  <View className="flex-row items-center gap-1.5">
                    <Icon as={isReady ? CheckCircle2 : Clock} size={14} className={isReady ? 'text-emerald-300 light:text-emerald-700' : 'text-slate-500'} />
                    <Text className={tw('text-sm font-semibold', isReady ? 'text-emerald-300 light:text-emerald-700' : 'text-white light:text-slate-900')}>{isReady ? `${days} days` : `Day ${days} of ${WAIT_DAYS}`}</Text>
                  </View>
                  <View style={{ width: 96 }}><ProgressBar pct={pct} className="mt-1.5 h-1.5" color={isReady ? 'bg-emerald-400' : 'bg-accent-300'} /></View>
                  {isReady ? <Text className={tw('mt-1 text-[11px] text-emerald-300/80 light:text-emerald-700')}>30 days up — still want it?</Text> : null}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export function BucketForm({ open, onClose, onSaved, editing }) {
  const blank = () => (editing
    ? { title: editing.title, product_url: editing.product_url || '', estimated_cost: editing.estimated_cost != null ? String(editing.estimated_cost) : '', reasons: [0, 1, 2].map((i) => editing.reasons?.[i] || '') }
    : { title: '', product_url: '', estimated_cost: '', reasons: ['', '', ''] })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const setReason = (i, value) => setForm((f) => ({ ...f, reasons: f.reasons.map((r, idx) => (idx === i ? value : r)) }))

  const save = async () => {
    if (!form.title.trim()) { toast.push('Enter the product.', 'error'); return }
    setBusy(true)
    try {
      const body = { title: form.title, product_url: form.product_url || null, estimated_cost: form.estimated_cost === '' ? null : Number(form.estimated_cost), reasons: form.reasons.map((r) => r.trim()).filter(Boolean) }
      await api(editing ? `/finance/bucket_list/${editing.id}` : '/finance/bucket_list', { method: editing ? 'PATCH' : 'POST', body })
      toast.push(editing ? 'Updated' : 'Added — the 30-day clock starts now')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit item' : 'Thinking of buying something?'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update' : 'Add to list'}>
      <Field label="Product"><Input value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="iPhone 15 Pro" /></Field>
      <Field label="Product link" optional><Input keyboardType="url" autoCapitalize="none" value={form.product_url} onChangeText={(v) => setForm((f) => ({ ...f, product_url: v }))} placeholder="https://amazon.in/…" /></Field>
      <Field label="Estimated cost" optional><Input keyboardType="decimal-pad" value={form.estimated_cost} onChangeText={(v) => setForm((f) => ({ ...f, estimated_cost: v.replace(/[^0-9.]/g, '') }))} placeholder="60000" /></Field>
      <Field label="Reasons to buy" hint="Up to 3">
        <View className="mt-2 gap-2">{[0, 1, 2].map((i) => <Input key={i} className="mt-0" value={form.reasons[i]} onChangeText={(v) => setReason(i, v)} placeholder={`Reason ${i + 1}`} />)}</View>
      </Field>
    </FormSheet>
  )
}
