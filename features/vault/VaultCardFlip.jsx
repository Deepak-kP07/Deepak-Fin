'use client'

import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { Eye, Landmark, Pencil, RotateCcw, Share2, Trash2 } from 'lucide-react'
import { BankCardFace } from '@/components/shared/BankCardFace'
import { capitalizeFirst } from '@/lib/format'

const TYPE_LABEL = { bank_account: 'Bank account', debit_card: 'Debit card', credit_card: 'Credit card' }

function groupNumber(v) {
  return String(v || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

// Deliberately excludes pin/cvv even though they're on screen at this point (the manual reveal
// shows everything) — sharing is for handing someone your account/card number, not your PIN.
// Carries the same referral signature the page-level share button would have, since every real
// share now doubles as a mention of the app instead of that button existing on its own.
function shareCaption(item, secrets) {
  const who = secrets.holder_name || item.label
  const heading = item.bank_name ? [item.bank_name, who] : [who]
  const lines = item.item_type === 'bank_account'
    ? [`A/C: ${secrets.account_number || '—'}`, `IFSC: ${secrets.ifsc_code || '—'}`, secrets.branch && `Branch: ${secrets.branch}`]
    : [`Card: ${groupNumber(secrets.card_number) || '—'}`, `Expiry: ${secrets.expiry_month || '--'}/${secrets.expiry_year || '--'}`]
  return [...heading, ...lines.filter(Boolean), '', 'Sent via Personal Fin — manage all your personal finance at personalfin.site'].join('\n')
}

// Snapshots the actual front-face DOM node (not a redrawn approximation) so the shared image is
// pixel-for-pixel what's already on screen — same gradient, chip, wifi mark, number, and holder
// name — and never drifts out of sync if that design changes later.
async function cardImageFile(frontNode, filename) {
  const blob = await toBlob(frontNode, { pixelRatio: 2, cacheBust: true })
  return new File([blob], filename, { type: 'image/png' })
}

// Real mobile OS share sheets (Android/iOS) handle a shared image file natively; desktop
// Chrome's navigator.share for files goes through a much shakier bridge that (at least with
// WhatsApp Desktop as the target) both duplicates the image and pastes the file's local temp
// path as raw text glued onto the caption. Gating native file-share to actual mobile devices —
// not just a narrow viewport, which a resized desktop window can also match — keeps desktop on
// the download+text fallback below, which has neither problem.
function isMobileDevice() {
  return typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')
}

async function shareItem(item, secrets, frontNode) {
  const text = shareCaption(item, secrets)
  const filename = `${(item.label || 'card').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()}.png`
  let file = null
  try { file = await cardImageFile(frontNode, filename) } catch { /* falls through to text-only share below */ }

  if (file && isMobileDevice() && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: item.label, text }) } catch { /* user cancelled the share sheet */ }
    return
  }
  // No file-share support (desktop browsers, some older WebViews) — download the image so it can
  // be attached manually, and still open the chat with the caption ready to send alongside it.
  if (file) {
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url; link.download = filename
    document.body.appendChild(link); link.click(); link.remove()
    URL.revokeObjectURL(url)
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ title: item.label, text }) } catch { /* user cancelled the share sheet */ }
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }
}

// Same flip mechanism as features/credit-cards/CreditCardFlip.jsx (pure CSS 3D transform, no
// library) — but unlike that card, the back never shows cached numbers. It starts masked and
// only decrypts on an explicit Reveal click; the revealed values live in local state only and
// are dropped the moment the card is flipped back or unmounted, never touching shared app state.
export function VaultCardFlip({ item, onEdit, onDelete }) {
  const [flipped, setFlipped] = useState(false)
  const [secrets, setSecrets] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const frontRef = useRef(null)
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  const flipBack = () => { setFlipped(false); setSecrets(null) }

  const doShare = async () => {
    if (sharing) return
    setSharing(true)
    try { await shareItem(item, secrets, frontRef.current) } finally { setSharing(false) }
  }

  const reveal = async () => {
    setRevealing(true)
    try {
      const res = await fetch(`/api/finance/vault_items/${item.id}/reveal`, { method: 'POST' })
      if (res.ok) setSecrets((await res.json()).secrets)
    } finally { setRevealing(false) }
  }

  // The front shows the real number and holder name without a tap — unlike the back's `secrets`
  // above, which stays gated behind an explicit reveal. `?preview=1` decrypts server-side but
  // strips PIN/CVV/expiry/IFSC/branch/notes before responding, so those never reach the client
  // just from a card being on screen.
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/finance/vault_items/${item.id}/reveal?preview=1`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.secrets) setPreview(d.secrets) })
    return () => { cancelled = true }
  }, [item.id])

  const isCard = item.item_type === 'debit_card' || item.item_type === 'credit_card'

  return (
    <div className="mx-auto aspect-[85/54] w-full max-w-[340px] cursor-pointer select-none" style={{ perspective: '1500px' }} onClick={() => setFlipped((f) => !f)}>
      <div className="relative h-full w-full transition-transform duration-700 ease-out" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
        <div ref={frontRef} className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {isCard ? (
            <BankCardFace
              name={item.label}
              subtitle={item.bank_name || TYPE_LABEL[item.item_type]}
              last4={item.last4}
              color={item.color || '#a78bfa'}
              fill
              holderName={preview?.holder_name || undefined}
            />
          ) : (
            <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${item.color || '#22d3ee'} 0%, ${item.color || '#22d3ee'}cc 45%, #0b0f18 100%)` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[.06]" />
              <div className="relative flex items-start justify-between">
                <Landmark size={18} className="text-white/80" />
              </div>
              <div className="relative">
                <div className="font-mono text-[13px] tracking-[0.18em] text-white/90 sm:text-base">
                  ••{item.last4 || '••••'}
                </div>
                <div className="mt-2 text-xs font-semibold leading-tight text-white sm:text-sm">{preview?.holder_name || item.label}</div>
                {(preview?.holder_name ? item.label || item.bank_name : item.bank_name) && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/60 sm:text-[10px]">
                    {preview?.holder_name ? (
                      <>
                        {item.label && <span className="truncate">{item.label}</span>}
                        {item.label && item.bank_name && <span>·</span>}
                        {item.bank_name && <span className="truncate">{item.bank_name}</span>}
                      </>
                    ) : (
                      <span className="truncate">{item.bank_name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#141a28] p-3.5 shadow-lg" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{TYPE_LABEL[item.item_type]}{item.bank_name ? ` · ${item.bank_name}` : ''}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* Only appears once the details are actually on screen — nothing to share
                    before the explicit reveal above has happened. */}
                {secrets && (
                  <button type="button" onClick={stop(doShare)} disabled={sharing} title="Share" className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50">{sharing ? <span className="block h-[13px] w-[13px] animate-spin rounded-full border-[1.5px] border-slate-500 border-t-transparent" /> : <Share2 size={13} />}</button>
                )}
                <button type="button" onClick={stop(flipBack)} title="Flip back" className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"><RotateCcw size={13} /></button>
              </div>
            </div>

            {/* A real card's back has a magnetic stripe right below the header — this is what
                was missing, leaving a big blank gap before the reveal button and making the
                whole face read as a plain settings panel rather than a card. */}
            <div className="-mx-3.5 mt-3 h-7 bg-black/70" />

            {!secrets ? (
              <div className="mt-4 flex flex-col items-center gap-2 py-2">
                <button type="button" onClick={stop(reveal)} disabled={revealing} className="flex items-center gap-1.5 rounded-lg bg-white/[.06] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/[.1] disabled:opacity-50">
                  <Eye size={13} />{revealing ? 'Decrypting…' : 'Tap to reveal'}
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-200">
                {item.item_type === 'bank_account' ? (
                  <>
                    <div>Acc no: <span className="text-white">{secrets.account_number || '—'}</span></div>
                    <div>IFSC: <span className="text-white">{secrets.ifsc_code || '—'}</span></div>
                    {secrets.branch && <div>Branch: <span className="text-white">{secrets.branch}</span></div>}
                  </>
                ) : (
                  <>
                    <div className="tracking-[0.15em] text-white">{groupNumber(secrets.card_number) || '—'}</div>
                    <div>Expiry: <span className="text-white">{secrets.expiry_month || '--'}/{secrets.expiry_year || '--'}</span> &nbsp; CVV: <span className="text-white">{secrets.cvv || '—'}</span></div>
                    {secrets.pin && <div>PIN: <span className="text-white">{secrets.pin}</span></div>}
                  </>
                )}
                {secrets.notes && <div className="pt-1 text-slate-400">{capitalizeFirst(secrets.notes)}</div>}
              </div>
            )}
          </div>

          <div className="flex gap-1.5">
            <button type="button" onClick={stop(() => onEdit(item))} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[.06] py-1.5 text-[11px] font-semibold text-white hover:bg-white/[.1]"><Pencil size={12} />Edit</button>
            <button type="button" onClick={stop(() => onDelete(item))} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-300/20 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-300/10"><Trash2 size={12} />Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
