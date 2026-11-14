import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { Upload } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { BottomSheet } from '../../ui/BottomSheet'
import { ColorPicker, DateInput, Field, FormSheet, Input, SubmitButton } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { tw } from '../../lib/tw'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { money, todayISO } from '../../lib/format'
import { BOND_INTEREST_FREQUENCIES, OTHER_INVESTMENT_CATEGORIES, currentValueOf, detectAssetType, money2 } from '../../lib/shared'
import { parseCsv } from '@/lib/csv'

// Ports of features/investments/{PortfolioForm, PortfolioFundsForm, WithdrawFundsForm, SipForm,
// HoldingForm, OtherInvestmentForm, HoldingsBulkImport}.jsx.
const dec = (v) => String(v ?? '').replace(/[^0-9.]/g, '')
const BROKERS = [['zerodha', 'Zerodha'], ['groww', 'Groww'], ['indmoney', 'INDmoney'], ['upstox', 'Upstox'], ['angel_one', 'Angel One'], ['icici_direct', 'ICICI Direct'], ['hdfc_securities', 'HDFC Securities'], ['kotak_securities', 'Kotak Securities'], ['paytm_money', 'Paytm Money'], ['5paisa', '5paisa'], ['other', 'Other']].map(([value, label]) => ({ value, label }))
const bankAccounts = (accounts) => accounts.filter((a) => a.type !== 'debit_card')

export function PortfolioForm({ open, onClose, onSaved, editing, accounts }) {
  const blank = () => (editing ? { name: editing.name, broker: editing.broker || 'other', demat_account_id: editing.demat_account_id || '', color: editing.color || '#a78bfa' } : { name: '', broker: 'other', demat_account_id: '', color: '#a78bfa' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { toast.push('Enter a name.', 'error'); return }
    setBusy(true)
    try {
      await api(editing ? `/finance/portfolios/${editing.id}` : '/finance/portfolios', { method: editing ? 'PATCH' : 'POST', body: { ...form, demat_account_id: form.demat_account_id || null } })
      toast.push(`Portfolio ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit portfolio' : 'Add portfolio'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update' : 'Save portfolio'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder="Zerodha Demat A" /></Field>
      <Field label="Broker"><View className="mt-2"><Select value={form.broker} onChange={set('broker')} options={BROKERS} title="Broker" /></View></Field>
      <Field label="Linked account (optional)"><View className="mt-2"><Select value={form.demat_account_id} onChange={set('demat_account_id')} options={[{ value: '', label: 'None' }, ...bankAccounts(accounts).map((a) => ({ value: a.id, label: a.name }))]} title="Linked account" /></View></Field>
      <Field label="Colour"><ColorPicker value={form.color} onChange={set('color')} /></Field>
    </FormSheet>
  )
}

// Add funds (mode 'add') and Withdraw funds (mode 'withdraw') — the two web forms differ only in
// endpoint and wording.
export function PortfolioFundsForm({ open, onClose, onSaved, portfolio, accounts, mode = 'add' }) {
  const blank = () => ({ amount: '', account_id: bankAccounts(accounts)[0]?.id || '', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [open])
  if (!portfolio) return null
  const add = mode === 'add'
  const save = async () => {
    if (!(Number(form.amount) > 0) || !form.account_id) { toast.push('Enter an amount and choose an account.', 'error'); return }
    if (!add && Number(form.amount) > Number(portfolio.cash_balance || 0)) { toast.push('That is more than the cash in this portfolio.', 'error'); return }
    setBusy(true)
    try {
      await api(`/finance/portfolios/${portfolio.id}/${add ? 'add_funds' : 'withdraw_funds'}`, { method: 'POST', body: { ...form, amount: Number(form.amount) } })
      toast.push(`${add ? 'Funds added to' : 'Funds withdrawn from'} ${portfolio.name}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={add ? 'Add funds' : 'Withdraw funds'} onSubmit={save} busy={busy} submitLabel={busy ? (add ? 'Adding…' : 'Withdrawing…') : add ? 'Add funds' : 'Withdraw funds'}>
      <Text className="-mt-1 mb-4 text-xs text-slate-500">{portfolio.name} · current cash {money(portfolio.cash_balance || 0)}</Text>
      <Field label="Amount"><Input keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: dec(v) }))} placeholder="1000" /></Field>
      <Field label={add ? 'From account' : 'To account'}><View className="mt-2"><Select value={form.account_id} onChange={(v) => setForm((f) => ({ ...f, account_id: v }))} options={[{ value: '', label: 'Choose account…' }, ...bankAccounts(accounts).map((a) => ({ value: a.id, label: `${a.name} · ${money(a.current_balance)}` }))]} title={add ? 'From account' : 'To account'} /></View></Field>
      <Field label="Notes"><Input value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Optional" /></Field>
    </FormSheet>
  )
}

export function SipForm({ open, onClose, onSaved, editing, portfolios = [] }) {
  const blank = () => (editing
    ? { fund_name: editing.fund_name, folio_number: editing.folio_number || '', monthly_amount: String(editing.monthly_amount ?? ''), start_date: editing.start_date || todayISO(), units_held: String(editing.units_held ?? ''), nav: String(editing.nav ?? ''), average_price: editing.average_price != null ? String(editing.average_price) : '', portfolio_id: editing.portfolio_id || '' }
    : { fund_name: '', folio_number: '', monthly_amount: '', start_date: todayISO(), units_held: '', nav: '', average_price: '', portfolio_id: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const units = Number(form.units_held) || 0
  const nav = Number(form.nav) || 0
  const save = async () => {
    if (!form.fund_name.trim() || form.monthly_amount === '' || form.units_held === '' || form.nav === '') { toast.push('Fill in fund name, monthly amount, units and NAV.', 'error'); return }
    setBusy(true)
    try {
      const body = { fund_name: form.fund_name, folio_number: form.folio_number || null, monthly_amount: Number(form.monthly_amount), start_date: form.start_date, units_held: units, nav, current_value: units * nav, average_price: form.average_price !== '' ? Number(form.average_price) : null, portfolio_id: form.portfolio_id || null }
      await api(editing ? `/finance/sips/${editing.id}` : '/finance/sips', { method: editing ? 'PATCH' : 'POST', body })
      toast.push(`SIP ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }
  const half = (label, node, opt) => <View className="flex-1"><Field label={label} optional={opt}>{node}</Field></View>
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit SIP' : 'Add SIP'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update SIP' : 'Save SIP'}>
      <Field label="Fund name"><Input value={form.fund_name} onChangeText={set('fund_name')} placeholder="Parag Parikh Flexi Cap" /></Field>
      <View className="flex-row gap-3">
        {half('Folio number', <Input value={form.folio_number} onChangeText={set('folio_number')} />, true)}
        {half('Start date', <DateInput value={form.start_date} onChange={set('start_date')} />)}
      </View>
      <View className="flex-row gap-3">
        {half('Monthly amount', <Input keyboardType="decimal-pad" value={form.monthly_amount} onChangeText={(v) => set('monthly_amount')(dec(v))} />)}
        {half('Units held', <Input keyboardType="decimal-pad" value={form.units_held} onChangeText={(v) => set('units_held')(dec(v))} />)}
      </View>
      <View className="flex-row gap-3">
        {half('Latest NAV', <Input keyboardType="decimal-pad" value={form.nav} onChangeText={(v) => set('nav')(dec(v))} />)}
        {half('Average buy NAV', <Input keyboardType="decimal-pad" value={form.average_price} onChangeText={(v) => set('average_price')(dec(v))} />, true)}
      </View>
      <Field label="Portfolio" hint="Optional — just a grouping label"><View className="mt-2"><Select value={form.portfolio_id} onChange={set('portfolio_id')} options={[{ value: '', label: 'None' }, ...portfolios.map((p) => ({ value: p.id, label: p.name }))]} title="Portfolio" /></View></Field>
      <View className={tw('rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2')}>
        <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Current value (units × NAV): <Text className={tw('font-semibold text-white light:text-slate-900')}>{money2(units * nav)}</Text></Text>
      </View>
    </FormSheet>
  )
}

export function HoldingForm({ open, onClose, onSaved, editing, portfolios, defaultPortfolioId, profile }) {
  const blank = () => (editing
    ? { portfolio_id: editing.portfolio_id, symbol: editing.symbol, exchange: editing.exchange || 'NSE', company_name: editing.company_name || '', qty: String(editing.qty), avg_buy_price: String(editing.avg_buy_price), current_price: String(editing.current_price ?? ''), asset_type: editing.asset_type || 'equity' }
    : { portfolio_id: defaultPortfolioId || portfolios[0]?.id || '', symbol: '', exchange: 'NSE', company_name: '', qty: '', avg_buy_price: '', current_price: '', asset_type: 'equity' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open, defaultPortfolioId])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  // Same cash check as the web: a purchase can't exceed the portfolio's un-invested cash unless
  // the user turned that block off in Settings.
  const checkCash = () => new Promise((resolve) => {
    if (editing && editing.source !== 'manual') return resolve(true)
    const portfolio = portfolios.find((p) => p.id === form.portfolio_id)
    if (!portfolio) return resolve(true)
    const newCost = Number(form.qty || 0) * Number(form.avg_buy_price || 0)
    const oldCost = editing && editing.portfolio_id === form.portfolio_id ? Number(editing.qty || 0) * Number(editing.avg_buy_price || 0) : 0
    const cash = Number(portfolio.cash_balance || 0)
    if (newCost - oldCost <= cash + 0.01) return resolve(true)
    if (profile?.block_insufficient_funds === false) {
      return Alert.alert('Not enough cash', `"${portfolio.name}" only has ${money(cash)} in cash — do you want to confirm this purchase anyway?`, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Confirm', onPress: () => resolve(true) }])
    }
    Alert.alert('Not enough cash', `"${portfolio.name}" doesn't have enough cash for this purchase. Add funds first, or turn this block off in your Profile settings.`, [{ text: 'OK', onPress: () => resolve(false) }])
  })

  const save = async () => {
    if (!form.portfolio_id || !form.symbol.trim() || form.qty === '' || form.avg_buy_price === '') { toast.push('Fill in portfolio, symbol, quantity and average price.', 'error'); return }
    if (!(await checkCash())) return
    setBusy(true)
    try {
      const symbol = form.symbol.toUpperCase().trim()
      const asset_type = form.asset_type === 'equity' ? detectAssetType(symbol) : form.asset_type
      const body = { ...form, symbol, asset_type, qty: Number(form.qty), avg_buy_price: Number(form.avg_buy_price), current_price: Number(form.current_price || form.avg_buy_price), last_price_updated_at: new Date().toISOString() }
      await api(editing ? `/finance/holdings/${editing.id}` : '/finance/holdings', { method: editing ? 'PATCH' : 'POST', body })
      toast.push(`Holding ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit holding' : 'Add holding'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update holding' : 'Save holding'}>
      <Field label="Portfolio"><View className="mt-2"><Select value={form.portfolio_id} onChange={set('portfolio_id')} options={[{ value: '', label: 'Choose portfolio…' }, ...portfolios.map((p) => ({ value: p.id, label: `${p.name} · ${money(p.cash_balance || 0)} cash` }))]} title="Portfolio" /></View></Field>
      <Field label="Symbol"><Input autoCapitalize="characters" value={form.symbol} onChangeText={set('symbol')} placeholder="RELIANCE" /></Field>
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label="Exchange"><View className="mt-2"><Select value={form.exchange} onChange={set('exchange')} options={[{ value: 'NSE', label: 'NSE' }, { value: 'BSE', label: 'BSE' }]} title="Exchange" /></View></Field></View>
        <View className="flex-1"><Field label="Asset type"><View className="mt-2"><Select value={form.asset_type || 'equity'} onChange={set('asset_type')} options={[{ value: 'equity', label: 'Equity' }, { value: 'gold', label: 'Gold' }]} title="Asset type" /></View></Field></View>
      </View>
      <Field label="Company name" optional><Input value={form.company_name} onChangeText={set('company_name')} placeholder="Reliance Industries" /></Field>
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label="Quantity"><Input keyboardType="decimal-pad" value={form.qty} onChangeText={(v) => set('qty')(dec(v))} /></Field></View>
        <View className="flex-1"><Field label="Avg buy price"><Input keyboardType="decimal-pad" value={form.avg_buy_price} onChangeText={(v) => set('avg_buy_price')(dec(v))} /></Field></View>
      </View>
      <Field label="Current price" hint="Starting value — refresh live prices anytime from the menu"><Input keyboardType="decimal-pad" value={form.current_price} onChangeText={(v) => set('current_price')(dec(v))} placeholder="Same as avg if blank" /></Field>
    </FormSheet>
  )
}

export function OtherInvestmentForm({ open, onClose, onSaved, editing, portfolioId }) {
  const blank = () => (editing
    ? { name: editing.name, category: editing.category, purchase_value: String(editing.purchase_value), purchase_date: editing.purchase_date, expected_cagr_pct: String(editing.expected_cagr_pct ?? ''), last_known_value: editing.last_known_value != null ? String(editing.last_known_value) : '', last_known_value_date: editing.last_known_value_date || '', face_value: editing.face_value != null ? String(editing.face_value) : '', coupon_rate_pct: editing.coupon_rate_pct != null ? String(editing.coupon_rate_pct) : '', maturity_date: editing.maturity_date || '', interest_frequency: editing.interest_frequency || 'annual', notes: editing.notes || '' }
    : { name: '', category: 'other', purchase_value: '', purchase_date: todayISO(), expected_cagr_pct: '8', last_known_value: '', last_known_value_date: '', face_value: '', coupon_rate_pct: '', maturity_date: '', interest_frequency: 'annual', notes: '' })
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(blank()) }, [editing, open, portfolioId])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const isBond = form.category === 'bond'
  const preview = currentValueOf({ category: form.category, purchase_value: form.purchase_value || 0, purchase_date: form.purchase_date, expected_cagr_pct: form.expected_cagr_pct || 0, last_known_value: form.last_known_value || null, last_known_value_date: form.last_known_value_date || null, face_value: form.face_value || null, maturity_date: form.maturity_date || null })

  const save = async () => {
    if (!form.name.trim() || form.purchase_value === '') { toast.push('Enter a name and purchase value.', 'error'); return }
    if (isBond && (form.face_value === '' || !form.maturity_date)) { toast.push('A bond needs a face value and maturity date.', 'error'); return }
    setBusy(true)
    try {
      const body = {
        portfolio_id: editing?.portfolio_id || portfolioId, name: form.name, category: form.category, purchase_value: Number(form.purchase_value), purchase_date: form.purchase_date,
        expected_cagr_pct: isBond ? 0 : Number(form.expected_cagr_pct || 0),
        last_known_value: !isBond && form.last_known_value !== '' ? Number(form.last_known_value) : null,
        last_known_value_date: !isBond && form.last_known_value !== '' ? (form.last_known_value_date || todayISO()) : null,
        face_value: isBond && form.face_value !== '' ? Number(form.face_value) : null,
        coupon_rate_pct: isBond && form.coupon_rate_pct !== '' ? Number(form.coupon_rate_pct) : null,
        maturity_date: isBond && form.maturity_date ? form.maturity_date : null,
        interest_frequency: isBond ? form.interest_frequency : null, notes: form.notes || null,
      }
      await api(editing ? `/finance/other_investments/${editing.id}` : '/finance/other_investments', { method: editing ? 'PATCH' : 'POST', body })
      toast.push(`Investment ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  const previewBox = (text) => (
    <View className={tw('mb-3.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2')}>
      <Text className={tw('text-xs leading-5 text-slate-400 light:text-slate-500')}>{text[0]}<Text className={tw('font-semibold text-white light:text-slate-900')}>{money(preview)}</Text>{text[1]}</Text>
    </View>
  )
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit investment' : 'Add other investment'} onSubmit={save} busy={busy} submitLabel={busy ? 'Saving…' : editing ? 'Update investment' : 'Save investment'}>
      <Field label="Name"><Input value={form.name} onChangeText={set('name')} placeholder={isBond ? 'HDFC NCD 2030, RBI Floating Rate Bond…' : 'Gold necklace, 2 acre plot in Kolar…'} /></Field>
      <Field label="Category"><View className="mt-2"><Select value={form.category} onChange={set('category')} options={OTHER_INVESTMENT_CATEGORIES} title="Category" /></View></Field>
      <Field label="Purchase value"><Input keyboardType="decimal-pad" value={form.purchase_value} onChangeText={(v) => set('purchase_value')(dec(v))} /></Field>
      <Field label="Purchase date"><DateInput value={form.purchase_date} onChange={set('purchase_date')} /></Field>
      {isBond ? (
        <>
          <Field label="Face value" hint="Paid at maturity"><Input keyboardType="decimal-pad" value={form.face_value} onChangeText={(v) => set('face_value')(dec(v))} /></Field>
          <Field label="Maturity date"><DateInput value={form.maturity_date} onChange={set('maturity_date')} /></Field>
          <Field label="Coupon rate" hint="% / year, optional"><Input keyboardType="decimal-pad" value={form.coupon_rate_pct} onChangeText={(v) => set('coupon_rate_pct')(dec(v))} /></Field>
          <Field label="Interest payout"><View className="mt-2"><Select value={form.interest_frequency} onChange={set('interest_frequency')} options={BOND_INTEREST_FREQUENCIES} title="Interest payout" /></View></Field>
          {previewBox(['Current value: ', " — straight-line accretes from purchase value to face value between purchase and maturity. Coupon payouts aren't tracked as cash here, just shown for reference."])}
        </>
      ) : (
        <>
          <Field label="Expected CAGR" hint="% / year"><Input keyboardType="numbers-and-punctuation" value={form.expected_cagr_pct} onChangeText={(v) => set('expected_cagr_pct')(v.replace(/[^0-9.-]/g, ''))} /></Field>
          {previewBox(['Projected current value: ', ` — purchase value compounded at the CAGR above, from ${form.last_known_value !== '' ? 'your last known value' : 'the purchase date'}.`])}
          <Field label="Last known value" hint="Optional — a real revaluation"><Input keyboardType="decimal-pad" value={form.last_known_value} onChangeText={(v) => set('last_known_value')(dec(v))} placeholder="Leave blank to project from purchase" /></Field>
          <Field label="As of" hint="Defaults to today"><DateInput value={form.last_known_value_date} onChange={set('last_known_value_date')} placeholder="Today" /></Field>
        </>
      )}
      <Field label="Notes" optional><Input value={form.notes} onChangeText={set('notes')} /></Field>
    </FormSheet>
  )
}

const HOLDING_FIELDS = [
  { key: 'symbol', label: 'Symbol', required: true, guess: /symbol|instrument|scrip|ticker/i },
  { key: 'exchange', label: 'Exchange', guess: /exch/i },
  { key: 'qty', label: 'Quantity', required: true, guess: /qty|quantity/i },
  { key: 'avg_buy_price', label: 'Avg buy price', required: true, guess: /avg.?buy|average.?price|avg.?price|avg.?trading|avg_buy_price/i },
  { key: 'current_price', label: 'Current price', guess: /current.?price|ltp/i },
  { key: 'company_name', label: 'Company name', guess: /company/i },
]

export function HoldingsBulkImport({ open, onClose, onImported, portfolio }) {
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!open) { setParsed(null); setMapping({}) } }, [open])
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    try {
      const out = parseCsv(await new File(res.assets[0].uri).text())
      if (!out.headers.length) return Alert.alert('That file is empty')
      setParsed(out)
      setMapping(Object.fromEntries(HOLDING_FIELDS.map((f) => [f.key, out.headers.find((h) => f.guess.test(h)) || ''])))
    } catch { Alert.alert('Could not read that file', 'Pick a .csv file (Excel files: save as CSV first).') }
  }
  const downloadTemplate = async () => {
    try {
      const file = new File(Paths.cache, 'holdings-template.csv')
      if (file.exists) file.delete()
      await file.write('symbol,exchange,qty,avg_buy_price,current_price,company_name\nRELIANCE,NSE,10,2450.50,2610.00,Reliance Industries\nHDFCBANK,NSE,25,1520.00,1548.75,HDFC Bank\n')
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv' })
    } catch (e) { Alert.alert('Could not create the template', e.message) }
  }
  const rows = useMemo(() => {
    if (!parsed || !mapping.symbol || !mapping.qty || !mapping.avg_buy_price) return []
    const n = (v) => Number(String(v || '').replace(/,/g, ''))
    return parsed.rows.map((r) => {
      const symbol = String(r[mapping.symbol] || '').trim().toUpperCase()
      const qty = n(r[mapping.qty])
      const avg = n(r[mapping.avg_buy_price])
      const current = mapping.current_price && r[mapping.current_price] ? n(r[mapping.current_price]) : avg
      return {
        valid: !!symbol && qty > 0 && avg > 0, symbol, exchange: (mapping.exchange ? String(r[mapping.exchange] || '').trim().toUpperCase() : '') || 'NSE',
        qty, avg_buy_price: avg, current_price: current, company_name: mapping.company_name ? String(r[mapping.company_name] || '').trim() || null : null, asset_type: detectAssetType(symbol), cost: qty * avg,
      }
    })
  }, [parsed, mapping])
  const toImport = rows.filter((r) => r.valid)
  const run = async () => {
    setBusy(true)
    let ok = 0
    for (const r of toImport) {
      const { valid, cost, ...payload } = r
      try { await api('/finance/holdings', { method: 'POST', body: { ...payload, portfolio_id: portfolio.id, source: 'import', last_price_updated_at: new Date().toISOString() } }); ok++ } catch { /* counted below */ }
    }
    setBusy(false)
    Alert.alert('Import finished', `${ok} of ${toImport.length} holdings imported.`)
    onImported()
  }
  if (!portfolio) return null
  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()} title="Bulk import holdings">
      <Text className="-mt-1 text-xs text-slate-500">Into {portfolio.name} · review before importing</Text>
      {!parsed ? (
        <View className="mt-4 gap-3 pb-4">
          <Pressable onPress={pick} className={tw('items-center gap-2 rounded-2xl border border-dashed border-white/15 light:border-black/15 px-4 py-10')}>
            <Icon as={Upload} size={22} className="text-accent-300 light:text-accent-700" />
            <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Choose a CSV file</Text>
            <Text className="text-center text-[11px] text-slate-500">Columns: symbol, exchange, qty, avg buy price, current price (optional), company name (optional)</Text>
          </Pressable>
          <Pressable onPress={downloadTemplate} className="self-center"><Text className={tw('text-xs text-accent-200 light:text-accent-700')}>Download a template</Text></Pressable>
        </View>
      ) : (
        <View className="mt-4 pb-4">
          {HOLDING_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} optional={!f.required}><View className="mt-2"><Select value={mapping[f.key] || ''} onChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))} placeholder="Not in this file" options={[{ value: '', label: 'Not in this file' }, ...parsed.headers.map((h) => ({ value: h, label: h }))]} /></View></Field>
          ))}
          <Text className="mb-2 text-xs uppercase tracking-widest text-slate-500">Preview · {toImport.length} to import</Text>
          {rows.slice(0, 30).map((r, i) => (
            <View key={i} className={tw('flex-row items-center justify-between gap-3 border-t border-white/5 light:border-black/5 py-2', !r.valid && 'opacity-50')}>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm text-slate-300 light:text-slate-700')}>{r.symbol || '—'}{r.asset_type === 'gold' ? ' · Gold' : ''}</Text>
                <Text className="text-[11px] text-slate-500">{r.valid ? `${r.exchange} · ${r.qty} @ ${money2(r.avg_buy_price)}` : 'invalid (missing symbol/qty/price), will be skipped'}</Text>
              </View>
              <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{r.valid ? money2(r.cost) : '—'}</Text>
            </View>
          ))}
          {rows.length > 30 ? <Text className="py-2 text-[11px] text-slate-500">…and {rows.length - 30} more</Text> : null}
          <Text className={tw('mt-3 text-xs text-slate-400 light:text-slate-500')}>Total value: <Text className={tw('font-semibold text-white light:text-slate-900')}>{money(toImport.reduce((s, r) => s + r.cost, 0))}</Text></Text>
          <SubmitButton label={busy ? 'Importing…' : `Import ${toImport.length} holding${toImport.length === 1 ? '' : 's'}`} busy={busy} disabled={toImport.length === 0} onPress={run} />
        </View>
      )}
    </BottomSheet>
  )
}
