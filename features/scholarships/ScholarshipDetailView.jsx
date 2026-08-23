'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Eye, EyeOff, Link2, Paperclip, Pencil, ShieldCheck, Sparkles, Target, Trash2 } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DismissibleBanner } from '@/components/shared/DismissibleBanner'
import { removeAttachment, uploadAttachment, viewAttachment } from '@/lib/attachments'
import { scholarshipDisplayStatus } from '@/lib/scholarships'
import { formatDate, money } from '@/lib/format'

// Compact upload/view/remove control reused for the scholarship's own receipt and for each
// individual payment's proof-of-payment — same shape as the Transactions module's attachment
// field, just condensed to fit inline instead of a full form row.
function AttachmentField({ record, table, onChanged, toast }) {
  const [busy, setBusy] = useState(false)
  const endpoint = `/api/finance/${table}/${record.id}`
  const upload = async (file) => {
    setBusy(true)
    try {
      const { error } = await uploadAttachment(endpoint, record.id, file)
      if (error) toast.push('Attachment failed to upload', 'error')
      else onChanged()
    } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await removeAttachment(`${endpoint}/attachment`); onChanged() } finally { setBusy(false) }
  }
  if (record.attachment_path) {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => viewAttachment(`${endpoint}/attachment`)} className="flex min-w-0 items-center gap-1.5 truncate text-xs text-cyan-200 hover:underline"><Paperclip size={12} className="shrink-0 text-slate-500" />{record.attachment_name || 'Attachment'}</button>
        <button type="button" disabled={busy} onClick={remove} className="shrink-0 rounded-md p-1 text-rose-300/70 hover:bg-rose-300/10 disabled:opacity-50"><Trash2 size={12} /></button>
      </div>
    )
  }
  return (
    <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-2 py-1 text-xs text-slate-500 hover:bg-white/[.04]">
      <Paperclip size={12} />{busy ? 'Uploading…' : 'Attach receipt'}
      <input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
    </label>
  )
}

export function ScholarshipDetailView({
  scholarship, payments, accounts, transactions, onBack, onEdit, onDelete, onPay, onRefresh,
  showMoney, onToggleMoney, toast,
}) {
  const s = scholarship
  const paid = Number(s.amount_paid_to_college || 0)
  const total = Number(s.total_amount || 0)
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  const pending = Math.max(0, total - paid)
  const linkedAccount = accounts.find((a) => a.id === s.received_to_account_id)
  const paymentsForThis = payments.filter((p) => p.scholarship_id === s.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
  const displayStatus = scholarshipDisplayStatus(s)

  const misused = s.received_to_account_id && s.received_date
    ? transactions.filter((t) => t.account_id === s.received_to_account_id && t.type === 'expense' && new Date(t.date) >= new Date(s.received_date) && t.linked_module !== 'scholarship' && t.linked_module !== 'investment')
    : []
  const misusedAmount = misused.reduce((a, t) => a + Number(t.amount || 0), 0)

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to scholarships</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-white">{s.name}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${displayStatus === 'paid' ? 'bg-emerald-400/15 text-emerald-200' : displayStatus === 'received' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-500/15 text-slate-300'}`}>{displayStatus}</span>
              {linkedAccount && <span className="flex items-center gap-1 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-200"><Link2 size={10} />Linked</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500">{s.source || '—'} · {s.academic_year || '—'}{linkedAccount ? ` · into ${linkedAccount.name}` : ''}{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}{s.due_date ? ` · due ${formatDate(s.due_date)}` : ''}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onPay(s)} disabled={pending <= 0} className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-40">Pay to college</button>
          <button onClick={() => onEdit(s)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(s)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <DismissibleBanner tone="cyan">
        {linkedAccount ? <>Linked to <b>{linkedAccount.name}</b> — marking this received/paid posts a transaction there, kept in sync as you edit.</> : 'Not linked to a bank account — stays only in this module.'}
      </DismissibleBanner>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={showMoney ? money(total) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" />
        <StatCard label="Paid to college" value={showMoney ? money(paid) : '••••'} icon={ArrowDownRight} accent="bg-cyan-400/15 text-cyan-200" sub={<span>{paymentsForThis.length} payment{paymentsForThis.length === 1 ? '' : 's'}</span>} />
        <StatCard label="Pending" value={showMoney ? money(pending) : '••••'} icon={Target} accent="bg-amber-400/15 text-amber-200" tone={pending > 0 ? 'text-amber-300' : 'text-emerald-300'} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">Scholarship receipt / proof</div>
          <AttachmentField record={s} table="scholarships" onChanged={onRefresh} toast={toast} />
        </div>
        {misusedAmount > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5 text-xs text-amber-200">
            <Sparkles size={13} /> Warning: {money(misusedAmount)} across {misused.length} non-scholarship expenses from the receiving account since money arrived. Consider paying college first.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Payments to college · {paymentsForThis.length}</div>
        {paymentsForThis.length === 0 ? (
          <EmptyState compact icon={ArrowUpRight} title="No payments yet" message="Pay to college once the scholarship money has arrived." cta={pending > 0 ? 'Pay to college' : undefined} onCta={pending > 0 ? () => onPay(s) : undefined} />
        ) : (
          <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {paymentsForThis.map((p) => {
              const acc = accounts.find((a) => a.id === p.account_id)
              return (
                <div key={p.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.8fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{p.paid_to || 'College'}</div>
                    {p.notes && <div className="truncate text-[11px] text-slate-500">{p.notes}</div>}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5 text-slate-300">{acc?.name || 'No account'}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(p.payment_date)}</div>
                  <div className="text-sm font-semibold text-rose-300 sm:text-right">-{showMoney ? money(p.amount) : '••••'}</div>
                  <div className="flex justify-end">
                    <AttachmentField record={p} table="scholarship_payments" onChanged={onRefresh} toast={toast} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
