import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PendingTransactionCard } from '@/features/pending/PendingTransactionCard'

// Approve/reject queue for SMS-detected transactions (Android app only — see
// features/settings/SettingsSmsAutoDetect.jsx for the on/off toggle and how a message gets here
// in the first place: lib/sms/parseEngine.js parses it, the native bridge POSTs it to
// /api/finance/pending_transactions). Resolved items (approved/rejected) drop off this list —
// this is a queue to clear, not a permanent log; approved ones live on in Transactions like any
// other entry.
export function PendingTransactionsView({ data, onApprove, onReject }) {
  const { pending_transactions = [], accounts, credit_cards: creditCards = [], categories } = data
  const pending = pending_transactions.filter((p) => p.status === 'pending').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">SMS auto-detect</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Pending{pending.length > 0 ? ` · ${pending.length}` : ''}</h1>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Inbox} title="No pending transactions" message="Detected bank/UPI SMS you haven't approved or rejected yet will show up here." />
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(280px,420px))]">
          {pending.map((p) => (
            <PendingTransactionCard key={p.id} pending={p} accounts={accounts} creditCards={creditCards} categories={categories} onApprove={onApprove} onReject={onReject} />
          ))}
        </div>
      )}
    </div>
  )
}
