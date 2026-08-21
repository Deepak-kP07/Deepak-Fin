'use client'

import { useState } from 'react'
import { Eye, EyeOff, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { money } from '@/lib/format'
import { AccountDetailView } from '@/features/accounts/AccountDetailView'

export function AccountsView({ data, onAdd, onEdit, onDelete, onDeleteTx, showMoney, onToggleMoney }) {
  const { accounts, transactions, categories } = data
  // Debit cards aren't a separate balance — they draw from their linked bank account, so they
  // never get their own tile here; the account they're linked to is where their card face shows.
  const visibleAccounts = accounts.filter((a) => a.type !== 'debit_card')
  const debitCardFor = (accountId) => accounts.find((d) => d.type === 'debit_card' && d.linked_account_id === accountId)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const selectedAccount = visibleAccounts.find((a) => a.id === selectedAccountId)

  if (selectedAccount) {
    return (
      <AccountDetailView
        account={selectedAccount}
        debitCard={selectedAccount.type === 'bank' ? debitCardFor(selectedAccount.id) : null}
        transactions={transactions}
        categories={categories}
        onBack={() => setSelectedAccountId(null)}
        onEdit={onEdit}
        onEditCard={onEdit}
        onDelete={(a) => { onDelete(a); setSelectedAccountId(null) }}
        onDeleteTx={onDeleteTx}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
      />
    )
  }

  const totalBalance = visibleAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const bankAccounts = visibleAccounts.filter((a) => a.type === 'bank')
  const cashAccounts = visibleAccounts.filter((a) => a.type === 'cash')
  const bankBalance = bankAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const cashBalance = cashAccounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Where the money lives</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Accounts</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add account</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {visibleAccounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total balance" value={showMoney ? money(totalBalance) : '••••••'} icon={Landmark} accent="bg-cyan-300/15 text-cyan-200" sub={<span>{visibleAccounts.length} account{visibleAccounts.length === 1 ? '' : 's'}</span>} />
          <StatCard label="Bank balance" value={showMoney ? money(bankBalance) : '••••••'} icon={Landmark} accent="bg-violet-400/15 text-violet-200" sub={<span>{bankAccounts.length} bank account{bankAccounts.length === 1 ? '' : 's'}</span>} />
          <StatCard label="Cash on hand" value={showMoney ? money(cashBalance) : '••••••'} icon={Wallet} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{cashAccounts.length} cash account{cashAccounts.length === 1 ? '' : 's'}</span>} />
        </div>
      )}

      {visibleAccounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Landmark} title="No accounts yet" message="Add a bank account or cash to start tracking balances." cta="Add account" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAccounts.map((a) => {
            const debitCard = a.type === 'bank' ? debitCardFor(a.id) : null
            return (
              <div key={a.id} onClick={() => setSelectedAccountId(a.id)} className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.05]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${a.color || '#22d3ee'}22`, color: a.color || '#22d3ee' }}>
                    {a.type === 'cash' ? <Wallet size={18} /> : <Landmark size={18} />}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(a) }} title="Edit account" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(a) }} title="Delete account" className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold text-white">{a.name}</div>
                  <div className="text-xs capitalize text-slate-500">{a.type.replace('_', ' ')}{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}{debitCard ? ' · debit card linked' : ''}</div>
                </div>
                <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{showMoney ? money(a.current_balance) : '••••••'}</div>
                <div className="mt-1 text-[11px] text-slate-500">Opening {money(a.opening_balance)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
