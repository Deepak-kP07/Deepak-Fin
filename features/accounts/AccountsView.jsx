'use client'

import { useState } from 'react'
import { Landmark, Pencil, Plus, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { StatCard } from '@/components/shared/StatCard'
import { money } from '@/lib/format'
import { AccountDetailView } from '@/features/accounts/AccountDetailView'

export function AccountsView({ data, onAdd, onEdit, onDelete, onDeleteTx, onDeleteTxBulk, onAddTransaction, showMoney, onToggleMoney }) {
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
        onDeleteTxBulk={onDeleteTxBulk}
        onAddTransaction={onAddTransaction}
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
    // pb-16 stacks on top of <main>'s own pb-24 (app/page.js) — on a short account list that
    // doesn't scroll, that alone wasn't enough clearance and the floating "+" quick-add button
    // (h-14, bottom-24) sat directly over the last row's content, as seen in a real screenshot.
    <div className="space-y-5 pb-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Where the money lives</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Accounts</h1>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onAdd} className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add account</span></button>
        </div>
      </div>

      {visibleAccounts.length > 0 && (
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Total balance</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">
            {showMoney ? money(totalBalance) : '••••••••'}
          </div>
          <div className="mt-1 text-sm text-slate-500">{visibleAccounts.length} account{visibleAccounts.length === 1 ? '' : 's'}</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroStatTile icon={Landmark} label="Bank" value={showMoney ? money(bankBalance) : '••••'} sub={`${bankAccounts.length} account${bankAccounts.length === 1 ? '' : 's'}`} />
            <HeroStatTile icon={Wallet} label="Cash" value={showMoney ? money(cashBalance) : '••••'} sub={`${cashAccounts.length} account${cashAccounts.length === 1 ? '' : 's'}`} />
          </div>
        </div>
      )}

      {visibleAccounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState icon={Landmark} title="No accounts yet" message="Add a bank account or cash to start tracking balances." cta="Add account" onCta={onAdd} />
        </div>
      ) : (
        <>
          {/* Mobile: one full-width row per account — same pattern as the Transactions ledger
              (icon left, name/subtitle left, balance trailing right). A 2-up card grid squeezed
              each balance down to a compressed size and truncated the subtitle mid-word; a real
              account balance deserves the same "numbers lead" treatment the ledger already gets.
              No edit icon here — editing/deleting an account only happens on its own detail page. */}
          <div className="flex flex-col gap-2 sm:hidden">
            {visibleAccounts.map((a) => {
              const debitCard = a.type === 'bank' ? debitCardFor(a.id) : null
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAccountId(a.id)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] px-4 py-3.5 text-left transition active:bg-white/[.05] active:light:bg-black/[.035]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${a.color || '#22d3ee'}22`, color: a.color || '#22d3ee' }}>
                    {a.type === 'cash' ? <Wallet size={18} /> : <Landmark size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white light:text-slate-900">{a.name}</div>
                    <div className="truncate text-xs text-slate-500"><span className="capitalize">{a.type.replace('_', ' ')}</span>{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}{debitCard ? ' · card linked' : ''}</div>
                  </div>
                  <div className="shrink-0 text-base font-semibold text-white light:text-slate-900">{showMoney ? money(a.current_balance) : '••••••'}</div>
                </button>
              )
            })}
          </div>

          {/* Desktop: unchanged card grid — auto-fit stretches tiles to fill the row instead of
              capping at 2 columns for the whole 640-1279px range. */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(240px,340px))]">
            {visibleAccounts.map((a) => {
              const debitCard = a.type === 'bank' ? debitCardFor(a.id) : null
              return (
                <div key={a.id} onClick={() => setSelectedAccountId(a.id)} className="group min-w-0 cursor-pointer rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5 transition hover:border-accent-300/30 hover:bg-white/[.05] hover:light:bg-black/[.035]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${a.color || '#22d3ee'}22`, color: a.color || '#22d3ee' }}>
                      {a.type === 'cash' ? <Wallet size={18} /> : <Landmark size={18} />}
                    </div>
                    {/* Edit only — deleting an account happens from its own detail page, not here.
                        Hover-only reveal, since a mouse pointer (unlike a thumb) can target it precisely. */}
                    <button onClick={(e) => { e.stopPropagation(); onEdit(a) }} title="Edit account" className="shrink-0 rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-white/5 hover:text-white hover:light:text-slate-900 group-hover:opacity-100"><Pencil size={14} /></button>
                  </div>
                  <div className="mt-4 min-w-0">
                    <div className="truncate text-sm font-semibold text-white light:text-slate-900">{a.name}</div>
                    <div className="truncate text-xs text-slate-500"><span className="capitalize">{a.type.replace('_', ' ')}</span>{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}{debitCard ? ' · debit card linked' : ''}</div>
                  </div>
                  <div className="mt-4 truncate text-2xl font-semibold tracking-tight text-white light:text-slate-900">{showMoney ? money(a.current_balance) : '••••••'}</div>
                  <div className="mt-1 truncate text-[11px] text-slate-500">Opening {money(a.opening_balance)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
