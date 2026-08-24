'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { money } from '@/lib/format'
import { detectAssetType } from '@/lib/investmentAssetType'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function HoldingFormFields({ form, setForm, portfolios }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 sm:col-span-2">Portfolio
        <Select required value={form.portfolio_id} onChange={(e) => setForm({ ...form, portfolio_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          <option value="">Choose portfolio…</option>
          {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.cash_balance || 0)} cash</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300">Symbol
        <input required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 uppercase text-white outline-none focus:border-accent-300/50" placeholder="RELIANCE" />
      </label>
      <label className="text-sm text-slate-300">Exchange
        <Select value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          <option value="NSE">NSE</option><option value="BSE">BSE</option>
        </Select>
      </label>
      <label className="text-sm text-slate-300 sm:col-span-2">Asset type
        <Select value={form.asset_type || 'equity'} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          <option value="equity">Equity</option>
          <option value="gold">Gold</option>
        </Select>
      </label>
      <label className="text-sm text-slate-300 sm:col-span-2">Company name
        <input value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="Reliance Industries" />
      </label>
      <label className="text-sm text-slate-300">Quantity
        <input required type="number" step="0.0001" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300">Avg buy price
        <input required type="number" step="0.01" min="0" value={form.avg_buy_price} onChange={(e) => setForm({ ...form, avg_buy_price: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 sm:col-span-2">Current price <span className="text-xs text-slate-500">(starting value — refresh live prices anytime from the toolbar)</span>
        <input type="number" step="0.01" min="0" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="Same as avg if blank" />
      </label>
    </div>
  )
}

export function HoldingForm({ open, onClose, onSaved, editing, portfolios, defaultPortfolioId, profile, toast, mutate }) {
  const initial = editing
    ? { ...editing, qty: String(editing.qty), avg_buy_price: String(editing.avg_buy_price), current_price: String(editing.current_price) }
    : { portfolio_id: defaultPortfolioId || portfolios[0]?.id || '', symbol: '', exchange: 'NSE', company_name: '', qty: '', avg_buy_price: '', current_price: '', asset_type: 'equity' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open, defaultPortfolioId])
  if (!open) return null

  // A holding's cost comes straight out of its portfolio's un-invested cash_balance (via a DB
  // trigger) — this only ever warns/blocks the INCREASE in cost a save would cause, so reducing
  // a position (or leaving it unchanged) is never blocked, matching how the same guard on
  // accounts (warnIfRisky in TransactionForm) only fires on money actually going out.
  const checkCash = async () => {
    // Kite-synced/imported holdings never touch cash_balance (see the source-gated DB trigger,
    // drizzle/0013_holdings_import_source_no_cash.sql) — warning about insufficient cash for an
    // edit that will never actually spend any would be a false alarm, and with the strict
    // block_insufficient_funds default it would wrongly block the save outright.
    if (editing && editing.source !== 'manual') return true
    if (!form.portfolio_id) return true
    const portfolio = portfolios.find((p) => p.id === form.portfolio_id)
    if (!portfolio) return true
    const newCost = Number(form.qty || 0) * Number(form.avg_buy_price || 0)
    const samePortfolio = editing && editing.portfolio_id === form.portfolio_id
    const oldCost = samePortfolio ? Number(editing.qty || 0) * Number(editing.avg_buy_price || 0) : 0
    const delta = newCost - oldCost
    const cash = Number(portfolio.cash_balance || 0)
    if (delta <= cash + 0.01) return true
    if (profile?.block_insufficient_funds === false) {
      return confirm.ask(`"${portfolio.name}" only has ${money(cash)} in cash — do you want to confirm this purchase anyway?`, { confirmLabel: 'Confirm' })
    }
    await confirm.ask(`"${portfolio.name}" doesn't have enough cash for this purchase. Add funds first, or turn this block off in your Profile settings.`, { okOnly: true })
    return false
  }

  const save = async (e) => {
    e.preventDefault()
    if (!(await checkCash())) return
    setBusy(true)
    try {
      const symbol = form.symbol.toUpperCase()
      // Only upgrades away from the 'equity' default — never overrides an explicit non-equity
      // pick, so a manual "Gold" choice (or a future asset type) always wins over detection.
      const asset_type = form.asset_type === 'equity' ? detectAssetType(symbol) : form.asset_type
      const payload = { ...form, symbol, asset_type, qty: Number(form.qty), avg_buy_price: Number(form.avg_buy_price), current_price: Number(form.current_price || form.avg_buy_price), last_price_updated_at: new Date().toISOString() }
      const { queued } = await mutate({ table: 'holdings', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push(queued ? `Holding ${editing ? 'updated' : 'added'} — will sync when back online` : `Holding ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update holding' : 'Save holding'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit holding' : 'Add holding'}>
        <form onSubmit={save}>
          <HoldingFormFields form={form} setForm={setForm} portfolios={portfolios} />
          {submitButton}
        </form>
        {confirm.view}
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit holding' : 'Add holding'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <HoldingFormFields form={form} setForm={setForm} portfolios={portfolios} />
        </div>
        {submitButton}
      </form>
      {confirm.view}
    </div>
  )
}
