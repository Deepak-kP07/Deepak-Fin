'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Download, Eye, EyeOff, Layers, Link2, PiggyBank, Pencil, Plus, RefreshCw, Sparkles, Target, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Select } from '@/components/shared/Select'
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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Wealth builders</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Investments</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefreshAll} disabled={pricesLoading || holdings.length === 0} className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"><RefreshCw size={14} className={pricesLoading ? 'animate-spin' : ''} />{pricesLoading ? 'Fetching…' : 'Refresh prices'}</button>
          <button
            onClick={() => downloadInvestmentsExport({ portfolios, holdings, sips, otherInvestments }, new Date().toISOString().slice(0, 10))}
            disabled={portfolios.length === 0}
            title="Export every portfolio, holding, SIP, and other investment as one CSV"
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
          ><Download size={14} />Export</button>
          <button onClick={onAddPortfolio} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">New portfolio</button>
          <button onClick={() => onAddHolding()} disabled={portfolios.length === 0} title={portfolios.length === 0 ? 'Create a portfolio first' : undefined} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50"><Plus size={15} />Add holding</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Invested value" value={showMoney ? money(totalInvested) : '••••••'} icon={Target} accent="bg-cyan-300/15 text-cyan-200" sub={<span>{portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}</span>} />
        <StatCard label="Current value" value={showMoney ? money(totalCurrent + totalCash) : '••••••'} icon={TrendingUp} accent="bg-violet-400/15 text-violet-200" sub={<span>Everything + cash</span>} />
        <StatCard label="Overall P&L" value={showMoney ? (totalPnl >= 0 ? '+' : '−') + money(totalPnl).replace('-', '') : '••••'} icon={totalPnl >= 0 ? TrendingUp : Target} accent={totalPnl >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'} tone={totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'} sub={<span>{totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%</span>} />
      </div>

      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-xs text-cyan-200">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles size={13} />
          {kiteConnected && kiteBroken ? <span>Kite connection needs attention — the last sync failed.</span> : kiteConnected ? <span>Live prices via <b>Kite</b>. Token refreshes tomorrow after 6 AM IST.</span> : <span>Currently using Yahoo Finance. Connect your Zerodha Kite for real-time NSE quotes and real holdings sync.</span>}
          {(!kiteConnected || kiteBroken) && (
            <button onClick={onConnectKite} className={`ml-auto rounded-lg px-3 py-1 text-[11px] font-semibold ${kiteBroken ? 'bg-amber-400/20 text-amber-100 hover:bg-amber-400/30' : 'bg-cyan-300/20 text-cyan-100 hover:bg-cyan-300/30'}`}>{kiteBroken ? 'Reconnect Kite' : 'Connect Kite'}</button>
          )}
        </div>
        {kiteConnected && !anyPortfolioLinked && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-cyan-300/10 pt-2.5">
            {emptyPortfolios.length === 0 ? (
              <span className="text-cyan-200/70">Create an empty portfolio first, then link it to Kite to sync your real holdings.</span>
            ) : (
              <>
                <span className="text-cyan-200/70">Sync your real Zerodha holdings into:</span>
                <Select value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className="min-w-[180px] rounded-lg border border-cyan-300/20 bg-[#0b1420] px-2.5 py-1.5 text-[11px] text-cyan-100 outline-none">
                  <option value="">Choose a portfolio…</option>
                  {emptyPortfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <button
                  onClick={() => { const p = portfolios.find((x) => x.id === linkChoice); if (p) onLinkKite(p) }}
                  disabled={!linkChoice || kiteSyncBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-300/20 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-300/30 disabled:opacity-50"
                ><Link2 size={12} />{kiteSyncBusy ? 'Linking…' : 'Link'}</button>
              </>
            )}
          </div>
        )}
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={TrendingUp} title="No portfolios yet" message="Create a portfolio like ‘Zerodha Demat A’ to group your holdings." cta="Create portfolio" onCta={onAddPortfolio} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              <div key={p.id} onClick={() => setSelectedPortfolioId(p.id)} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.05]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${p.color || '#a78bfa'}22`, color: p.color || '#a78bfa' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                      {p.kite_linked && <span className="shrink-0 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-200">Kite</span>}
                    </div>
                    <div className="text-xs capitalize text-slate-500">{p.broker.replace('_', ' ')}{assetCounts.length > 0 ? ` · ${assetCounts.join(' · ')}` : ' · empty'}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Value</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(current + cash) : '••••'}</div>
                  </div>
                  <div className={`text-right ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
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
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="text-sm font-semibold text-white">Allocation</div>
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
            const topHoldings = [...holdings].sort((a, b) => (Number(b.qty) * Number(b.current_price || b.avg_buy_price)) - (Number(a.qty) * Number(a.current_price || a.avg_buy_price))).slice(0, 5)
            return grandTotal <= 0 ? (
              <div className="mt-3 text-xs text-slate-500">Nothing to show an allocation for yet.</div>
            ) : (
              <>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-white/5">
                  {buckets.map((b) => <div key={b.label} style={{ width: `${(b.value / grandTotal) * 100}%`, background: b.color }} />)}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  {buckets.map((b) => (
                    <div key={b.label} className="flex items-center gap-1.5 text-slate-400">
                      <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                      {b.label} · {((b.value / grandTotal) * 100).toFixed(1)}% {showMoney && <span className="text-slate-600">({money(b.value)})</span>}
                    </div>
                  ))}
                </div>
                {topHoldings.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">Largest holdings</div>
                    <div className="mt-2 space-y-1.5">
                      {topHoldings.map((h) => {
                        const v = Number(h.qty) * Number(h.current_price || h.avg_buy_price)
                        return (
                          <div key={h.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{h.symbol}</span>
                            <span className="text-slate-500">{grandTotal > 0 ? `${((v / grandTotal) * 100).toFixed(1)}%` : ''} {showMoney && <span className="ml-1 text-white">{money(v)}</span>}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {portfolios.length > 1 && combinedHoldings.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined holdings · {combinedHoldings.length} stock{combinedHoldings.length === 1 ? '' : 's'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] text-[10px] uppercase tracking-widest text-slate-500">
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
                  <tr key={g.symbol} className="border-t border-white/5 text-slate-300">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-semibold text-white">{g.symbol}</div>
                        {g.assetType === 'gold' && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-200">Gold</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{g.portfolioNames.length > 1 ? g.portfolioNames.join(', ') : g.portfolioNames[0]}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{g.qty}</td>
                    <td className="px-3 py-3 text-right">{money2(g.qty > 0 ? g.invested / g.qty : 0)}</td>
                    <td className="px-3 py-3 text-right text-white">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {portfolios.length > 1 && combinedSips.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined SIPs · {combinedSips.length} fund{combinedSips.length === 1 ? '' : 's'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] text-[10px] uppercase tracking-widest text-slate-500">
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
                  <tr key={g.fundName} className="border-t border-white/5 text-slate-300">
                    <td className="px-5 py-3">
                      <div className="text-sm font-semibold text-white">{g.fundName}</div>
                      <div className="text-[11px] text-slate-500">{g.portfolioNames.length > 0 ? g.portfolioNames.join(', ') : 'Unassigned'}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{money2(g.units)}</td>
                    <td className="px-3 py-3 text-right">{money2(g.units > 0 ? g.invested / g.units : 0)}</td>
                    <td className="px-3 py-3 text-right text-white">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {portfolios.length > 1 && combinedOtherInvestments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
            <Layers size={13} />Combined other investments · {combinedOtherInvestments.length} categor{combinedOtherInvestments.length === 1 ? 'y' : 'ies'} across portfolios
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] text-[10px] uppercase tracking-widest text-slate-500">
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
                  <tr key={g.category} className="border-t border-white/5 text-slate-300">
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${CATEGORY_BADGE_STYLE[g.category] || CATEGORY_BADGE_STYLE.other}`}>{g.category}</span>
                      <div className="mt-1 text-[11px] text-slate-500">{g.names.join(', ')}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{g.count}</td>
                    <td className="px-3 py-3 text-right">{showMoney ? money(g.invested) : '••••'}</td>
                    <td className="px-3 py-3 text-right text-white">{showMoney ? money(g.current) : '••••'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${g.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {showMoney ? (g.pnl >= 0 ? '+' : '−') + money(g.pnl).replace('-', '') : '••••'}
                      <div className="text-[10px] font-normal opacity-80">{g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">{g.allocationPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">SIPs</h2>
        <div className="flex gap-2">
          {kiteConnected && (
            <button onClick={onSyncSipsKite} disabled={kiteSyncBusy} className="flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"><RefreshCw size={13} className={kiteSyncBusy ? 'animate-spin' : ''} />{kiteSyncBusy ? 'Syncing…' : 'Sync from Kite'}</button>
          )}
          <button onClick={() => onAddSip()} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"><Plus size={14} />Add SIP</button>
        </div>
      </div>
      {kiteConnected && (
        <div className="-mt-3 text-xs text-cyan-200/70">
          Synced from Kite · {profile?.kite_mf_synced_at ? `last synced ${relativeTime(profile.kite_mf_synced_at)}` : 'not synced yet'}
        </div>
      )}
      {sips.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState compact icon={PiggyBank} title="No SIPs yet" message="Track your mutual fund SIPs here, or sync them from Kite." cta="Add SIP" onCta={() => onAddSip()} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sips.map((s) => {
            const currentValue = Number(s.units_held) * Number(s.nav)
            const pnl = s.average_price != null ? currentValue - Number(s.units_held) * Number(s.average_price) : null
            const isKite = s.source === 'kite'
            const sipPortfolio = portfolios.find((p) => p.id === s.portfolio_id)
            return (
              <div key={s.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-white">{s.fund_name}</div>
                      {isKite && <span className="shrink-0 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-200">Kite</span>}
                    </div>
                    <div className="text-xs text-slate-500">{s.folio_number ? `Folio ${s.folio_number}` : 'No folio number'}{sipPortfolio ? ` · ${sipPortfolio.name}` : ''}</div>
                  </div>
                  {!isKite && (
                    <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEditSip(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteSip(s)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Current value</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(currentValue) : '••••'}</div>
                    {pnl != null && <div className={`mt-0.5 text-[11px] ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnl >= 0 ? '+' : '−'}{showMoney ? money(pnl).replace('-', '') : '••••'}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Monthly</div>
                    <div className="text-sm text-slate-300">{s.monthly_amount > 0 ? money(s.monthly_amount) : '—'}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">{money2(s.units_held)} units · NAV {money2(s.nav)}</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Order history</h2>
      </div>
      {kite_orders.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState compact icon={Wallet} title="No orders tracked yet" message="Starts tracking from when you connect Kite — it doesn't expose your past orders, only what happens from here on." />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
            {kite_orders.map((o) => {
              const isBuy = o.transaction_type === 'BUY'
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.05] ${isBuy ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {isBuy ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div>
                      <div className="text-white">{o.tradingsymbol}{o.segment === 'mf' && o.fund ? ` · ${o.fund}` : ''}</div>
                      <div className="text-[11px] text-slate-500">{o.status}{o.order_timestamp ? ` · ${formatDateTime(o.order_timestamp.slice(0, 10), o.order_timestamp.slice(11, 16))}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${isBuy ? 'text-emerald-300' : 'text-rose-300'}`}>{isBuy ? '+' : '-'}{Number(o.quantity)}</div>
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
