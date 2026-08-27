'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Eye, EyeOff, Landmark, Plus, Target } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { utilisationSeverity } from '@/lib/creditCards'
import { visibleSwatch } from '@/lib/palette'
import { money } from '@/lib/format'
import { CreditCardFlip } from '@/features/credit-cards/CreditCardFlip'
import { CreditCardDetailView } from '@/features/credit-cards/CreditCardDetailView'

export function CreditCardsView({ data, onAdd, onEdit, onDelete, onSpend, onPay, onDeleteSpend, onDeleteTx, showMoney, onToggleMoney, onDetailChange }) {
  const { credit_cards, credit_card_transactions, categories, transactions } = data
  const [selectedCardId, setSelectedCardId] = useState(null)
  const selectedCard = credit_cards.find((c) => c.id === selectedCardId)
  useEffect(() => { onDetailChange?.(selectedCardId) }, [selectedCardId])

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
  const overallSeverity = utilisationSeverity(overallUtil)

  // Per-card share of total outstanding, for the hero's desktop-only side region — "which card
  // is dragging my utilisation up," same idea as Investments' portfolio-mix bar. That "share of
  // total" framing is meaningless with a single card (always 100% by definition, and reads as
  // confusingly close to "100% utilised") — so with just one card, `util` (this card's own
  // outstanding/limit) is shown instead of its trivial 100% mix share; see the render below.
  const cardMix = credit_cards.map((c) => ({
    id: c.id, name: c.name, color: visibleSwatch(c.color || '#a78bfa'), value: Number(c.current_outstanding || 0),
    util: Number(c.credit_limit) > 0 ? Math.round((Number(c.current_outstanding || 0) / Number(c.credit_limit)) * 100) : 0,
  })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  const cardMixTotal = cardMix.reduce((s, c) => s + c.value, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Plastic tracker</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Credit cards</h1>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onAdd} className="hidden items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] lg:flex"><Plus size={15} /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add card</span></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {credit_cards.length > 0 && (
        // lg:+ splits into two regions, same recipe as Investments' hero: the figure stays the
        // left column, and a per-card outstanding breakdown fills the right column instead of
        // the two HeroStatTiles just stretching wider with nothing beside them.
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6 lg:grid lg:grid-cols-[minmax(300px,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">Total outstanding</div>
            <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">
              {showMoney ? money(totalOutstanding) : '••••••••'}
            </div>
            <div className="mt-1 text-sm text-slate-500">{credit_cards.length} card{credit_cards.length === 1 ? '' : 's'}</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <HeroStatTile icon={Landmark} label="Total limit" value={showMoney ? money(totalLimit) : '••••'} />
              <HeroStatTile icon={Target} label="Utilisation" value={`${overallUtil}%`} valueTone={overallSeverity.tone} sub={overallSeverity.label} />
            </div>
          </div>

          <div className="hidden min-w-0 border-white/[.07] light:border-black/[.07] lg:flex lg:flex-col lg:justify-center lg:gap-2.5 lg:border-l lg:pl-8">
            {cardMix.length === 0 ? (
              <div className="text-sm text-slate-500">Nothing outstanding — every card is paid off.</div>
            ) : (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{cardMix.length === 1 ? 'Utilisation' : 'Outstanding by card'}</span>
                <div
                  role="img"
                  aria-label={cardMix.length === 1 ? `${cardMix[0].name}: ${cardMix[0].util}% utilised` : `Outstanding by card: ${cardMix.map((c) => `${c.name} ${((c.value / cardMixTotal) * 100).toFixed(1)}%`).join(', ')}`}
                  className="mt-1.5 flex h-2.5 gap-px overflow-hidden rounded-full border border-white/10 light:border-black/10 bg-white/[.12] light:bg-black/[.09]"
                >
                  {cardMix.length === 1 ? (
                    // Single card: same flat severity color the dashboard's own Liabilities bar
                    // uses (bg-rose-400 etc, no ring) — the card's arbitrary decorative color and
                    // the ring meant to keep that visible against a near-black/near-white swatch
                    // only apply once there's more than one color sharing the track below.
                    <div className={overallSeverity.bar} style={{ width: `${cardMix[0].util}%` }} />
                  ) : (
                    cardMix.map((c) => <div key={c.id} className="ring-1 ring-inset ring-white/25 light:ring-black/20" style={{ width: `${(c.value / cardMixTotal) * 100}%`, background: c.color }} />)
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 light:text-slate-500">
                  {cardMix.map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5">
                      {/* ring guarantees the swatch stays visible even when a card's own color is
                          near-black (e.g. a literal "black card") against this near-black ground,
                          or near-white against the light-theme ground */}
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-inset ring-white/25 light:ring-black/15" style={{ background: c.color }} />
                      {c.name} · {cardMix.length === 1 ? `${c.util}% used` : `${((c.value / cardMixTotal) * 100).toFixed(0)}% of total`}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {credit_cards.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={CreditCard} title="No credit cards yet" message="Track credit card spends, utilisation and pay bills without leaving the app." cta="Add first card" onCta={onAdd} />
        </div>
      ) : (
        // 300-340px matches CreditCardFlip's own fixed aspect-ratio face (it self-caps at
        // max-w-[340px] with mx-auto) — auto-fit lets more cards per row on wide screens instead
        // of capping at 2 columns until 1280px. Bounded to 340px, not left as 1fr: an unbounded
        // track still stretches the whole row width with 1-2 cards, and CreditCardFlip's own
        // mx-auto then centers the card inside that empty track instead of sitting flush left
        // like every other card grid in the app — capping the track is what actually fixes it,
        // the internal max-width alone only stopped the card's own size from growing.
        // justify-center below lg: — mobile is always a single column at this min-width (300px
        // doesn't leave room for two), so a lone card should sit centered like a phone-native
        // single item instead of stuck flush left with empty space beside it. At lg:+, revert to
        // the grid default (flush left, matching every other card grid in the app) — desktop has
        // real room for multiple cards per row, so centering a short row there just looks adrift.
        <div className="grid justify-center gap-6 grid-cols-[repeat(auto-fit,minmax(300px,340px))] lg:justify-start">
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
