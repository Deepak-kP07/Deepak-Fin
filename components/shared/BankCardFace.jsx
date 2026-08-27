import { Wifi } from 'lucide-react'

// A stylised physical-card face — chip, contactless mark, masked number, name/issuer —
// used anywhere an account is actually backed by a real card (a credit card, or a bank
// account with a debit card linked to it). Accounts with no card of their own (plain bank,
// cash) don't get this treatment; there's no card to depict.
//
// `revealedNumber`/`holderName` are optional and additive, used only by the Vault's own card
// faces (which show the real number and an actual person's name up front, unlike every other
// caller here — Credit Cards, the debit-card face in Account detail — which stay masked with
// just the item's label). Omitted, the face renders exactly as it always has.
export function BankCardFace({ name, subtitle, last4, color = '#a78bfa', fill = false, revealedNumber, holderName }) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl p-4 shadow-lg ${fill ? 'h-full' : 'aspect-[85/54]'}`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 45%, #0b0f18 100%)` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[.06]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="h-6 w-8 rounded-[5px] bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500 shadow-inner sm:h-7 sm:w-9">
            <div className="grid h-full grid-cols-3 grid-rows-2 gap-px p-[3px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[1px] bg-yellow-700/40" />
              ))}
            </div>
          </div>
          <Wifi size={18} className="rotate-90 text-white/70" />
        </div>
        <div>
          <div className="font-mono text-[13px] font-bold tracking-[0.18em] text-white/90 sm:text-base">
            {revealedNumber || `•••• •••• •••• ${last4 || '••••'}`}
          </div>
          {/* Same "own full-width line" reasoning either way — when a holder name is supplied
              it takes the prominent slot (like a real card) and the item's own label moves down
              into the subtitle row alongside the issuer; otherwise the label keeps that slot,
              same as before. */}
          <div className="mt-2 text-xs font-semibold leading-tight text-white sm:text-sm">{holderName || name}</div>
          {holderName ? (
            (name || subtitle) && (
              <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/60 sm:text-[10px]">
                {name && <span className="truncate">{name}</span>}
                {name && subtitle && <span>·</span>}
                {subtitle && <span className="truncate">{subtitle}</span>}
              </div>
            )
          ) : (
            (subtitle || last4) && (
              <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/60 sm:text-[10px]">
                {subtitle && <span className="truncate">{subtitle}</span>}
                {subtitle && last4 && <span>·</span>}
                {last4 && <span className="shrink-0">••{last4}</span>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
