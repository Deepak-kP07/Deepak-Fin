import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import {
  ArrowDownRight, ArrowUpRight, Download, ExternalLink, Layers, Link2, Lock, Pencil, PiggyBank, Plus, RefreshCw, Sparkles,
  Target, Trash2, TrendingUp, Unlink, Upload, Wallet,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { StatCard } from '../ui/StatCard'
import { BarChart } from '../ui/BarChart'
import { MonthCursor } from '../ui/MonthCursor'
import { Select } from '../ui/Select'
import { DismissibleBanner } from '../ui/DismissibleBanner'
import { BackLink, CARD, EyeButton, HERO, MoreMenu, PageTitle, SectionHeader } from '../ui/DetailKit'
import { tw } from '../lib/tw'
import { MONTH_NAMES, capitalizeFirst, formatDate, formatDateTime, money, todayISO } from '../lib/format'
import { CATEGORY_BADGE_STYLE, buildInvestmentsExportCsv, currentValueOf, money2, relativeTime } from '../lib/shared'
import { hiddenTransferGroups, isHiddenTx, useHiddenTx } from '../state/HiddenTx'
import { dialog } from '../ui/Dialogs'

// Port of features/investments/InvestmentsView.jsx + PortfolioDetailView.jsx (mobile layout).
const ZERODHA_SIGNUP_URL = 'https://zerodha.com/open-account'
const pos = 'text-emerald-300 light:text-emerald-700'
const neg = 'text-rose-300 light:text-rose-700'
const signed = (v) => (v >= 0 ? '+' : '−') + money(v).replace('-', '')
const split = (cls) => { const p = (cls || '').split(' '); return [p.filter((c) => c.startsWith('bg-')).join(' '), p.filter((c) => !c.startsWith('bg-')).join(' ')] }

function Badge({ cls, children, size = 'text-[9px]' }) {
  const [bg, fg] = split(cls)
  return <View className={tw('rounded-full px-1.5 py-0.5', bg)}><Text className={tw(size, 'font-semibold uppercase tracking-widest', fg)}>{children}</Text></View>
}
const KITE = 'bg-accent-400/15 text-accent-200 light:text-accent-700'
const GOLD = 'bg-amber-400/15 text-amber-200 light:text-amber-700'

async function exportInvestments(payload) {
  try {
    const name = `investments-${todayISO()}.csv`
    const file = new File(Paths.cache, name)
    if (file.exists) file.delete()
    await file.write(buildInvestmentsExportCsv(payload))
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: name })
  } catch (e) { dialog.alert('Export failed', e.message) }
}

// A wide table (the web's combined holdings/SIPs/other tables) — scrolls sideways on a phone.
function WideTable({ title, columns, rows }) {
  return (
    <View className={tw(CARD)}>
      <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
        <Icon as={Layers} size={13} className="text-slate-500" />
        <Text className="flex-1 text-xs uppercase tracking-widest text-slate-500">{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className={tw('flex-row bg-white/[.02] light:bg-black/[.02] py-3')}>
            {columns.map((c, i) => <Text key={c.label} style={{ width: c.width }} className={tw('text-[10px] uppercase tracking-widest text-slate-500', i === 0 ? 'pl-5' : 'pr-3 text-right')}>{c.label}</Text>)}
          </View>
          {rows.map((r) => (
            <View key={r.key} className={tw('flex-row items-center border-t border-white/5 light:border-black/5 py-3')}>
              {columns.map((c, i) => <View key={c.label} style={{ width: c.width }} className={i === 0 ? 'pl-5' : 'items-end pr-3'}>{c.render(r)}</View>)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
const cellText = (text, cls = 'text-slate-300 light:text-slate-700') => <Text className={tw('text-sm', cls)}>{text}</Text>
const pnlCell = (g, showMoney) => (
  <Text className={tw('text-sm font-semibold', g.pnl >= 0 ? pos : neg)}>{showMoney ? signed(g.pnl) : '••••'}{showMoney ? <Text className="font-normal opacity-70"> ({g.pnlPct >= 0 ? '+' : ''}{g.pnlPct.toFixed(2)}%)</Text> : null}</Text>
)

function SipCard({ s, showMoney, subtitle, onEdit, onDelete, inner }) {
  const currentValue = Number(s.units_held) * Number(s.nav)
  const pnl = s.average_price != null ? currentValue - Number(s.units_held) * Number(s.average_price) : null
  const isKite = s.source === 'kite'
  return (
    <View className={tw(inner ? 'rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-5' : `${CARD} p-5`)}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text numberOfLines={1} className={tw('flex-shrink text-sm font-semibold text-white light:text-slate-900')}>{s.fund_name}</Text>
            {isKite ? <Badge cls={KITE}>Kite</Badge> : null}
          </View>
          <Text className="text-xs text-slate-500">{subtitle}</Text>
        </View>
        {!isKite && (
          <View className="flex-row gap-1">
            <Pressable onPress={() => onEdit(s)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
            <Pressable onPress={() => onDelete(s)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
          </View>
        )}
      </View>
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-slate-500">Current value</Text>
          <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(currentValue) : '••••'}</Text>
          {pnl != null ? <Text className={tw('mt-0.5 text-[11px]', pnl >= 0 ? pos : neg)}>{pnl >= 0 ? '+' : '−'}{showMoney ? money(pnl).replace('-', '') : '••••'}</Text> : null}
        </View>
        <View className="items-end">
          <Text className="text-xs text-slate-500">Monthly</Text>
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{s.monthly_amount > 0 ? money(s.monthly_amount) : '—'}</Text>
        </View>
      </View>
      <Text className="mt-2 text-[11px] text-slate-500">{money2(s.units_held)} units · NAV {money2(s.nav)}</Text>
    </View>
  )
}

export function InvestmentsView(props) {
  const {
    data, onAddPortfolio, onAddHolding, onBulkImport, onEditPortfolio, onEditHolding, onDeletePortfolio, onDeleteHolding,
    onRefreshRowPrice, onManualPriceEntry, onRefreshAll, pricesLoading, onAddFunds, onWithdrawFunds, onConnectKite,
    onLinkKite, onUnlinkKite, onSyncKite, kiteSyncBusy, onAddSip, onEditSip, onDeleteSip, onSyncSipsKite,
    onAddOtherInvestment, onEditOtherInvestment, onDeleteOtherInvestment, showMoney, onToggleMoney, onDetailChange,
  } = props
  const { portfolios = [], holdings = [], sips = [], other_investments: otherInvestments = [], transactions = [], kite_orders = [], profile } = data
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(props.initialSelectedId ?? null)
  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId)
  useEffect(() => { onDetailChange?.(selectedPortfolio ? selectedPortfolioId : null) }, [selectedPortfolioId, !!selectedPortfolio])
  const [linkChoice, setLinkChoice] = useState('')
  const kiteConnected = !!profile?.kite_connected
  const kiteBroken = !!profile?.kite_broken
  const anyPortfolioLinked = portfolios.some((p) => p.kite_linked)
  const emptyPortfolios = portfolios.filter((p) => !holdings.some((h) => h.portfolio_id === p.id))
  const hasOwnKiteKey = !!profile?.kite_api_key
  // Same as the PWA: the "add your own Kite API key" tip shows the first time this screen is seen
  // without Kite, then is marked seen right away so it never comes back.
  const [showOwnKeyTip, setShowOwnKeyTip] = useState(false)
  useEffect(() => {
    SecureStore.getItemAsync('seen_kite_own_key_tip').then((v) => {
      if (v) return
      setShowOwnKeyTip(true)
      SecureStore.setItemAsync('seen_kite_own_key_tip', '1').catch(() => {})
    }).catch(() => {})
  }, [])

  if (selectedPortfolio) {
    return (
      <PortfolioDetailView portfolio={selectedPortfolio} holdings={holdings.filter((h) => h.portfolio_id === selectedPortfolio.id)}
        sips={sips.filter((s) => s.portfolio_id === selectedPortfolio.id)} otherInvestments={otherInvestments.filter((o) => o.portfolio_id === selectedPortfolio.id)}
        transactions={transactions} onBack={() => setSelectedPortfolioId(null)} onEdit={onEditPortfolio} onDelete={(p) => onDeletePortfolio(p, () => setSelectedPortfolioId(null))}
        onAddFunds={onAddFunds} onWithdrawFunds={onWithdrawFunds} onAddHolding={onAddHolding} onBulkImport={onBulkImport} onEditHolding={onEditHolding} onDeleteHolding={onDeleteHolding}
        onRefreshRowPrice={onRefreshRowPrice} onManualPriceEntry={onManualPriceEntry} onEditSip={onEditSip} onDeleteSip={onDeleteSip}
        onAddOtherInvestment={onAddOtherInvestment} onEditOtherInvestment={onEditOtherInvestment} onDeleteOtherInvestment={onDeleteOtherInvestment}
        kiteConnected={kiteConnected} canLinkKite={!anyPortfolioLinked || selectedPortfolio.kite_linked} kiteSyncBusy={kiteSyncBusy}
        onLinkKite={onLinkKite} onUnlinkKite={onUnlinkKite} onSyncKite={onSyncKite} showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const hValue = (h) => Number(h.qty) * Number(h.current_price || h.avg_buy_price)
  const holdingsInvested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const holdingsCurrent = holdings.reduce((s, h) => s + hValue(h), 0)
  const mfInvested = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0)
  const mfCurrent = sips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
  const oiInvested = otherInvestments.reduce((s, o) => s + Number(o.purchase_value), 0)
  const oiCurrent = otherInvestments.reduce((s, o) => s + currentValueOf(o), 0)
  const totalInvested = holdingsInvested + mfInvested + oiInvested
  const totalCurrent = holdingsCurrent + mfCurrent + oiCurrent
  const totalCash = portfolios.reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  const totalPnl = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const pnlOf = (g) => ({ ...g, pnl: g.current - g.invested, pnlPct: g.invested > 0 ? ((g.current - g.invested) / g.invested) * 100 : 0 })
  const namesOf = (ids) => [...ids].map((id) => portfolios.find((p) => p.id === id)?.name).filter(Boolean)

  const combinedHoldings = Object.values(holdings.reduce((acc, h) => {
    const g = acc[h.symbol] || (acc[h.symbol] = { symbol: h.symbol, assetType: h.asset_type, qty: 0, invested: 0, current: 0, portfolioIds: new Set() })
    g.qty += Number(h.qty); g.invested += Number(h.qty) * Number(h.avg_buy_price); g.current += hValue(h); g.portfolioIds.add(h.portfolio_id)
    return acc
  }, {})).map((g) => ({ ...pnlOf(g), portfolioNames: namesOf(g.portfolioIds), allocationPct: holdingsCurrent > 0 ? (g.current / holdingsCurrent) * 100 : 0 })).sort((a, b) => b.current - a.current)
  const combinedSips = Object.values(sips.reduce((acc, s) => {
    const g = acc[s.fund_name] || (acc[s.fund_name] = { fundName: s.fund_name, units: 0, invested: 0, current: 0, portfolioIds: new Set() })
    g.units += Number(s.units_held); g.invested += Number(s.units_held) * Number(s.average_price ?? s.nav); g.current += Number(s.units_held) * Number(s.nav)
    if (s.portfolio_id) g.portfolioIds.add(s.portfolio_id)
    return acc
  }, {})).map((g) => ({ ...pnlOf(g), portfolioNames: namesOf(g.portfolioIds), allocationPct: mfCurrent > 0 ? (g.current / mfCurrent) * 100 : 0 })).sort((a, b) => b.current - a.current)
  const combinedOther = Object.values(otherInvestments.reduce((acc, o) => {
    const g = acc[o.category] || (acc[o.category] = { category: o.category, count: 0, invested: 0, current: 0, names: [] })
    g.count += 1; g.invested += Number(o.purchase_value); g.current += currentValueOf(o); g.names.push(o.name)
    return acc
  }, {})).map((g) => ({ ...pnlOf(g), allocationPct: oiCurrent > 0 ? (g.current / oiCurrent) * 100 : 0 })).sort((a, b) => b.current - a.current)

  const portfolioValue = (p) => holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + hValue(h), 0)
    + sips.filter((s) => s.portfolio_id === p.id).reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
    + otherInvestments.filter((o) => o.portfolio_id === p.id).reduce((s, o) => s + currentValueOf(o), 0)
  const portfolioMix = portfolios.map((p) => ({ id: p.id, name: p.name, color: p.color || '#a78bfa', value: portfolioValue(p) + Number(p.cash_balance || 0) })).filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  const portfolioMixTotal = portfolioMix.reduce((s, p) => s + p.value, 0)

  const oiByCategory = (cat) => otherInvestments.filter((o) => o.category === cat).reduce((s, o) => s + currentValueOf(o), 0)
  const holdingsGold = holdings.filter((h) => h.asset_type === 'gold').reduce((s, h) => s + hValue(h), 0)
  const buckets = [
    { label: 'Equity', value: holdingsCurrent - holdingsGold, color: '#22d3ee' },
    { label: 'Gold', value: holdingsGold + oiByCategory('gold'), color: '#facc15' },
    { label: 'Silver', value: oiByCategory('silver'), color: '#a3a3a3' },
    { label: 'Land', value: oiByCategory('land'), color: '#84cc16' },
    { label: 'Bonds', value: oiByCategory('bond'), color: '#818cf8' },
    { label: 'Mutual funds', value: mfCurrent, color: '#a78bfa' },
    { label: 'Other', value: oiByCategory('other'), color: '#fb7185' },
    { label: 'Cash', value: totalCash, color: '#34d399' },
  ].filter((b) => b.value > 0)
  const grandTotal = buckets.reduce((s, b) => s + b.value, 0)

  return (
    <View className="gap-5 pb-8">
      <View className="z-20 flex-row items-end justify-between gap-3">
        <PageTitle title="Investments" />
        <View className="flex-row items-center gap-2">
          <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
          <MoreMenu width={224} items={[
            { icon: Plus, label: 'New portfolio', onPress: onAddPortfolio },
            { icon: RefreshCw, label: pricesLoading ? 'Fetching…' : 'Refresh prices', onPress: onRefreshAll, hidden: holdings.length === 0 },
            { icon: Upload, label: 'Export', onPress: () => exportInvestments({ portfolios, holdings, sips, otherInvestments }), hidden: portfolios.length === 0 },
          ]} />
        </View>
      </View>

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Current value</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(totalCurrent + totalCash) : '••••••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">Everything + cash · {portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}</Text>
        <View className="mt-5 flex-row gap-3">
          <HeroStatTile icon={Target} label="Invested" value={showMoney ? money(totalInvested) : '••••'} />
          <HeroStatTile icon={TrendingUp} label="Overall P&L" value={showMoney ? signed(totalPnl) : '••••'} valueTone={totalPnl >= 0 ? pos : neg} sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`} />
        </View>
        {portfolioMix.length > 0 && (
          <View className={tw('mt-5 border-t border-white/[.07] light:border-black/[.07] pt-4')}>
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Portfolio mix</Text>
            <View className={tw('mt-2 h-2 flex-row gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]')}>
              {portfolioMix.map((p) => <View key={p.id} style={{ width: `${(p.value / portfolioMixTotal) * 100}%`, backgroundColor: p.color }} />)}
            </View>
            <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
              {portfolioMix.map((p) => (
                <View key={p.id} className="flex-row items-center gap-1.5">
                  <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <Text className={tw('text-[11px] text-slate-400 light:text-slate-500')}>{p.name} · {((p.value / portfolioMixTotal) * 100).toFixed(0)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <DismissibleBanner id={`investments-kite-status-${kiteConnected ? (kiteBroken ? 'broken' : 'live') : 'yahoo'}`} tone="cyan">
        <View className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Icon as={Sparkles} size={13} className={tw('text-accent-200 light:text-accent-700')} />
            <Text className={tw('flex-1 text-xs text-accent-200 light:text-accent-700')}>
              {kiteConnected && kiteBroken ? 'Kite connection needs attention — the last sync failed.' : kiteConnected ? 'Live prices via Kite. Token refreshes tomorrow after 6 AM IST.' : 'Currently using Yahoo Finance. Connect your Zerodha Kite for real-time NSE quotes and real holdings sync.'}
            </Text>
          </View>
          {(!kiteConnected || kiteBroken) && (
            <Pressable onPress={onConnectKite} className={tw('self-start rounded-lg px-3 py-1', kiteBroken ? 'bg-amber-400/20' : 'bg-accent-300/20')}>
              <Text className={tw('text-[11px] font-semibold', kiteBroken ? 'text-amber-100 light:text-amber-800' : 'text-accent-100 light:text-accent-700')}>{kiteBroken ? 'Reconnect Kite' : 'Connect Kite'}</Text>
            </Pressable>
          )}
          {!kiteConnected && !hasOwnKiteKey && showOwnKeyTip && (
            <Text className={tw('border-t border-accent-300/10 pt-2 text-xs text-accent-200/70 light:text-accent-700')}>For your own Zerodha account, add your Kite API key first in <Text className="font-bold">Settings → Kite Connect</Text>.</Text>
          )}
          {!kiteConnected && (
            <Pressable onPress={() => Linking.openURL(ZERODHA_SIGNUP_URL)} className="flex-row items-center gap-1.5 border-t border-accent-300/10 pt-2">
              <Text className={tw('text-xs text-accent-200/70 light:text-accent-700')}>Don't have a Zerodha account? Create one</Text>
              <Icon as={ExternalLink} size={11} className={tw('text-accent-200/70 light:text-accent-700')} />
            </Pressable>
          )}
          {kiteConnected && !anyPortfolioLinked && (
            <View className="gap-2 border-t border-accent-300/10 pt-2">
              {emptyPortfolios.length === 0 ? (
                <Text className={tw('text-xs text-accent-200/70 light:text-accent-700')}>Create an empty portfolio first, then link it to Kite to sync your real holdings.</Text>
              ) : (
                <>
                  <Text className={tw('text-xs text-accent-200/70 light:text-accent-700')}>Sync your real Zerodha holdings into:</Text>
                  <Select value={linkChoice} onChange={setLinkChoice} title="Portfolio" options={[{ value: '', label: 'Choose a portfolio…' }, ...emptyPortfolios.map((p) => ({ value: p.id, label: p.name }))]}
                    className="rounded-lg border border-accent-300/20 bg-[#0b1420] light:bg-white px-2.5 py-1.5" textClassName="text-[11px] text-accent-100 light:text-accent-700" />
                  <Pressable disabled={!linkChoice || kiteSyncBusy} onPress={() => { const p = portfolios.find((x) => x.id === linkChoice); if (p) onLinkKite(p) }} className={tw('flex-row items-center gap-1.5 self-start rounded-lg bg-accent-300/20 px-3 py-1.5', (!linkChoice || kiteSyncBusy) && 'opacity-50')}>
                    <Icon as={Link2} size={12} className={tw('text-accent-100 light:text-accent-700')} />
                    <Text className={tw('text-[11px] font-semibold text-accent-100 light:text-accent-700')}>{kiteSyncBusy ? 'Linking…' : 'Link'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </DismissibleBanner>

      {portfolios.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={TrendingUp} title="No portfolios yet" message="Create a portfolio like ‘Zerodha Demat A’ to group your holdings." cta="Create portfolio" onCta={onAddPortfolio} /></View>
      ) : (
        <View className="gap-4">
          {portfolios.map((p) => {
            const items = holdings.filter((h) => h.portfolio_id === p.id)
            const pSips = sips.filter((s) => s.portfolio_id === p.id)
            const pOther = otherInvestments.filter((o) => o.portfolio_id === p.id)
            const invested = items.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0) + pSips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0) + pOther.reduce((s, o) => s + Number(o.purchase_value), 0)
            const current = portfolioValue(p)
            const cash = Number(p.cash_balance || 0)
            const pnl = current - invested
            const pct = invested > 0 ? (pnl / invested) * 100 : 0
            const counts = [items.length ? `${items.length} holding${items.length === 1 ? '' : 's'}` : null, pSips.length ? `${pSips.length} SIP${pSips.length === 1 ? '' : 's'}` : null, pOther.length ? `${pOther.length} other` : null].filter(Boolean)
            const color = p.color || '#a78bfa'
            return (
              <Pressable key={p.id} onPress={() => setSelectedPortfolioId(p.id)} className={tw(CARD, 'p-5 active:opacity-80')}>
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}22` }}><TrendingUp size={18} color={color} /></View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text numberOfLines={1} className={tw('flex-shrink text-sm font-semibold text-white light:text-slate-900')}>{p.name}</Text>
                      {p.kite_linked ? <Badge cls={KITE}>Kite</Badge> : null}
                    </View>
                    <Text className="text-xs capitalize text-slate-500">{String(p.broker || '').replace('_', ' ')}{counts.length ? ` · ${counts.join(' · ')}` : ' · empty'}</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xs text-slate-500">Value</Text>
                    <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(current + cash) : '••••'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={tw('text-xs opacity-70', pnl >= 0 ? pos : neg)}>P&L</Text>
                    <Text className={tw('text-sm font-semibold', pnl >= 0 ? pos : neg)}>{showMoney ? signed(pnl) : '••••'} <Text className="text-[10px]">({pct.toFixed(1)}%)</Text></Text>
                  </View>
                </View>
                <Text className="mt-2 text-[11px] text-slate-500">Cash {money(cash)}</Text>
              </Pressable>
            )
          })}
        </View>
      )}

      {(holdings.length > 0 || sips.length > 0 || otherInvestments.length > 0 || totalCash > 0) && (
        <View className={tw(CARD, 'p-5')}>
          <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Allocation</Text>
          {grandTotal <= 0 ? <Text className="mt-3 text-xs text-slate-500">Nothing to show an allocation for yet.</Text> : (
            <>
              <View className={tw('mt-3 h-2.5 flex-row overflow-hidden rounded-full bg-white/5 light:bg-black/5')}>
                {buckets.map((b) => <View key={b.label} style={{ width: `${(b.value / grandTotal) * 100}%`, backgroundColor: b.color }} />)}
              </View>
              <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-1.5">
                {buckets.map((b) => (
                  <View key={b.label} className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>{b.label} · {((b.value / grandTotal) * 100).toFixed(1)}%{showMoney ? <Text className="text-slate-600"> ({money(b.value)})</Text> : null}</Text>
                  </View>
                ))}
              </View>
              {combinedHoldings.length > 0 && (
                <View className={tw('mt-4 border-t border-white/5 light:border-black/5 pt-3')}>
                  <Text className="text-[10px] uppercase tracking-widest text-slate-500">Largest holdings</Text>
                  <View className="mt-2 gap-1.5">
                    {combinedHoldings.slice(0, 5).map((h) => (
                      <View key={h.symbol} className="flex-row items-center justify-between">
                        <Text className={tw('text-xs text-slate-300 light:text-slate-700')}>{h.symbol}</Text>
                        <Text className="text-xs text-slate-500">{((h.current / grandTotal) * 100).toFixed(1)}%{showMoney ? <Text className={tw('text-white light:text-slate-900')}>  {money(h.current)}</Text> : null}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {portfolios.length > 1 && combinedHoldings.length > 0 && (
        <WideTable title={`Combined holdings · ${combinedHoldings.length} stock${combinedHoldings.length === 1 ? '' : 's'} across portfolios`} rows={combinedHoldings.map((g) => ({ ...g, key: g.symbol }))} columns={[
          { label: 'Symbol', width: 170, render: (g) => (<View><View className="flex-row items-center gap-1.5"><Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{g.symbol}</Text>{g.assetType === 'gold' ? <Badge cls={GOLD}>Gold</Badge> : null}</View><Text numberOfLines={1} className="text-[11px] text-slate-500">{g.portfolioNames.join(', ')}</Text></View>) },
          { label: 'Qty', width: 70, render: (g) => cellText(String(g.qty)) },
          { label: 'Avg buy', width: 100, render: (g) => cellText(money2(g.qty > 0 ? g.invested / g.qty : 0)) },
          { label: 'Invested', width: 100, render: (g) => cellText(showMoney ? money(g.invested) : '••••') },
          { label: 'Value', width: 100, render: (g) => cellText(showMoney ? money(g.current) : '••••', 'text-white light:text-slate-900') },
          { label: 'P&L', width: 160, render: (g) => pnlCell(g, showMoney) },
          { label: 'Alloc.', width: 70, render: (g) => cellText(`${g.allocationPct.toFixed(1)}%`, 'text-slate-400 light:text-slate-500') },
        ]} />
      )}
      {portfolios.length > 1 && combinedSips.length > 0 && (
        <WideTable title={`Combined SIPs · ${combinedSips.length} fund${combinedSips.length === 1 ? '' : 's'} across portfolios`} rows={combinedSips.map((g) => ({ ...g, key: g.fundName }))} columns={[
          { label: 'Fund', width: 220, render: (g) => (<View><Text numberOfLines={1} className={tw('text-sm font-semibold text-white light:text-slate-900')}>{g.fundName}</Text><Text numberOfLines={1} className="text-[11px] text-slate-500">{g.portfolioNames.length ? g.portfolioNames.join(', ') : 'Unassigned'}</Text></View>) },
          { label: 'Units', width: 90, render: (g) => cellText(money2(g.units)) },
          { label: 'Avg cost', width: 100, render: (g) => cellText(money2(g.units > 0 ? g.invested / g.units : 0)) },
          { label: 'Invested', width: 100, render: (g) => cellText(showMoney ? money(g.invested) : '••••') },
          { label: 'Value', width: 100, render: (g) => cellText(showMoney ? money(g.current) : '••••', 'text-white light:text-slate-900') },
          { label: 'P&L', width: 160, render: (g) => pnlCell(g, showMoney) },
          { label: 'Alloc.', width: 70, render: (g) => cellText(`${g.allocationPct.toFixed(1)}%`, 'text-slate-400 light:text-slate-500') },
        ]} />
      )}
      {portfolios.length > 1 && combinedOther.length > 0 && (
        <WideTable title={`Combined other investments · ${combinedOther.length} categor${combinedOther.length === 1 ? 'y' : 'ies'} across portfolios`} rows={combinedOther.map((g) => ({ ...g, key: g.category }))} columns={[
          { label: 'Category', width: 200, render: (g) => (<View className="items-start"><Badge cls={CATEGORY_BADGE_STYLE[g.category] || CATEGORY_BADGE_STYLE.other}>{g.category}</Badge><Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">{g.names.join(', ')}</Text></View>) },
          { label: 'Items', width: 60, render: (g) => cellText(String(g.count)) },
          { label: 'Invested', width: 100, render: (g) => cellText(showMoney ? money(g.invested) : '••••') },
          { label: 'Value', width: 100, render: (g) => cellText(showMoney ? money(g.current) : '••••', 'text-white light:text-slate-900') },
          { label: 'P&L', width: 160, render: (g) => pnlCell(g, showMoney) },
          { label: 'Alloc.', width: 70, render: (g) => cellText(`${g.allocationPct.toFixed(1)}%`, 'text-slate-400 light:text-slate-500') },
        ]} />
      )}

      <View className="flex-row items-center justify-between gap-2">
        <Text className={tw('text-lg font-semibold text-white light:text-slate-900')}>SIPs</Text>
        <View className="flex-row gap-2">
          {kiteConnected && (
            <Pressable disabled={kiteSyncBusy} onPress={onSyncSipsKite} className={tw('flex-row items-center gap-2 rounded-xl border border-accent-300/25 bg-accent-400/10 px-3 py-2', kiteSyncBusy && 'opacity-50')}>
              <Icon as={RefreshCw} size={13} className={tw('text-accent-200 light:text-accent-700')} /><Text className={tw('text-xs font-medium text-accent-200 light:text-accent-700')}>{kiteSyncBusy ? 'Syncing…' : 'Sync from Kite'}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onAddSip()} className={tw('flex-row items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-3 py-2')}>
            <Icon as={Plus} size={14} className={tw('text-slate-300 light:text-slate-700')} /><Text className={tw('text-xs font-semibold text-slate-300 light:text-slate-700')}>Add SIP</Text>
          </Pressable>
        </View>
      </View>
      {kiteConnected && <Text className={tw('-mt-3 text-xs text-accent-200/70 light:text-accent-700')}>Synced from Kite · {profile?.kite_mf_synced_at ? `last synced ${relativeTime(profile.kite_mf_synced_at)}` : 'not synced yet'}</Text>}
      {sips.length === 0 ? (
        <View className={tw(CARD)}><EmptyState compact icon={PiggyBank} title="No SIPs yet" message="Track your mutual fund SIPs here, or sync them from Kite." cta="Add SIP" onCta={() => onAddSip()} /></View>
      ) : (
        <View className="gap-4">
          {sips.map((s) => {
            const sp = portfolios.find((p) => p.id === s.portfolio_id)
            return <SipCard key={s.id} s={s} showMoney={showMoney} onEdit={onEditSip} onDelete={onDeleteSip} subtitle={`${s.folio_number ? `Folio ${s.folio_number}` : 'No folio number'}${sp ? ` · ${sp.name}` : ''}`} />
          })}
        </View>
      )}

      <Text className={tw('text-lg font-semibold text-white light:text-slate-900')}>Order history</Text>
      {kite_orders.length === 0 ? (
        <View className={tw(CARD)}><EmptyState compact icon={Wallet} title="No orders tracked yet" message="Starts tracking from when you connect Kite — it doesn't expose your past orders, only what happens from here on." /></View>
      ) : (
        <View className={tw(CARD)}>
          {kite_orders.map((o, i) => {
            const isBuy = o.transaction_type === 'BUY'
            const unitPrice = Number(o.average_price || o.price)
            const qty = Number(o.quantity)
            return (
              <View key={o.id} className={tw('flex-row items-center justify-between gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  <View className={tw('h-8 w-8 items-center justify-center rounded-lg bg-white/[.05] light:bg-black/[.035]')}><Icon as={isBuy ? ArrowDownRight : ArrowUpRight} size={14} className={isBuy ? pos : neg} /></View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className={tw('text-sm text-white light:text-slate-900')}>{o.tradingsymbol}{o.segment === 'mf' && o.fund ? ` · ${o.fund}` : ''}</Text>
                    <Text className="text-[11px] text-slate-500">{o.status}{o.order_timestamp ? ` · ${formatDateTime(o.order_timestamp.slice(0, 10), o.order_timestamp.slice(11, 16))}` : ''}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={tw('text-sm font-medium', isBuy ? pos : neg)}>{isBuy ? '+' : '-'}{qty} unit{qty === 1 ? '' : 's'}</Text>
                  <Text className="text-[11px] text-slate-500">{unitPrice > 0 && qty > 0 ? `${money(qty * unitPrice)} ${isBuy ? 'invested' : 'received'} · ${money2(unitPrice)}/unit` : 'Not filled yet'}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function PortfolioDetailView({ portfolio, holdings, sips, otherInvestments, transactions, onBack, onEdit, onDelete, onAddFunds, onWithdrawFunds, onAddHolding, onBulkImport, onEditHolding, onDeleteHolding, onRefreshRowPrice, onManualPriceEntry, onEditSip, onDeleteSip, onAddOtherInvestment, onEditOtherInvestment, onDeleteOtherInvestment, kiteConnected, canLinkKite, kiteSyncBusy, onLinkKite, onUnlinkKite, onSyncKite, showMoney, onToggleMoney }) {
  const holdingsInvested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const holdingsCurrent = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  const invested = holdingsInvested + sips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0) + otherInvestments.reduce((s, o) => s + Number(o.purchase_value), 0)
  const current = holdingsCurrent + sips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0) + otherInvestments.reduce((s, o) => s + currentValueOf(o), 0)
  const pnl = current - invested
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
  const cash = Number(portfolio.cash_balance || 0)
  const kiteLinked = !!portfolio.kite_linked
  const color = portfolio.color || '#a78bfa'
  const cashActivity = transactions.filter((t) => t.linked_module === 'investment' && t.linked_module_id === portfolio.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
  const now = new Date()
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const { revealed: hiddenRevealed } = useHiddenTx()
  const hiddenGroups = hiddenTransferGroups(transactions)
  const monthActivity = (showAllMonths ? cashActivity : cashActivity.filter((a) => { const d = new Date(a.date); return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month }))
    .filter((t) => hiddenRevealed || !isHiddenTx(t, hiddenGroups))
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()].slice(0, 3), net: 0 }) }
  cashActivity.forEach((t) => { const d = new Date(t.date); const b = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`); if (b) b.net += t.type === 'expense' ? Number(t.amount || 0) : -Number(t.amount || 0) })

  return (
    <View className="gap-5 pb-8">
      <BackLink label="Back to investments" onPress={onBack} />
      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}22` }}><TrendingUp size={22} color={color} /></View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text numberOfLines={1} className={tw('flex-shrink text-lg font-semibold text-white light:text-slate-900')}>{portfolio.name}</Text>
              {kiteLinked ? <Badge cls={KITE} size="text-[10px]">Kite</Badge> : null}
            </View>
            <Text className="text-xs capitalize text-slate-500">{String(portfolio.broker || '').replace('_', ' ')} · {holdings.length} holding{holdings.length === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
          <MoreMenu width={224} items={[
            { icon: Unlink, label: 'Unlink', onPress: () => onUnlinkKite(portfolio), hidden: !kiteLinked },
            { label: '− Withdraw', onPress: () => onWithdrawFunds(portfolio), hidden: kiteLinked || cash <= 0 },
            { icon: Download, label: 'Bulk import', onPress: () => onBulkImport(portfolio), hidden: kiteLinked },
            { icon: Link2, label: 'Link to Kite', onPress: () => onLinkKite(portfolio), hidden: kiteLinked || !(kiteConnected && canLinkKite && holdings.length === 0) },
            { label: '+ Other investment', onPress: () => onAddOtherInvestment(portfolio.id) },
            { icon: Pencil, label: 'Edit portfolio', onPress: () => onEdit(portfolio) },
            { icon: Trash2, label: 'Delete portfolio', onPress: () => onDelete(portfolio), danger: true },
          ]} />
        </View>
      </View>

      <View className="flex-row gap-2">
        {kiteLinked ? (
          <Pressable disabled={kiteSyncBusy} onPress={() => onSyncKite(portfolio)} className={tw('flex-row items-center gap-2 rounded-xl bg-accent-400/15 px-4 py-2.5', kiteSyncBusy && 'opacity-50')}>
            <Icon as={RefreshCw} size={14} className={tw('text-accent-200 light:text-accent-700')} /><Text className={tw('text-sm font-semibold text-accent-200 light:text-accent-700')}>{kiteSyncBusy ? 'Syncing…' : 'Sync now'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => onAddFunds(portfolio)} className="rounded-xl bg-emerald-400/15 px-4 py-2.5"><Text className={tw('text-sm font-semibold text-emerald-200 light:text-emerald-700')}>+ Funds</Text></Pressable>
        )}
      </View>

      {kiteLinked && (
        <DismissibleBanner id={`portfolio-kite-linked-${portfolio.id}`} tone="cyan">
          {`Synced from Kite · ${portfolio.last_kite_sync_at ? `last synced ${relativeTime(portfolio.last_kite_sync_at)}` : 'not synced yet'}. Holdings here mirror your real Zerodha account — add/edit them from Kite, not here.`}
        </DismissibleBanner>
      )}

      <View className="flex-row flex-wrap gap-3">
        {[
          <StatCard key="i" label="Invested" value={showMoney ? money(invested) : '••••'} icon={Target} accent="bg-accent-300/15 text-accent-200 light:text-accent-700" tone="text-slate-500" sub={`${holdings.length} holding${holdings.length === 1 ? '' : 's'}${sips.length ? ` · ${sips.length} SIP${sips.length === 1 ? '' : 's'}` : ''}${otherInvestments.length ? ` · ${otherInvestments.length} other` : ''}`} />,
          <StatCard key="c" label="Current value" value={showMoney ? money(current) : '••••'} icon={TrendingUp} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone="text-slate-500" sub="Everything except cash" />,
          <StatCard key="k" label="Cash available" value={showMoney ? money(cash) : '••••'} icon={PiggyBank} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" sub="Un-invested" />,
          <StatCard key="p" label="Unrealised P&L" value={showMoney ? signed(pnl) : '••••'} icon={pnl >= 0 ? ArrowUpRight : ArrowDownRight} accent={pnl >= 0 ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : 'bg-rose-400/15 text-rose-200 light:text-rose-700'} tone={pnl >= 0 ? pos : neg} sub={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`} />,
        ].map((n) => <View key={n.key} style={{ width: '48%', flexGrow: 1 }}>{n}</View>)}
      </View>

      <View className={tw(CARD, 'p-5')}>
        <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Cash in / out by month · last 6 months</Text>
        <View className="mt-4"><BarChart rows={months} valueKey="net" colorFor={(m) => (m.net < 0 ? '#fb7185' : '#34d399')} showMoney={showMoney} /></View>
      </View>

      <View className={tw(CARD)}>
        <SectionHeader>Holdings · {holdings.length}</SectionHeader>
        {holdings.length === 0 ? (
          <EmptyState compact icon={Wallet} title="No holdings yet" message="Buy your first holding in this portfolio." cta={kiteLinked ? undefined : 'Add holding'} onCta={kiteLinked ? undefined : () => onAddHolding(portfolio.id)} />
        ) : holdings.map((h, i) => {
          const inv = Number(h.qty) * Number(h.avg_buy_price)
          const cur = Number(h.qty) * Number(h.current_price || h.avg_buy_price)
          const p = cur - inv
          const pp = inv > 0 ? (p / inv) * 100 : 0
          const manual = h.source !== 'kite'
          return (
            <View key={h.id} className={tw('px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{h.symbol}</Text>
                    {h.asset_type === 'gold' ? <Badge cls={GOLD}>Gold</Badge> : null}
                  </View>
                  <Text numberOfLines={1} className="text-[11px] text-slate-500">{h.exchange}{h.company_name ? ` · ${h.company_name}` : ''} · {Number(h.qty)} @ {money2(h.avg_buy_price)}</Text>
                </View>
                <View className="items-end">
                  <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(cur) : '••••'}</Text>
                  <Text className={tw('text-[11px] font-semibold', p >= 0 ? pos : neg)}>{showMoney ? signed(p) : '••••'} ({pp >= 0 ? '+' : ''}{pp.toFixed(2)}%)</Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>LTP {money2(h.current_price || h.avg_buy_price)}</Text>
                  {manual && (
                    <>
                      <Pressable onPress={() => onRefreshRowPrice(h)} hitSlop={6} className="rounded-md p-1"><Icon as={TrendingUp} size={12} className={tw('text-accent-300 light:text-accent-700')} /></Pressable>
                      <Pressable onPress={() => onManualPriceEntry(h)} hitSlop={6} className="rounded-md p-1"><Icon as={Pencil} size={11} className="text-slate-500" /></Pressable>
                    </>
                  )}
                </View>
                {manual && (
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => onEditHolding(h)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                    <Pressable onPress={() => onDeleteHolding(h)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                  </View>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {sips.length > 0 && (
        <View className={tw(CARD)}>
          <SectionHeader>Mutual funds · {sips.length}</SectionHeader>
          <View className="gap-4 p-5">{sips.map((s) => <SipCard key={s.id} s={s} inner showMoney={showMoney} onEdit={onEditSip} onDelete={onDeleteSip} subtitle={s.folio_number ? `Folio ${s.folio_number}` : 'No folio number'} />)}</View>
        </View>
      )}

      {otherInvestments.length > 0 && (
        <View className={tw(CARD)}>
          <SectionHeader>Other investments · {otherInvestments.length}</SectionHeader>
          <View className="gap-4 p-5">
            {otherInvestments.map((o) => {
              const curVal = currentValueOf(o)
              const oPnl = curVal - Number(o.purchase_value)
              const oPct = Number(o.purchase_value) > 0 ? (oPnl / Number(o.purchase_value)) * 100 : 0
              return (
                <View key={o.id} className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-5')}>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text numberOfLines={1} className={tw('flex-shrink text-sm font-semibold text-white light:text-slate-900')}>{o.name}</Text>
                        <Badge cls={CATEGORY_BADGE_STYLE[o.category] || CATEGORY_BADGE_STYLE.other}>{o.category}</Badge>
                      </View>
                      <Text className="text-xs text-slate-500">
                        {o.category === 'bond'
                          ? `Matures ${formatDate(o.maturity_date)} · face ${money2(o.face_value)}${o.coupon_rate_pct != null ? ` · ${o.coupon_rate_pct}% coupon` : ''}`
                          : `${o.expected_cagr_pct}% expected CAGR${o.last_known_value != null ? ` · revalued ${formatDate(o.last_known_value_date)}` : ''}`}
                      </Text>
                    </View>
                    <View className="flex-row gap-1">
                      <Pressable onPress={() => onEditOtherInvestment(o)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Pencil} size={14} className="text-slate-500" /></Pressable>
                      <Pressable onPress={() => onDeleteOtherInvestment(o)} hitSlop={6} className="rounded-lg p-1.5"><Icon as={Trash2} size={14} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                    </View>
                  </View>
                  <View className="mt-4 flex-row items-end justify-between">
                    <View>
                      <Text className="text-xs text-slate-500">Projected value</Text>
                      <Text className={tw('text-xl font-semibold text-white light:text-slate-900')}>{showMoney ? money(curVal) : '••••'}</Text>
                      <Text className={tw('mt-0.5 text-[11px]', oPnl >= 0 ? pos : neg)}>{oPnl >= 0 ? '+' : '−'}{showMoney ? money(oPnl).replace('-', '') : '••••'} <Text className="opacity-70">({oPct >= 0 ? '+' : ''}{oPct.toFixed(1)}%)</Text></Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-slate-500">Purchased</Text>
                      <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{money2(o.purchase_value)}</Text>
                    </View>
                  </View>
                  {o.notes ? <Text numberOfLines={1} className="mt-2 text-[11px] text-slate-500">{capitalizeFirst(o.notes)}</Text> : null}
                </View>
              )
            })}
          </View>
        </View>
      )}

      <View className={tw(CARD)}>
        <View className={tw('flex-row items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Cash activity · {monthActivity.length}</Text>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </View>
        {monthActivity.length === 0 ? (
          <EmptyState compact icon={PiggyBank} title={showAllMonths ? 'No cash activity yet' : 'No cash activity this month'} message="Add or withdraw funds to see it here." />
        ) : monthActivity.map((t, i) => {
          const isIn = t.type === 'expense'
          return (
            <View key={t.id} className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              <View className={tw('h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] light:bg-black/[.035]')}><Icon as={isIn ? ArrowUpRight : ArrowDownRight} size={16} className={isIn ? pos : neg} /></View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text numberOfLines={1} className={tw('flex-shrink text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(t.description)}</Text>
                  {isHiddenTx(t, hiddenGroups) ? <Icon as={Lock} size={11} className="text-slate-500" /> : null}
                </View>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{isIn ? 'Funded' : 'Withdrawn'} · {formatDateTime(t.date, t.time)}</Text>
              </View>
              <Text className={tw('text-sm font-semibold', isIn ? pos : neg)}>{isIn ? '+' : '-'}{showMoney ? money(t.amount) : '••••'}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
