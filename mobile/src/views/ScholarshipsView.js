import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Link2, Paperclip, Pencil, ShieldCheck, Sparkles, Trash2 } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { DismissibleBanner } from '../ui/DismissibleBanner'
import { BackLink, CARD, EyeButton, HERO, MoreMenu, PageTitle, Pill, ProgressBar, SectionHeader } from '../ui/DetailKit'
import { DateInput, Field, FormSheet, Input } from '../ui/FormKit'
import { Select } from '../ui/Select'
import { tw } from '../lib/tw'
import { api } from '../lib/api'
import { toast } from '../lib/toast'
import { pickAttachmentFile, removeAttachment, uploadAttachment, viewAttachment } from '../lib/attachments'
import { capitalizeFirst, formatDate, money, todayISO } from '../lib/format'
import { scholarshipDisplayStatus } from '../lib/shared'

// Port of features/scholarships/* (ScholarshipsView, ScholarshipDetailView, ScholarshipForm, ScholarshipPayForm).
const statusTone = (st) => (st === 'paid' ? ['bg-emerald-400/15', 'text-emerald-200 light:text-emerald-700'] : st === 'received' ? ['bg-accent-400/15', 'text-accent-200 light:text-accent-700'] : ['bg-slate-500/15', 'text-slate-300 light:text-slate-700'])

function LinkedPill() {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-accent-400/15 px-1.5 py-0.5">
      <Icon as={Link2} size={9} className={tw('text-accent-200 light:text-accent-700')} />
      <Text className={tw('text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700')}>Linked</Text>
    </View>
  )
}

function AttachmentField({ record, table, onChanged }) {
  const [busy, setBusy] = useState(false)
  const endpoint = `/finance/${table}/${record.id}`
  const upload = async () => {
    const file = await pickAttachmentFile()
    if (!file) return
    setBusy(true)
    try { const { error } = await uploadAttachment(endpoint, record.id, file); if (error) toast.push('Attachment failed to upload', 'error'); else onChanged() } finally { setBusy(false) }
  }
  const remove = async () => { setBusy(true); try { await removeAttachment(endpoint); onChanged() } finally { setBusy(false) } }
  if (record.attachment_path) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Pressable onPress={() => viewAttachment(endpoint)} className="min-w-0 flex-shrink flex-row items-center gap-1.5">
          <Icon as={Paperclip} size={12} className="text-slate-500" />
          <Text numberOfLines={1} className={tw('text-xs text-accent-200 light:text-accent-700')}>{record.attachment_name || 'Attachment'}</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={remove} hitSlop={6} className={tw('rounded-md p-1', busy && 'opacity-50')}><Icon as={Trash2} size={12} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
      </View>
    )
  }
  return (
    <Pressable disabled={busy} onPress={upload} className={tw('flex-row items-center gap-1.5 self-start rounded-lg border border-dashed border-white/15 light:border-black/10 px-2 py-1')}>
      <Icon as={Paperclip} size={12} className="text-slate-500" />
      <Text className="text-xs text-slate-500">{busy ? 'Uploading…' : 'Attach receipt'}</Text>
    </Pressable>
  )
}

export function ScholarshipsView({ data, onAdd, onEdit, onDelete, onPay, onRefresh, showMoney, onToggleMoney, onDetailChange }) {
  const { scholarships = [], scholarship_payments = [], transactions = [], accounts = [] } = data
  const [selectedId, setSelectedId] = useState(null)
  const selected = scholarships.find((s) => s.id === selectedId)
  useEffect(() => { onDetailChange?.(selected ? selectedId : null) }, [selectedId, !!selected])

  if (selected) {
    return <ScholarshipDetailView s={selected} payments={scholarship_payments} accounts={accounts} transactions={transactions} onBack={() => setSelectedId(null)}
      onEdit={onEdit} onDelete={(x) => onDelete(x, () => setSelectedId(null))} onPay={onPay} onRefresh={onRefresh} showMoney={showMoney} onToggleMoney={onToggleMoney} />
  }

  const receivedScholarships = scholarships.filter((s) => scholarshipDisplayStatus(s) !== 'pending')
  const totalReceived = receivedScholarships.reduce((s, x) => s + Number(x.total_amount || 0), 0)
  const totalPaidCollege = scholarships.reduce((s, x) => s + Number(x.amount_paid_to_college || 0), 0)
  const pendingToCollege = Math.max(0, totalReceived - totalPaidCollege)

  return (
    <View className="gap-5 pb-8">
      <View className="flex-row items-end justify-between gap-3">
        <PageTitle eyebrow="Scholarship trail" title="Scholarships & fees" />
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      {scholarships.length > 0 && (
        <View className={tw(HERO)}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Pending to college</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px]', pendingToCollege > 0 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700')}>{showMoney ? money(pendingToCollege) : '••••••'}</Text>
          <Text className="mt-1 text-sm text-slate-500">{pendingToCollege > 0 ? 'Due to college' : 'All paid'}</Text>
          <View className="mt-5 flex-row gap-3">
            <HeroStatTile icon={ArrowUpRight} label="Received" value={showMoney ? money(totalReceived) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" sub={`${receivedScholarships.length} batch(es)`} />
            <HeroStatTile icon={ArrowDownRight} label="Paid to college" value={showMoney ? money(totalPaidCollege) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${scholarship_payments.length} payment(s)`} />
          </View>
        </View>
      )}

      {scholarships.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={ShieldCheck} title="No scholarships yet" message="Log received batches and payments to college, and we'll warn if funds are misused." cta="Add first batch" onCta={onAdd} /></View>
      ) : (
        <View className="gap-4">
          {scholarships.map((s) => {
            const paid = Number(s.amount_paid_to_college || 0)
            const total = Number(s.total_amount || 0)
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const st = scholarshipDisplayStatus(s)
            const [bg, fg] = statusTone(st)
            return (
              <Pressable key={s.id} onPress={() => setSelectedId(s.id)} className={tw(CARD, 'p-5 active:opacity-80')}>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{s.name}</Text>
                  <Pill bg={bg} fg={fg}>{st}</Pill>
                  {s.received_to_account_id ? <LinkedPill /> : null}
                </View>
                <Text className="mt-1 text-xs text-slate-500">{capitalizeFirst(s.source) || '—'} · {s.academic_year || '—'}</Text>
                <View className="mt-4 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xs text-slate-500">Pending</Text>
                    <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(Math.max(0, total - paid)) : '••••'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={tw('text-xs text-emerald-300 opacity-70 light:text-emerald-700')}>Paid</Text>
                    <Text className={tw('text-sm font-semibold text-emerald-300 light:text-emerald-700')}>{money(paid)}</Text>
                  </View>
                </View>
                <ProgressBar pct={pct} className="mt-3 h-1.5" color="bg-emerald-400" />
                <Text className="mt-2 text-[11px] text-slate-500">of {money(total)} total{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

function ScholarshipDetailView({ s, payments, accounts, transactions, onBack, onEdit, onDelete, onPay, onRefresh, showMoney, onToggleMoney }) {
  const paid = Number(s.amount_paid_to_college || 0)
  const total = Number(s.total_amount || 0)
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  const pending = Math.max(0, total - paid)
  const linkedAccount = accounts.find((a) => a.id === s.received_to_account_id)
  const paymentsForThis = payments.filter((p) => p.scholarship_id === s.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
  const st = scholarshipDisplayStatus(s)
  const [bg, fg] = statusTone(st)
  const misused = s.received_to_account_id && s.received_date
    ? transactions.filter((t) => t.account_id === s.received_to_account_id && t.type === 'expense' && new Date(t.date) >= new Date(s.received_date) && t.linked_module !== 'scholarship' && t.linked_module !== 'investment')
    : []
  const misusedAmount = misused.reduce((a, t) => a + Number(t.amount || 0), 0)

  return (
    <View className="gap-5 pb-8">
      <BackLink label="Back to scholarships" onPress={onBack} />
      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/15"><Icon as={ShieldCheck} size={22} className={tw('text-accent-200 light:text-accent-700')} /></View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className={tw('text-lg font-semibold text-white light:text-slate-900')}>{s.name}</Text>
              <Pill bg={bg} fg={fg}>{st}</Pill>
              {linkedAccount ? <LinkedPill /> : null}
            </View>
            <Text className="mt-1 text-xs text-slate-500">{capitalizeFirst(s.source) || '—'} · {s.academic_year || '—'}{linkedAccount ? ` · into ${linkedAccount.name}` : ''}{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}{s.due_date ? ` · due ${formatDate(s.due_date)}` : ''}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
          <MoreMenu width={192} items={[{ icon: Pencil, label: 'Edit scholarship', onPress: () => onEdit(s) }, { icon: Trash2, label: 'Delete scholarship', onPress: () => onDelete(s), danger: true }]} />
        </View>
      </View>

      <DismissibleBanner id={`scholarship-linked-${s.id}-${linkedAccount?.id || 'none'}`} tone="cyan">
        {linkedAccount
          ? <Text className={tw('text-xs leading-5 text-accent-200 light:text-accent-700')}>Linked to <Text className="font-bold">{linkedAccount.name}</Text> — marking this received/paid posts a transaction there, kept in sync as you edit.</Text>
          : 'Not linked to a bank account — stays only in this module.'}
      </DismissibleBanner>

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Pending</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px]', pending > 0 ? 'text-amber-300 light:text-amber-700' : 'text-emerald-300 light:text-emerald-700')}>{showMoney ? money(pending) : '••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">of {money(total)} total</Text>
        <ProgressBar pct={pct} className="mt-4 h-2" color="bg-emerald-400" />
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile label="Total" value={showMoney ? money(total) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
          <HeroStatTile label="Paid to college" value={showMoney ? money(paid) : '••••'} valueTone="text-accent-300 light:text-accent-700" sub={`${paymentsForThis.length} payment${paymentsForThis.length === 1 ? '' : 's'}`} />
        </View>
        <View className={tw('mt-5 flex-row flex-wrap items-center justify-between gap-3 border-t border-white/10 light:border-black/10 pt-4')}>
          <Text className="text-xs text-slate-500">Scholarship receipt / proof</Text>
          <AttachmentField record={s} table="scholarships" onChanged={onRefresh} />
        </View>
        {misusedAmount > 0 && (
          <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5">
            <Icon as={Sparkles} size={13} className={tw('text-amber-200 light:text-amber-700')} />
            <Text className={tw('flex-1 text-xs text-amber-200 light:text-amber-700')}>Warning: {money(misusedAmount)} across {misused.length} non-scholarship expenses from the receiving account since money arrived. Consider paying college first.</Text>
          </View>
        )}
      </View>

      <View className={tw(CARD)}>
        <SectionHeader>Payments to college · {paymentsForThis.length}</SectionHeader>
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={ArrowUpRight} title="No payments yet" message="Pay to college once the scholarship money has arrived." cta={pending > 0 ? 'Pay to college' : undefined} onCta={pending > 0 ? () => onPay(s) : undefined} />
        ) : paymentsForThis.map((p, i) => {
          const acc = accounts.find((a) => a.id === p.account_id)
          return (
            <View key={p.id} className={tw('px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              <View className="flex-row items-center gap-3">
                <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={ArrowUpRight} size={16} className={tw('text-accent-200 light:text-accent-700')} /></View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(p.paid_to) || 'College'}</Text>
                  <Text numberOfLines={1} className="text-[11px] text-slate-500">{acc?.name || 'No account'} · {formatDate(p.payment_date)}</Text>
                </View>
                <Text className={tw('text-sm font-semibold text-rose-300 light:text-rose-700')}>-{showMoney ? money(p.amount) : '••••'}</Text>
              </View>
              <View className="mt-2 items-end"><AttachmentField record={p} table="scholarship_payments" onChanged={onRefresh} /></View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const accountOpts = (accounts, none, withBalance) => [{ value: '', label: none }, ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ value: a.id, label: withBalance ? `${a.name} · ${money(a.current_balance)}` : a.name }))]

export function ScholarshipForm({ open, onClose, onSaved, editing, accounts }) {
  const blank = () => (editing
    ? { ...editing, total_amount: String(editing.total_amount ?? ''), academic_year: editing.academic_year || '', source: editing.source || '', received_date: editing.received_date || '', due_date: editing.due_date || '', notes: editing.notes || '' }
    : { name: '', total_amount: '', academic_year: '', source: '', status: 'pending', received_date: '', due_date: '', received_to_account_id: '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const linkedAccount = accounts.find((a) => a.id === form.received_to_account_id)

  const save = async () => {
    if (!form.name.trim() || form.total_amount === '') { toast.push('Fill in the name and total amount.', 'error'); return }
    setBusy(true)
    try {
      const payload = editing
        ? { name: form.name, total_amount: Number(form.total_amount), academic_year: form.academic_year, source: form.source, status: form.status, received_date: form.received_date || null, due_date: form.due_date || null, notes: form.notes }
        : { ...form, total_amount: Number(form.total_amount), received_date: form.received_date || null, due_date: form.due_date || null, received_to_account_id: form.received_to_account_id || null }
      await api(editing ? `/finance/scholarships/${editing.id}` : '/finance/scholarships', { method: editing ? 'PATCH' : 'POST', body: payload })
      toast.push(editing ? 'Updated' : 'Scholarship added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit scholarship' : 'Add scholarship'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update' : 'Save'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder="Merit scholarship Q1" /></Field>
      <Field label="Total amount"><Input keyboardType="decimal-pad" value={form.total_amount} onChangeText={(v) => set('total_amount')(v.replace(/[^0-9.]/g, ''))} /></Field>
      <Field label="Academic year"><Input value={form.academic_year} onChangeText={set('academic_year')} placeholder="2025-26" /></Field>
      <Field label="Source"><Input value={form.source} onChangeText={set('source')} placeholder="Govt / Foundation / College" /></Field>
      <Field label="Status" hint={form.status === 'paid' ? 'Marks the full amount as paid to college right away. To log paid amounts one at a time (with dates and which account they left from), use the "Pay to college" button on the scholarship instead.' : undefined}>
        <View className="mt-2"><Select value={form.status} onChange={set('status')} title="Status" options={[{ value: 'pending', label: 'Pending' }, { value: 'received', label: 'Received' }, { value: 'paid', label: 'Paid to college' }]} /></View>
      </Field>
      <Field label="Received date"><DateInput value={form.received_date} onChange={set('received_date')} placeholder="Not received yet" /></Field>
      <Field label="Due date (to college)"><DateInput value={form.due_date} onChange={set('due_date')} placeholder="No due date" /></Field>
      {editing ? (
        <View className={tw('mb-3.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2.5')}>
          <Text className={tw('text-xs leading-5 text-slate-400 light:text-slate-500')}>
            {linkedAccount ? <>Linked to <Text className={tw('text-white light:text-slate-900')}>{linkedAccount.name}</Text> — marking this received/paid posts a transaction on that account.</> : 'Not linked to a bank account — this scholarship stays only in this module.'} Linking can only be set when a scholarship is created, not changed afterward.
          </Text>
        </View>
      ) : (
        <Field label="Link to a bank account" hint={form.received_to_account_id ? 'Marking this received (or paid) posts a transaction on this account, and stays in sync as you edit status/amount.' : "This scholarship won't show up anywhere outside this module. Optional — can't be changed later."}>
          <View className="mt-2"><Select value={form.received_to_account_id || ''} onChange={set('received_to_account_id')} options={accountOpts(accounts, "Don't link — keep this separate")} title="Link to a bank account" /></View>
        </Field>
      )}
      <Field label="Notes"><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}

export function ScholarshipPayForm({ open, onClose, onSaved, scholarship, accounts }) {
  const blank = () => ({ amount: '', paid_to: 'College', payment_date: todayISO(), account_id: scholarship?.received_to_account_id || accounts.find((a) => a.type !== 'debit_card')?.id || '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [open, scholarship?.id])
  if (!scholarship) return null
  const pending = Number(scholarship.total_amount) - Number(scholarship.amount_paid_to_college || 0)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!(Number(form.amount) > 0)) { toast.push('Enter an amount.', 'error'); return }
    if (!form.account_id) { toast.push('Choose an account.', 'error'); return }
    setBusy(true)
    try {
      await api('/finance/scholarship_payments', { method: 'POST', body: { scholarship_id: scholarship.id, ...form, amount: Number(form.amount) } })
      toast.push('Payment logged')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title="Pay to college" onSubmit={save} busy={busy} submitLabel={busy ? 'Paying…' : 'Log payment'}>
      <Text className="-mt-1 mb-4 text-xs text-slate-500">{scholarship.name} · pending {money(pending)}</Text>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount')(v.replace(/[^0-9.]/g, ''))} /></Field>
      <Field label="Paid to"><Input value={form.paid_to} onChangeText={set('paid_to')} placeholder="College name / bursar" /></Field>
      <Field label="Date"><DateInput value={form.payment_date} onChange={set('payment_date')} /></Field>
      <Field label="From account"><View className="mt-2"><Select value={form.account_id} onChange={set('account_id')} options={accountOpts(accounts, 'Choose account…', true)} title="From account" /></View></Field>
    </FormSheet>
  )
}
