'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Download, Eye, EyeOff, Link2, Pencil, PiggyBank, RefreshCw, Target, Trash2, TrendingUp, Unlink, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { NetBar } from '@/components/shared/NetBar'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { currentValueOf, CATEGORY_BADGE_STYLE } from '@/lib/otherInvestments'
import { formatDate, formatDateTime, money, money2, monthName, relativeTime } from '@/lib/format'

export function PortfolioDetailView({
  portfolio, holdings, sips = [], otherInvestments = [], transactions, onBack, onEdit, onDelete, onAddFunds, onWithdrawFunds,
  onAddHolding, onBulkImport, onEditHolding, onDeleteHolding, onRefreshRowPrice, onManualPriceEntry,
  onEditSip, onDeleteSip, onAddOtherInvestment, onEditOtherInvestment, onDeleteOtherInvestment,
  kiteConnected, canLinkKite, kiteSyncBusy, onLinkKite, onUnlinkKite, onSyncKite,
  showMoney, onToggleMoney,
}) {
  const holdingsInvested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const holdingsCurrent = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  // Same formula as the top-level Investments dashboard (InvestmentsView.jsx) — this portfolio's
  // SIPs were already shown here in a "Mutual funds" section but weren't counted in these stat
  // cards, so this page's own numbers silently disagreed with the dashboard's.
  const mfInvested = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0)
  const mfCurrent = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
  const oiInvested = otherInvestments.reduce((s, o) => s + Number(o.purchase_value), 0)
  const oiCurrent = otherInvestments.reduce((s, o) => s + currentValueOf(o), 0)
  const invested = holdingsInvested + mfInvested + oiInvested
  const current = holdingsCurrent + mfCurrent + oiCurrent
  const pnl = current - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
  const cash = Number(portfolio.cash_balance || 0)
  const kiteLinked = !!portfolio.kite_linked

  // Cash activity — every real transaction created by add_funds/withdraw_funds for this
  // portfolio (linked_module === 'investment'), the same source both the chart and the table
  // below read from.
  const cashActivity = transactions
    .filter((t) => t.linked_module === 'investment' && t.linked_module_id === portfolio.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))

  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthActivity = showAllMonths ? cashActivity : cashActivity.filter((a) => {
    const d = new Date(a.date)
    return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month
  })

  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), net: 0 })
  }
  cashActivity.forEach((t) => {
    const d = new Date(t.date)
    const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (!bucket) return
    // Funding (expense, money leaving the bank into the portfolio) reads as "in" to the
    // portfolio — a positive bar, same convention AccountDetailView uses for its own inflow.
    bucket.net += t.type === 'expense' ? Number(t.amount || 0) : -Number(t.amount || 0)
  })

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to investments</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${portfolio.color || '#a78bfa'}22`, color: portfolio.color || '#a78bfa' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-white">{portfolio.name}</div>
              {kiteLinked && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">Kite</span>}
            </div>
            <div className="text-xs capitalize text-slate-500">{portfolio.broker.replace('_', ' ')} · {holdings.length} holding{holdings.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {kiteLinked ? (
            <>
              <button onClick={() => onSyncKite(portfolio)} disabled={kiteSyncBusy} className="flex items-center gap-2 rounded-xl bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/25 disabled:opacity-50"><RefreshCw size={14} className={kiteSyncBusy ? 'animate-spin' : ''} />{kiteSyncBusy ? 'Syncing…' : 'Sync now'}</button>
              <button onClick={() => onUnlinkKite(portfolio)} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"><Unlink size={14} />Unlink</button>
            </>
          ) : (
            <>
              <button onClick={() => onAddFunds(portfolio)} className="rounded-xl bg-emerald-400/15 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/25">+ Funds</button>
              <button onClick={() => onWithdrawFunds(portfolio)} disabled={cash <= 0} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50">− Withdraw</button>
              <button onClick={() => onAddHolding(portfolio.id)} className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]">+ Holding</button>
              <button onClick={() => onBulkImport(portfolio)} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"><Download size={14} />Bulk import</button>
              {kiteConnected && canLinkKite && holdings.length === 0 && (
                <button onClick={() => onLinkKite(portfolio)} className="flex items-center gap-2 rounded-xl border border-cyan-300/30 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10"><Link2 size={14} />Link to Kite</button>
              )}
            </>
          )}
          {/* Not exchange-traded, so unrelated to whether this portfolio is Kite-linked —
              always available regardless of which branch above is showing. */}
          <button onClick={() => onAddOtherInvestment(portfolio.id)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5">+ Other investment</button>
          <button onClick={() => onEdit(portfolio)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(portfolio)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {kiteLinked && (
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-xs text-cyan-200">
          Synced from Kite · {portfolio.last_kite_sync_at ? `last synced ${relativeTime(portfolio.last_kite_sync_at)}` : 'not synced yet'}. Holdings here mirror your real Zerodha account — add/edit them from Kite, not here.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Invested" value={showMoney ? money(invested) : '••••'} icon={Target} accent="bg-cyan-300/15 text-cyan-200" sub={<span>{holdings.length} holding{holdings.length === 1 ? '' : 's'}{sips.length > 0 ? ` · ${sips.length} SIP${sips.length === 1 ? '' : 's'}` : ''}{otherInvestments.length > 0 ? ` · ${otherInvestments.length} other` : ''}</span>} />
        <StatCard label="Current value" value={showMoney ? money(current) : '••••'} icon={TrendingUp} accent="bg-violet-400/15 text-violet-200" sub={<span>Everything except cash</span>} />
        <StatCard label="Cash available" value={showMoney ? money(cash) : '••••'} icon={PiggyBank} accent="bg-emerald-400/15 text-emerald-200" tone="text-emerald-300" sub={<span>Un-invested</span>} />
        <StatCard label="Unrealised P&L" value={showMoney ? (pnl >= 0 ? '+' : '−') + money(pnl).replace('-', '') : '••••'} icon={pnl >= 0 ? ArrowUpRight : ArrowDownRight} accent={pnl >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'} tone={pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'} sub={<span>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="text-sm font-semibold text-white">Cash in / out by month · last 6 months</div>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} formatter={(v) => money(v)} />
              <Bar dataKey="net" maxBarSize={28} shape={<NetBar />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Holdings · {holdings.length}</div>
        {holdings.length === 0 ? (
          <EmptyState compact icon={Wallet} title="No holdings yet" message="Buy your first holding in this portfolio." cta="Add holding" onCta={() => onAddHolding(portfolio.id)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Symbol</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Avg Buy</th>
                  <th className="px-3 py-3 text-right">LTP</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-3 py-3 text-right">P&L</th>
                  <th className="px-3 py-3 text-right">%</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const inv = Number(h.qty) * Number(h.avg_buy_price)
                  const cur = Number(h.qty) * Number(h.current_price || h.avg_buy_price)
                  const p = cur - inv
                  const pp = inv > 0 ? (p / inv) * 100 : 0
                  return (
                    <tr key={h.id} className="border-t border-white/5 text-slate-300">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-semibold text-white">{h.symbol}</div>
                          {h.asset_type === 'gold' && <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-200">Gold</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">{h.exchange}{h.company_name ? ` · ${h.company_name}` : ''}</div>
                      </td>
                      <td className="px-3 py-3 text-right">{Number(h.qty)}</td>
                      <td className="px-3 py-3 text-right">{money2(h.avg_buy_price)}</td>
                      <td className="px-3 py-3 text-right">
                        {h.source === 'kite' ? (
                          <span>{money2(h.current_price || h.avg_buy_price)}</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span>{money2(h.current_price || h.avg_buy_price)}</span>
                            <button onClick={() => onRefreshRowPrice(h)} title="Fetch live price" className="rounded-md p-1 text-cyan-300 hover:bg-white/5"><TrendingUp size={12} /></button>
                            <button onClick={() => onManualPriceEntry(h)} title="Enter price manually" className="rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"><Pencil size={11} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-white">{showMoney ? money(cur) : '••••'}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${p >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{showMoney ? (p >= 0 ? '+' : '−') + money(p).replace('-', '') : '••••'}</td>
                      <td className={`px-3 py-3 text-right ${p >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pp >= 0 ? '+' : ''}{pp.toFixed(2)}%</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {h.source !== 'kite' && (
                            <>
                              <button onClick={() => onEditHolding(h)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                              <button onClick={() => onDeleteHolding(h)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sips.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Mutual funds · {sips.length}</div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {sips.map((s) => {
              const currentValue = Number(s.units_held) * Number(s.nav)
              const sipPnl = s.average_price != null ? currentValue - Number(s.units_held) * Number(s.average_price) : null
              const isKite = s.source === 'kite'
              return (
                <div key={s.id} className="group rounded-2xl border border-white/10 bg-white/[.02] p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-sm font-semibold text-white">{s.fund_name}</div>
                        {isKite && <span className="shrink-0 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-200">Kite</span>}
                      </div>
                      <div className="text-xs text-slate-500">{s.folio_number ? `Folio ${s.folio_number}` : 'No folio number'}</div>
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
                      {sipPnl != null && <div className={`mt-0.5 text-[11px] ${sipPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{sipPnl >= 0 ? '+' : '−'}{showMoney ? money(sipPnl).replace('-', '') : '••••'}</div>}
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
        </div>
      )}

      {otherInvestments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Other investments · {otherInvestments.length}</div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {otherInvestments.map((o) => {
              const curVal = currentValueOf(o)
              const oPnl = curVal - Number(o.purchase_value)
              const oPnlPct = Number(o.purchase_value) > 0 ? (oPnl / Number(o.purchase_value)) * 100 : 0
              return (
                <div key={o.id} className="group rounded-2xl border border-white/10 bg-white/[.02] p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-sm font-semibold text-white">{o.name}</div>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${CATEGORY_BADGE_STYLE[o.category] || CATEGORY_BADGE_STYLE.other}`}>{o.category}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.category === 'bond'
                          ? <>Matures {formatDate(o.maturity_date)} · face {money2(o.face_value)}{o.coupon_rate_pct != null ? ` · ${o.coupon_rate_pct}% coupon` : ''}</>
                          : <>{o.expected_cagr_pct}% expected CAGR{o.last_known_value != null ? ` · revalued ${formatDate(o.last_known_value_date)}` : ''}</>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEditOtherInvestment(o)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDeleteOtherInvestment(o)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Projected value</div>
                      <div className="text-xl font-semibold text-white">{showMoney ? money(curVal) : '••••'}</div>
                      <div className={`mt-0.5 text-[11px] ${oPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{oPnl >= 0 ? '+' : '−'}{showMoney ? money(oPnl).replace('-', '') : '••••'} <span className="opacity-70">({oPnlPct >= 0 ? '+' : ''}{oPnlPct.toFixed(1)}%)</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Purchased</div>
                      <div className="text-sm text-slate-300">{money2(o.purchase_value)}</div>
                    </div>
                  </div>
                  {o.notes && <div className="mt-2 truncate text-[11px] text-slate-500">{o.notes}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Cash activity · {monthActivity.length}</div>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </div>
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={PiggyBank} title={showAllMonths ? 'No cash activity yet' : 'No cash activity this month'} message="Add or withdraw funds to see it here." />
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Description</span>
              <span>Type</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {monthActivity.map((t) => {
                const isIn = t.type === 'expense'
                return (
                  <div key={t.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] ${isIn ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{t.description}</div>
                        {t.notes && <div className="truncate text-[11px] text-slate-500">{t.notes}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5">{isIn ? 'Funded' : 'Withdrawn'}</span>
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                    <div className={`text-sm font-semibold sm:text-right ${isIn ? 'text-emerald-300' : 'text-rose-300'}`}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</div>
                    <div />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
