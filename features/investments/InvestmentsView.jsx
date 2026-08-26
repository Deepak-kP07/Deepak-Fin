'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Layers, Link2, MoreVertical, PiggyBank, Pencil, Plus, RefreshCw, Sparkles, Target, Trash2, TrendingUp, Upload, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { StatCard } from '@/components/shared/StatCard'
import { Select } from '@/components/shared/Select'
import { DismissibleBanner } from '@/components/shared/DismissibleBanner'
import { currentValueOf, CATEGORY_BADGE_STYLE } from '@/lib/otherInvestments'
import { downloadInvestmentsExport } from '@/lib/exportInvestments'
import { formatDateTime, money, money2, relativeTime } from '@/lib/format'
import { PortfolioDetailView } from '@/features/investments/PortfolioDetailView'

export function InvestmentsView({
  data, onAddPortfolio, onAddHolding, onBulkImport, onEditPortfolio, onEditHolding, onDeletePortfolio, onDeleteHolding,
  onRefreshRowPrice, onManualPriceEntry, onRefreshAll, pricesLoading, onAddFunds, onWithdrawFunds, onConnectKite,
  onLinkKite, onUnlinkKite, onSyncKite, kiteSyncBusy,
  onAddSip, onEditSip, onDeleteSip, onSyncSipsKite,
  onAddOtherInvestment, onEditOtherInvestment, onDeleteOtherInvestment,
  showMoney, onToggleMoney,
}) {
  const { portfolios, holdings, sips = [], other_investments: otherInvestments = [], transactions, kite_orders = [], profile } = data
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
  const [linkChoice, setLinkChoice] = useState('')
  // Below xl:, New portfolio/Refresh prices/Export collapse into this one menu instead of
  // scattering across an inline header button, a full-width row, and a below-hero row (three
  // different positions and widths for three peer actions) — xl:+ still shows them explicitly
  // inline since there's room there.
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId)
  const kiteConnected = !!profile?.kite_connected
  const kiteBroken = !!profile?.kite_broken
  const anyPortfolioLinked = portfolios.some((p) => p.kite_linked)
  const emptyPortfolios = portfolios.filter((p) => !holdings.some((h) => h.portfolio_id === p.id))

  if (selectedPortfolio) {
    return (
      <PortfolioDetailView
        portfolio={selectedPortfolio}
        holdings={holdings.filter((h) => h.portfolio_id === selectedPortfolio.id)}
        sips={sips.filter((s) => s.portfolio_id === selectedPortfolio.id)}
        otherInvestments={otherInvestments.filter((o) => o.portfolio_id === selectedPortfolio.id)}
        transactions={transactions}
        onBack={() => setSelectedPortfolioId(null)}
        onEdit={onEditPortfolio}
        onDelete={(p) => { onDeletePortfolio(p); setSelectedPortfolioId(null) }}
        onAddFunds={onAddFunds}
        onWithdrawFunds={onWithdrawFunds}
        onAddHolding={onAddHolding}
        onBulkImport={onBulkImport}
        onEditHolding={onEditHolding}
        onDeleteHolding={onDeleteHolding}
        onRefreshRowPrice={onRefreshRowPrice}
        onManualPriceEntry={onManualPriceEntry}
        onEditSip={onEditSip}
        onDeleteSip={onDeleteSip}
        onAddOtherInvestment={onAddOtherInvestment}
        onEditOtherInvestment={onEditOtherInvestment}
        onDeleteOtherInvestment={onDeleteOtherInvestment}
        kiteConnected={kiteConnected}
        canLinkKite={!anyPortfolioLinked || selectedPortfolio.kite_linked}
        kiteSyncBusy={kiteSyncBusy}
        onLinkKite={onLinkKite}
        onUnlinkKite={onUnlinkKite}
        onSyncKite={onSyncKite}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
      />
    )
  }

  const holdingsInvested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const holdingsCurrent = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  // Falls back to nav when average_price is unknown (common for a Kite-synced lumpsum fund
  // with no active SIP mandate behind it) so an unpriced fund contributes 0 to P&L instead of
  // its full value reading as fabricated profit.
  const mfInvested = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0)
  const mfCurrent = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
  const oiInvested = otherInvestments.reduce((s, o) => s + Number(o.purchase_value), 0)
  const oiCurrent = otherInvestments.reduce((s, o) => s + currentValueOf(o), 0)
  const totalInvested = holdingsInvested + mfInvested + oiInvested
  const totalCurrent = holdingsCurrent + mfCurrent + oiCurrent
  const totalCash = portfolios.reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  const totalPnl = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  // Same stock can sit in more than one portfolio (e.g. Zerodha + Groww both holding TCS) — this
  // merges every holding by symbol into one row so its true combined position, cost, and P&L are
  // visible in one place instead of split across separate portfolio cards.
  const combinedHoldings = Object.values(
    holdings.reduce((acc, h) => {
      const key = h.symbol
      if (!acc[key]) acc[key] = { symbol: h.symbol, assetType: h.asset_type, qty: 0, invested: 0, current: 0, portfolioIds: new Set() }
      const g = acc[key]
      g.qty += Number(h.qty)
      g.invested += Number(h.qty) * Number(h.avg_buy_price)
      g.current += Number(h.qty) * Number(h.current_price || h.avg_buy_price)
      g.portfolioIds.add(h.portfolio_id)
      return acc
    }, {})
  ).map((g) => ({
    ...g,
    portfolioNames: [...g.portfolioIds].map((id) => portfolios.find((p) => p.id === id)?.name).filter(Boolean),
    pnl: g.current - g.invested,
    pnlPct: g.invested > 0 ? ((g.current - g.invested) / g.invested) * 100 : 0,
    allocationPct: holdingsCurrent > 0 ? (g.current / holdingsCurrent) * 100 : 0,
  })).sort((a, b) => b.current - a.current)

  // Same idea, applied to SIPs — a fund's "same investment" identity is its name (a folio is
  // just which account holds it), so the same fund tracked from two different broker accounts
  // merges into one true combined position instead of reading as two separate smaller ones.
  const combinedSips = Object.values(
    sips.reduce((acc, s) => {
      const key = s.fund_name
      if (!acc[key]) acc[key] = { fundName: s.fund_name, units: 0, invested: 0, current: 0, portfolioIds: new Set() }
      const g = acc[key]
      g.units += Number(s.units_held)
      g.invested += Number(s.units_held) * Number(s.average_price ?? s.nav)
      g.current += Number(s.units_held) * Number(s.nav)
      if (s.portfolio_id) g.portfolioIds.add(s.portfolio_id)
      return acc
    }, {})
  ).map((g) => ({
    ...g,
    portfolioNames: [...g.portfolioIds].map((id) => portfolios.find((p) => p.id === id)?.name).filter(Boolean),
    pnl: g.current - g.invested,
    pnlPct: g.invested > 0 ? ((g.current - g.invested) / g.invested) * 100 : 0,
    allocationPct: mfCurrent > 0 ? (g.current / mfCurrent) * 100 : 0,
  })).sort((a, b) => b.current - a.current)

  // Other investments aren't fungible the way shares/units are (a "gold necklace" and a "gold
  // coin" aren't the same instrument) — so their "combined" identity is the category itself:
  // total gold across every portfolio, total land, and so on, with the constituent items listed
  // underneath instead of a portfolio list.
  const combinedOtherInvestments = Object.values(
    otherInvestments.reduce((acc, o) => {
      const key = o.category
      if (!acc[key]) acc[key] = { category: o.category, count: 0, invested: 0, current: 0, names: [] }
      const g = acc[key]
      g.count += 1
      g.invested += Number(o.purchase_value)
      g.current += currentValueOf(o)
      g.names.push(o.name)
      return acc
    }, {})
  ).map((g) => ({
    ...g,
    pnl: g.current - g.invested,
    pnlPct: g.invested > 0 ? ((g.current - g.invested) / g.invested) * 100 : 0,
    allocationPct: oiCurrent > 0 ? (g.current / oiCurrent) * 100 : 0,
  })).sort((a, b) => b.current - a.current)

  // Per-portfolio share of the total, for the hero's desktop-only side region — same idea as
  // Dashboard's assets-vs-liabilities composition bar, but for "which broker is my money in."
  const portfolioMix = portfolios.map((p) => {
    const items = holdings.filter((h) => h.portfolio_id === p.id)
    const pSips = sips.filter((s) => s.portfolio_id === p.id)
    const pOther = otherInvestments.filter((o) => o.portfolio_id === p.id)
    const current = items.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
      + pSips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
      + pOther.reduce((s, o) => s + currentValueOf(o), 0)
      + Number(p.cash_balance || 0)
    return { id: p.id, name: p.name, color: p.color || '#a78bfa', value: current }
  }).filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  const portfolioMixTotal = portfolioMix.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Wealth builders</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Investments</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* xl:+ only: New portfolio/Refresh prices/Export as explicit inline buttons — there's
              room for all header controls only from 1280px up (they collide with the title at
              1024px otherwise). Below xl:, all three fold into the "More" menu at the end of the
              row instead. */}
          <button onClick={onRefreshAll} disabled={pricesLoading || holdings.length === 0} className="hidden items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 light:text-emerald-700 hover:bg-emerald-400/20 disabled:opacity-50 xl:flex"><RefreshCw size={14} className={pricesLoading ? 'animate-spin' : ''} />{pricesLoading ? 'Fetching…' : 'Refresh prices'}</button>
          <button
            onClick={() => downloadInvestmentsExport({ portfolios, holdings, sips, otherInvestments }, new Date().toISOString().slice(0, 10))}
            disabled={portfolios.length === 0}
            title="Export every portfolio, holding, SIP, and other investment as one CSV"
            className="hidden items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-medium text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50 xl:flex"
          ><Upload size={14} />Export</button>
          <button onClick={onAddPortfolio} className="hidden rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 xl:block">New portfolio</button>

          <button onClick={() => onAddHolding()} disabled={portfolios.length === 0} title={portfolios.length === 0 ? 'Create a portfolio first' : undefined} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50"><Plus size={15} /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add holding</span></button>

          <div ref={moreRef} className="relative xl:hidden">
            <button type="button" onClick={() => setMoreOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${moreOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`} title="More options">
              <MoreVertical size={16} />
            </button>
            {/* right-0: this trigger sits at the RIGHT end of the action row, so right-aligning
                the menu (extending left, where there's room) keeps it on-screen. */}
            {moreOpen && (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
                <button type="button" onClick={() => { setMoreOpen(false); onAddPortfolio() }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">New portfolio</button>
                <button type="button" disabled={pricesLoading || holdings.length === 0} onClick={() => { setMoreOpen(false); onRefreshAll() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50"><RefreshCw size={14} className={pricesLoading ? 'animate-spin' : ''} />{pricesLoading ? 'Fetching…' : 'Refresh prices'}</button>
                <button
                  type="button"
                  disabled={portfolios.length === 0}
                  onClick={() => { setMoreOpen(false); downloadInvestmentsExport({ portfolios, holdings, sips, otherInvestments }, new Date().toISOString().slice(0, 10)) }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50"
                ><Upload size={14} />Export</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* lg:+ splits into two regions, mirroring the Dashboard net-worth card: the figure stays
          the left column, and a portfolio-mix breakdown fills the right column instead of the
          card just stretching its hero content across the full width with nothing beside it. */}
      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-6 lg:grid lg:grid-cols-[minmax(300px,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Current value</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">
            {showMoney ? money(totalCurrent + totalCash) : '••••••••'}
          </div>
          <div className="mt-1 text-sm text-slate-500">Everything + cash · {portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}</div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroStatTile icon={Target} label="Invested" value={showMoney ? money(totalInvested) : '••••'} />
            <HeroStatTile
              icon={TrendingUp}
              label="Overall P&L"
              value={showMoney ? (totalPnl >= 0 ? '+' : '−') + money(totalPnl).replace('-', '') : '••••'}
              valueTone={totalPnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}
              sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`}
            />
          </div>
        </div>

        <div className="hidden min-w-0 border-white/[.07] light:border-black/[.07] lg:flex lg:flex-col lg:justify-center lg:gap-2.5 lg:border-l lg:pl-8">
          {portfolioMix.length === 0 ? (
            <div className="text-sm text-slate-500">Nothing to break down by portfolio yet.</div>
          ) : (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portfolio mix</span>
              <div
                role="img"
                aria-label={`Portfolio mix: ${portfolioMix.map((p) => `${p.name} ${((p.value / portfolioMixTotal) * 100).toFixed(1)}%`).join(', ')}`}
                className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
              >
                {portfolioMix.map((p) => <div key={p.id} style={{ width: `${(p.value / portfolioMixTotal) * 100}%`, background: p.color }} />)}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 light:text-slate-500">
                {portfolioMix.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
                    {p.name} · {((p.value / portfolioMixTotal) * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <DismissibleBanner tone="cyan">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles size={13} />
          {kiteConnected && kiteBroken ? <span>Kite connection needs attention — the last sync failed.</span> : kiteConnected ? <span>Live prices via <b>Kite</b>. Token refreshes tomorrow after 6 AM IST.</span> : <span>Currently using Yahoo Finance. Connect your Zerodha Kite for real-time NSE quotes and real holdings sync.</span>}
          {(!kiteConnected || kiteBroken) && (
            <button onClick={onConnectKite} className={`ml-auto rounded-lg px-3 py-1 text-[11px] font-semibold ${kiteBroken ? 'bg-amber-400/20 text-amber-100 light:text-amber-800 hover:bg-amber-400/30' : 'bg-accent-300/20 text-accent-100 light:text-accent-700 hover:bg-accent-300/30'}`}>{kiteBroken ? 'Reconnect Kite' : 'Connect Kite'}</button>
          )}
        </div>
        {kiteConnected && !anyPortfolioLinked && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-accent-300/10 pt-2.5">
            {emptyPortfolios.length === 0 ? (
              <span className="text-accent-200/70 light:text-accent-700">Create an empty portfolio first, then link it to Kite to sync your real holdings.</span>
            ) : (
              <>
                <span className="text-accent-200/70 light:text-accent-700">Sync your real Zerodha holdings into:</span>
                <Select value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className="min-w-[180px] rounded-lg border border-accent-300/20 bg-[#0b1420] px-2.5 py-1.5 text-[11px] text-accent-100 light:text-accent-700 outline-none">
                  <option value="">Choose a portfolio…</option>
                  {emptyPortfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <button
                  onClick={() => { const p = portfolios.find((x) => x.id === linkChoice); if (p) onLinkKite(p) }}
                  disabled={!linkChoice || kiteSyncBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-accent-300/20 px-3 py-1.5 text-[11px] font-semibold text-accent-100 light:text-accent-700 hover:bg-accent-300/30 disabled:opacity-50"
                ><Link2 size={12} />{kiteSyncBusy ? 'Linking…' : 'Link'}</button>
              </>
            )}
          </div>
        )}
      </DismissibleBanner>

      {portfolios.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState icon={TrendingUp} title="No portfolios yet" message="Create a portfolio like ‘Zerodha Demat A’ to group your holdings." cta="Create portfolio" onCta={onAddPortfolio} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,420px))]">
          {portfolios.map((p) => {
            const items = holdings.filter((h) => h.portfolio_id === p.id)
            const pSips = sips.filter((s) => s.portfolio_id === p.id)
            const pOther = otherInvestments.filter((o) => o.portfolio_id === p.id)
            const invested = items.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
              + pSips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0)
              + pOther.reduce((s, o) => s + Number(o.purchase_value), 0)
            const current = items.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
              + pSips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
              + pOther.reduce((s, o) => s + currentValueOf(o), 0)
            const cash = Number(p.cash_balance || 0)
            const pnl = current - invested
            const pct = invested > 0 ? (pnl / invested) * 100 : 0
            const assetCounts = [
              items.length > 0 ? `${items.length} holding${items.length === 1 ? '' : 's'}` : null,
              pSips.length > 0 ? `${pSips.length} SIP${pSips.length === 1 ? '' : 's'}` : null,
              pOther.length > 0 ? `${pOther.length} other` : null,
            ].filter(Boolean)
            return (
              <div key={p.id} onClick={() => setSelectedPortfolioId(p.id)} className="cursor-pointer rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5 transition hover:border-accent-300/30 hover:bg-white/[.05] hover:light:bg-black/[.035]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${p.color || '#a78bfa'}22`, color: p.color || '#a78bfa' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-white light:text-slate-900">{p.name}</div>
                      {p.kite_linked && <span className="shrink-0 rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700">Kite</span>}
                    </div>
                    <div className="text-xs capitalize text-slate-500">{p.broker.replace('_', ' ')}{assetCounts.length > 0 ? ` · ${assetCounts.join(' · ')}` : ' · empty'}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Value</div>
                    <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(current + cash) : '••••'}</div>
                  </div>
                  <div className={`text-right ${pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                    <div className="text-xs opacity-70">P&L</div>
                    <div className="text-sm font-semibold">{showMoney ? (pnl >= 0 ? '+' : '−') + money(pnl).replace('-', '') : '••••'} <span className="text-[10px]">({pct.toFixed(1)}%)</span></div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Cash {money(cash)}</div>
              </div>
            )
          })}
        </div>
      )}

      {(holdings.length > 0 || sips.length > 0 || otherInvestments.length > 0 || totalCash > 0) && (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
          <div className="text-sm font-semibold text-white light:text-slate-900">Allocation</div>
          {(() => {
            const oiByCategory = (cat) => otherInvestments.filter((o) => o.category === cat).reduce((s, o) => s + currentValueOf(o), 0)
            const holdingsGoldCurrent = holdings.filter((h) => h.asset_type === 'gold').reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
            // Physical gold (jewelry etc.) joins Gold ETFs/SGBs in the same bucket — both are
            // just "how much of my money is in gold," regardless of which form it's held in.
            const buckets = [
              { label: 'Equity', value: holdingsCurrent - holdingsGoldCurrent, color: '#22d3ee' },
              { label: 'Gold', value: holdingsGoldCurrent + oiByCategory('gold'), color: '#facc15' },
              { label: 'Silver', value: oiByCategory('silver'), color: '#a3a3a3' },
              { label: 'Land', value: oiByCategory('land'), color: '#84cc16' },
              { label: 'Bonds', value: oiByCategory('bond'), color: '#818cf8' },
              { label: 'Mutual funds', value: mfCurrent, color: '#a78bfa' },
              { label: 'Other', value: oiByCategory('other'), color: '#fb7185' },
              { label: 'Cash', value: totalCash, color: '#34d399' },
            ].filter((b) => b.value > 0)
            const grandTotal = buckets.reduce((s, b) => s + b.value, 0)
            // combinedHoldings (already merged by symbol above) — not raw `holdings` — so a stock
            // split across two portfolios (e.g. TCS in both Zerodha and Groww) shows once here,
            // matching what the Combined Holdings table below correctly does.
            const topHoldings = combinedHoldings.slice(0, 5)
            // Bar+legend and "largest holdings" stack full-width on mobile (unchanged); at lg:
            // they sit side by side so the bar isn't stretched across the whole desktop width
            // with nothing next to it, matching Dashboard's two-region hero split.
            return grandTotal <= 0 ? (
              <div className="mt-3 text-xs text-slate-500">Nothing to show an allocation for yet.</div>
            ) : (
              <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-6">
                <div>
                  <div
                    role="img"
                    aria-label={`Allocation: ${buckets.map((b) => `${b.label} ${((b.value / grandTotal) * 100).toFixed(1)}%`).join(', ')}`}
                    className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/5"
                  >
                    {buckets.map((b) => <div key={b.label} style={{ width: `${(b.value / grandTotal) * 100}%`, background: b.color }} />)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                    {buckets.map((b) => (
                      <div key={b.label} className="flex items-center gap-1.5 text-slate-400 light:text-slate-500">
                        <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                        {b.label} · {((b.value / grandTotal) * 100).toFixed(1)}% {showMoney && <span className="text-slate-600">({money(b.value)})</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {topHoldings.length > 0 && (
                  <div className="mt-4 border-t border-white/5 light:border-black/5 pt-3 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Largest holdings</div>
                    <div className="mt-2 space-y-1.5">
                      {topHoldings.map((h) => (
                        <div key={h.symbol} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 light:text-slate-700">{h.symbol}</span>
                          <span className="text-slate-500">{grandTotal > 0 ? `${((h.current / grandTotal) * 100).toFixed(1)}%` : ''} {showMoney && <span className="ml-1 text-white light:text-slate-900">{money(h.current)}</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {portfolios.length > 1 && combinedHoldings.length > 0 && (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined holdings · {combinedHoldings.length} stock{combinedHoldings.length === 1 ? '' : 's'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] light:bg-black/[.02] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Symbol</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Avg buy</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-3 py-3 text-right">P&L</th>
                  <th className="px-3 py-3 text-right">Alloc.</th>
                </tr>
              </thead>
              <tbody>
                {combinedHoldings.map((g) => (
                  <tr key={g.symbol} className="border-t border-white/5 light:border-black/5 text-slate-300 light:text-slate-700">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-semibold text-white light:text-slate-900">{g.symbol}</div>
                        {g.assetType === 'gold' && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-200 light:text-amber-700">Gold</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{g.portfolioNames.length > 1 ? g.portfolioNames.join(', ') : g.portfolioNames[0]}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{g.qty}</td>
                    <td className="px-3 py-3 text-right">{money2(g.qty > 0 ? g.invested / g.qty : 0)}</td>
                    <td className="px-3 py-3 text-right text-white light:text-slate-900">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 light:text-slate-500">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {portfolios.length > 1 && combinedSips.length > 0 && (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined SIPs · {combinedSips.length} fund{combinedSips.length === 1 ? '' : 's'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] light:bg-black/[.02] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Fund</th>
                  <th className="px-3 py-3 text-right">Units</th>
                  <th className="px-3 py-3 text-right">Avg cost</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-3 py-3 text-right">P&L</th>
                  <th className="px-3 py-3 text-right">Alloc.</th>
                </tr>
              </thead>
              <tbody>
                {combinedSips.map((g) => (
                  <tr key={g.fundName} className="border-t border-white/5 light:border-black/5 text-slate-300 light:text-slate-700">
                    <td className="px-5 py-3">
                      <div className="whitespace-nowrap text-sm font-semibold text-white light:text-slate-900">{g.fundName}</div>
                      <div className="whitespace-nowrap text-[11px] text-slate-500">{g.portfolioNames.length > 0 ? g.portfolioNames.join(', ') : 'Unassigned'}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{money2(g.units)}</td>
                    <td className="px-3 py-3 text-right">{money2(g.units > 0 ? g.invested / g.units : 0)}</td>
                    <td className="px-3 py-3 text-right text-white light:text-slate-900">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 light:text-slate-500">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {portfolios.length > 1 && combinedOtherInvestments.length > 0 && (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <div className="flex items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined other investments · {combinedOtherInvestments.length} categor{combinedOtherInvestments.length === 1 ? 'y' : 'ies'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] light:bg-black/[.02] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-3 py-3 text-right">Items</th>
                  <th className="px-3 py-3 text-right">Invested</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-3 py-3 text-right">P&L</th>
                  <th className="px-3 py-3 text-right">Alloc.</th>
                </tr>
              </thead>
              <tbody>
                {combinedOtherInvestments.map((g) => (
                  <tr key={g.category} className="border-t border-white/5 light:border-black/5 text-slate-300 light:text-slate-700">
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${CATEGORY_BADGE_STYLE[g.category] || CATEGORY_BADGE_STYLE.other}`}>{g.category}</span>
                      <div className="mt-1 text-[11px] text-slate-500">{g.names.join(', ')}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{g.count}</td>
                    <td className="px-3 py-3 text-right">{showMoney ? money(g.invested) : '••••'}</td>
                    <td className="px-3 py-3 text-right text-white light:text-slate-900">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400 light:text-slate-500">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">SIPs</h2>
        <div className="flex gap-2">
          {kiteConnected && (
            <button onClick={onSyncSipsKite} disabled={kiteSyncBusy} className="flex items-center gap-2 rounded-xl border border-accent-300/25 bg-accent-400/10 px-3 py-2 text-xs font-medium text-accent-200 light:text-accent-700 hover:bg-accent-400/20 disabled:opacity-50"><RefreshCw size={13} className={kiteSyncBusy ? 'animate-spin' : ''} />{kiteSyncBusy ? 'Syncing…' : 'Sync from Kite'}</button>
          )}
          <button onClick={() => onAddSip()} className="flex items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-3 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:bg-white/5"><Plus size={14} />Add SIP</button>
        </div>
      </div>
      {kiteConnected && (
        <div className="-mt-3 text-xs text-accent-200/70 light:text-accent-700">
          Synced from Kite · {profile?.kite_mf_synced_at ? `last synced ${relativeTime(profile.kite_mf_synced_at)}` : 'not synced yet'}
        </div>
      )}
      {sips.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState compact icon={PiggyBank} title="No SIPs yet" message="Track your mutual fund SIPs here, or sync them from Kite." cta="Add SIP" onCta={() => onAddSip()} />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,420px))]">
          {sips.map((s) => {
            const currentValue = Number(s.units_held) * Number(s.nav)
            const pnl = s.average_price != null ? currentValue - Number(s.units_held) * Number(s.average_price) : null
            const isKite = s.source === 'kite'
            const sipPortfolio = portfolios.find((p) => p.id === s.portfolio_id)
            return (
              <div key={s.id} className="group rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-white light:text-slate-900">{s.fund_name}</div>
                      {isKite && <span className="shrink-0 rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700">Kite</span>}
                    </div>
                    <div className="text-xs text-slate-500">{s.folio_number ? `Folio ${s.folio_number}` : 'No folio number'}{sipPortfolio ? ` · ${sipPortfolio.name}` : ''}</div>
                  </div>
                  {!isKite && (
                    <div className="flex shrink-0 gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                      <button onClick={() => onEditSip(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteSip(s)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Current value</div>
                    <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(currentValue) : '••••'}</div>
                    {pnl != null && <div className={`mt-0.5 text-[11px] ${pnl >= 0 ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>{pnl >= 0 ? '+' : '−'}{showMoney ? money(pnl).replace('-', '') : '••••'}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Monthly</div>
                    <div className="text-sm text-slate-300 light:text-slate-700">{s.monthly_amount > 0 ? money(s.monthly_amount) : '—'}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">{money2(s.units_held)} units · NAV {money2(s.nav)}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white light:text-slate-900">Order history</h2>
      </div>
      {kite_orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <EmptyState compact icon={Wallet} title="No orders tracked yet" message="Starts tracking from when you connect Kite — it doesn't expose your past orders, only what happens from here on." />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025]">
          <div className="max-h-96 divide-y divide-white/5 light:divide-black/5 overflow-y-auto">
            {kite_orders.map((o) => {
              const isBuy = o.transaction_type === 'BUY'
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.05] light:bg-black/[.035] ${isBuy ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
                      {isBuy ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <div className="text-white light:text-slate-900">{o.tradingsymbol}{o.segment === 'mf' && o.fund ? ` · ${o.fund}` : ''}</div>
                      <div className="text-[11px] text-slate-500">{o.status}{o.order_timestamp ? ` · ${formatDateTime(o.order_timestamp.slice(0, 10), o.order_timestamp.slice(11, 16))}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${isBuy ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>{isBuy ? '+' : '-'}{Number(o.quantity)}</div>
                    <div className="text-[11px] text-slate-500">{money2(o.average_price || o.price)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
