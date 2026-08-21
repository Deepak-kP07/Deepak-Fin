'use client'

import { useState } from 'react'
import { CreditCard, Eye, EyeOff, Landmark, Plus, Target } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { money } from '@/lib/format'
import { CreditCardFlip } from '@/features/credit-cards/CreditCardFlip'
import { CreditCardDetailView } from '@/features/credit-cards/CreditCardDetailView'

export function CreditCardsView({ data, onAdd, onEdit, onDelete, onSpend, onPay, onDeleteSpend, onDeleteTx, showMoney, onToggleMoney }) {
  const { credit_cards, credit_card_transactions, categories, transactions } = data
  const [selectedCardId, setSelectedCardId] = useState(null)
  const selectedCard = credit_cards.find((c) => c.id === selectedCardId)

  if (selectedCard) {
    return (
      <CreditCardDetailView
        card={selectedCard}
        cardTransactions={credit_card_transactions.filter((t) => t.credit_card_id === selectedCard.id)}
        allTransactions={transactions}
        categories={categories}
        onBack={() => setSelectedCardId(null)}
        onSpend={onSpend}
        onPay={onPay}
        onDeleteSpend={onDeleteSpend}
        onDeleteTx={onDeleteTx}
        onEdit={onEdit}
        onDelete={(c) => { onDelete(c); setSelectedCardId(null) }}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
      />
    )
  }

  const totalOutstanding = credit_cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const totalLimit = credit_cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const overallUtil = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Plastic tracker</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Credit cards</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add card</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {credit_cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total outstanding" value={showMoney ? money(totalOutstanding) : '••••••'} icon={CreditCard} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span className="text-rose-300">{credit_cards.length} card{credit_cards.length === 1 ? '' : 's'}</span>} />
          <StatCard label="Total limit" value={showMoney ? money(totalLimit) : '••••••'} icon={Landmark} accent="bg-cyan-300/15 text-cyan-200" sub={<span>Combined limit</span>} />
          <StatCard label="Overall utilisation" value={`${overallUtil}%`} icon={Target} accent="bg-violet-400/15 text-violet-200" sub={<span className={overallUtil <= 30 ? 'text-emerald-300' : overallUtil <= 60 ? 'text-amber-300' : 'text-rose-300'}>{overallUtil <= 30 ? 'Healthy' : overallUtil <= 60 ? 'Rising' : 'High'}</span>} tone={overallUtil <= 30 ? 'text-emerald-300' : 'text-amber-300'} />
        </div>
      )}

      {credit_cards.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={CreditCard} title="No credit cards yet" message="Track credit card spends, utilisation and pay bills without leaving the app." cta="Add first card" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {credit_cards.map((card) => (
            <CreditCardFlip
              key={card.id}
              card={card}
              showMoney={showMoney}
              onSpend={onSpend}
              onPay={onPay}
              onViewDetails={(c) => setSelectedCardId(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
