'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, Briefcase, ChevronRight, CircleDollarSign, CreditCard,
  Eye, EyeOff, Heart, Landmark, LayoutDashboard, LineChart, ListChecks, LogOut, Menu, Mountain, PiggyBank, Plus,
  RefreshCw, Rocket, Search, ShieldCheck, Sparkles, Star, Tag, Target, TrendingDown, TrendingUp, Trash2, Pencil,
  Wallet, X, Zap,
} from 'lucide-react'

/* ---------------- Formatters ---------------- */
const money = (value) => {
  const n = Number(value || 0)
  const sign = n < 0 ? '-' : ''
  return `${sign}₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n))}`
}
const money2 = (value) => `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(Number(value || 0)))}`
const monthName = (d) => new Date(d).toLocaleString('en-IN', { month: 'short' })
const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2, '0')}-${dt.toLocaleString('en-IN', { month: 'short' })}-${dt.getFullYear()}`
}
const formatDateTime = (d, t) => {
  const base = formatDate(d)
  if (!t) return base
  const [h, m] = String(t).slice(0, 5).split(':')
  if (!h || !m) return base
  const hn = parseInt(h, 10); const ampm = hn >= 12 ? 'PM' : 'AM'; const h12 = ((hn + 11) % 12) + 1
  return `${base} (${h12}:${m} ${ampm})`
}
const todayISO = () => new Date().toISOString().slice(0, 10)

/* ---------------- Toast ---------------- */
function useToast() {
  const [toasts, setToasts] = useState([])
  const push = (message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }
  const view = (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${t.tone === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : t.tone === 'info' ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>{t.message}</div>
      ))}
    </div>
  )
  return { push, view }
}

/* ---------------- Auth Screen ---------------- */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Please check your details and try again.')
      if (mode === 'signup' && !data.access_token) {
        setError('Account created. Check your inbox to confirm your email, then sign in.')
        setMode('login')
      } else {
        onAuth(data.user)
      }
    } catch (caught) { setError(caught.message) } finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b12] px-5 py-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0d111b] shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.1fr_.9fr]">
        <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-[#07101c]"><CircleDollarSign size={22} /></div>
              <span>Deepak Finance</span>
            </div>
            <div className="mt-24 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-200"><Sparkles size={13} /> Your money, in one clear view</div>
              <h1 className="text-6xl font-semibold leading-[1.03] tracking-[-.06em] text-white">Build wealth with <span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">intention.</span></h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">A calm command centre for your accounts, investments and everyday decisions.</p>
            </div>
          </div>
          <div className="relative mt-12 grid grid-cols-3 gap-3">
            {[{ l: 'Accounts', v: 'One view', i: Landmark }, { l: 'Insights', v: 'Monthly', i: LineChart }, { l: 'Secure', v: 'Supabase RLS', i: ShieldCheck }].map((x, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <x.i size={18} className="text-cyan-200" />
                <div className="mt-4 text-xs text-slate-500">{x.l}</div>
                <div className="text-sm font-semibold text-white">{x.v}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center bg-[#101521] p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300 text-[#07101c]"><CircleDollarSign size={22} /></div>Deepak Finance
              </div>
            </div>
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-white">{mode === 'login' ? 'Welcome back' : 'Start your money journey'}</h2>
              <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to your private finance space.' : 'Create your secure personal finance space.'}</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <label className="block text-sm text-slate-300">Name
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="Deepak" />
                </label>
              )}
              <label className="block text-sm text-slate-300">Email
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="you@example.com" />
              </label>
              <label className="block text-sm text-slate-300">Password
                <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="••••••••" />
              </label>
              {error && <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-5 text-amber-200">{error}</div>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-3.5 font-semibold text-[#07101c] transition hover:brightness-110 disabled:opacity-60">
                {busy ? 'Working…' : mode === 'login' ? 'Sign in securely' : 'Create account'}<ChevronRight size={17} />
              </button>
            </form>
            <div className="my-8 flex items-center gap-3 text-xs text-slate-600"><div className="h-px flex-1 bg-white/10" />OR<div className="h-px flex-1 bg-white/10" /></div>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} className="w-full rounded-xl border border-white/10 px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/5">
              {mode === 'login' ? 'Create a new account' : 'I already have an account'}
            </button>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300" />Your data is protected by Supabase Auth</div>
          </div>
        </section>
      </div>
    </main>
  )
}

/* ---------------- Small UI atoms ---------------- */
function StatCard({ label, value, sub, icon: Icon, accent = 'bg-cyan-300/10 text-cyan-200', tone = 'text-emerald-300' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon size={17} /></div>
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</div>
      {sub && <div className={`mt-2 flex items-center gap-1 text-xs ${tone}`}>{sub}</div>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, message, cta, onCta }) {
  return (
    <div className="p-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Icon size={20} /></div>
      <div className="mt-4 font-medium text-white">{title}</div>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {cta && <button onClick={onCta} className="mt-5 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07101c]">{cta}</button>}
    </div>
  )
}

function Skeleton({ className = '' }) { return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} /> }

/* ---------------- Transaction Form ---------------- */
function TransactionForm({ open, onClose, onSaved, editing, accounts, categories, lendBorrow = [], onAddAccount, toast }) {
  const now = todayISO()
  const nowTime = new Date().toTimeString().slice(0, 5)
  const initial = useMemo(() => {
    if (editing) return { ...editing, amount: String(editing.amount), time: editing.time?.slice(0, 5) || nowTime, to_account_id: '' }
    return { type: 'expense', amount: '', description: '', date: now, time: nowTime, account_id: accounts[0]?.id || '', to_account_id: '', category_id: '', notes: '', linked_module: '', linked_module_id: '' }
  }, [editing, open])
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [initial])

  if (!open) return null
  const catsForType = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))
  const openLends = lendBorrow.filter((l) => l.type === 'lent' && l.status !== 'returned')

  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/transactions/${editing.id}` : '/api/finance/transactions'
      const payload = { ...form, amount: Number(form.amount) }
      if (payload.type !== 'transfer') delete payload.to_account_id
      if (!payload.linked_module_id) { delete payload.linked_module; delete payload.linked_module_id }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Transaction updated' : 'Transaction added')
      onSaved()
    } catch (e) { toast.push(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{editing ? 'Edit transaction' : 'Add transaction'}</h2>
            <p className="mt-1 text-xs text-slate-500">Keep the context, not just the number</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[{ v: 'expense', l: 'Expense', c: 'bg-rose-400/15 text-rose-200 border-rose-400/30' }, { v: 'income', l: 'Income', c: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' }, { v: 'transfer', l: 'Transfer', c: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30' }].map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, category_id: t.v === 'transfer' ? '' : (categories.find((c) => c.type === (t.v === 'income' ? 'income' : 'expense'))?.id || ''), linked_module: '', linked_module_id: '' })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>

        {accounts.length === 0 && (
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm text-amber-200">
            <div className="flex items-center gap-2"><Landmark size={14} /> You don&apos;t have any accounts yet.</div>
            <button type="button" onClick={onAddAccount} className="mt-2 rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-300/30">+ Add your first account</button>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Amount
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="0.00" />
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="text-sm text-slate-300">Date
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
            <label className="text-sm text-slate-300">Time
              <input type="time" value={form.time || ''} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-2 w-[110px] rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
          </div>

          <label className="text-sm text-slate-300">{form.type === 'transfer' ? 'From account' : 'Account'}
            <select required={accounts.length > 0} value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
              <option value="">Choose account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          {form.type === 'transfer' ? (
            <label className="text-sm text-slate-300">To account
              <select required value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                <option value="">Choose destination…</option>
                {accounts.filter((a) => a.id !== form.account_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-sm text-slate-300">Category
              <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                <option value="">No category</option>
                {catsForType.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}

          {form.type === 'income' && openLends.length > 0 && (
            <label className="text-sm text-slate-300 sm:col-span-2">Repayment from
              <select value={form.linked_module === 'lend' ? form.linked_module_id : ''} onChange={(e) => setForm({ ...form, linked_module: e.target.value ? 'lend' : '', linked_module_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                <option value="">— Not linked —</option>
                {openLends.map((l) => <option key={l.id} value={l.id}>{l.person_name} · pending {money(Number(l.amount) - Number(l.amount_repaid))}</option>)}
              </select>
              <div className="mt-1 text-[11px] text-slate-500">Selecting a person will auto-mark the loan as partially/fully repaid.</div>
            </label>
          )}

          <label className="text-sm text-slate-300 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder={form.type === 'income' ? 'e.g. Salary, stipend, refund' : form.type === 'transfer' ? 'e.g. Moved to savings' : 'e.g. Groceries at BigBazaar'} />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Optional context" />
          </label>
        </div>

        <button disabled={busy || accounts.length === 0} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">
          {busy ? 'Saving…' : editing ? 'Update transaction' : 'Save transaction'} <ChevronRight size={16} />
        </button>
      </form>
    </div>
  )
}

/* ---------------- Account Form ---------------- */
function AccountForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing ? { ...editing, opening_balance: String(editing.opening_balance) } : { name: '', type: 'bank', bank_name: '', account_number_last4: '', opening_balance: '0', color: '#22d3ee', icon: 'landmark', is_active: true }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/accounts/${editing.id}` : '/api/finance/accounts'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, opening_balance: Number(form.opening_balance) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Account updated' : 'Account added')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const types = [{ v: 'bank', l: 'Bank' }, { v: 'cash', l: 'Cash' }, { v: 'credit_card', l: 'Credit card' }, { v: 'wallet', l: 'Wallet' }, { v: 'startup', l: 'Startup' }]
  const palette = ['#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#34d399', '#60a5fa', '#fb7185', '#facc15']

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit account' : 'Add account'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC Salary" />
          </label>
          <label className="text-sm text-slate-300">Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              {types.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Bank name
            <input value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC Bank" />
          </label>
          <label className="text-sm text-slate-300">Last 4 digits
            <input maxLength={4} value={form.account_number_last4 || ''} onChange={(e) => setForm({ ...form, account_number_last4: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="1234" />
          </label>
          <label className="text-sm text-slate-300">Opening balance
            <input required type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <div className="text-sm text-slate-300 sm:col-span-2">Colour
            <div className="mt-2 flex flex-wrap gap-2">
              {palette.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full border-2 transition ${form.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update account' : 'Save account'}</button>
      </form>
    </div>
  )
}

/* ---------------- Category Form ---------------- */
function CategoryForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing ? { ...editing } : { name: '', type: 'expense', color: '#fb7185', icon: 'tag' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/categories/${editing.id}` : '/api/finance/categories'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Category updated' : 'Category added')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const palette = ['#fb7185', '#f472b6', '#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#facc15', '#f59e0b']
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit category' : 'Add category'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Groceries" />
          </label>
          <label className="text-sm text-slate-300">Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <div className="text-sm text-slate-300">Colour
            <div className="mt-2 flex flex-wrap gap-2">
              {palette.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full border-2 transition ${form.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save category'}</button>
      </form>
    </div>
  )
}

/* ---------------- Budget Form ---------------- */
function BudgetForm({ open, onClose, onSaved, editing, categories, toast }) {
  const expenseCats = categories.filter((c) => c.type === 'expense')
  const initial = editing ? { ...editing, amount: String(editing.amount) } : { category_id: expenseCats[0]?.id || '', amount: '', period: 'monthly', start_date: todayISO() }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/budgets/${editing.id}` : '/api/finance/budgets'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Budget updated' : 'Budget added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit budget' : 'Set a budget'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Category
            <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose category…</option>
              {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Limit amount
            <input required type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="10000" />
          </label>
          <label className="text-sm text-slate-300">Period
            <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update budget' : 'Save budget'}</button>
      </form>
    </div>
  )
}

/* ---------------- CSV Import ---------------- */
function CsvImport({ open, onClose, onImported, accounts, categories, toast }) {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({ date: '', description: '', amount: '', type: '', category: '', notes: '' })
  const [defaultAccount, setDefaultAccount] = useState(accounts[0]?.id || '')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setRows([]); setHeaders([]); setDefaultAccount(accounts[0]?.id || '') } }, [open, accounts])
  if (!open) return null

  const parseCsv = (text) => {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) return { headers: [], rows: [] }
    const split = (line) => {
      const out = []; let cur = ''; let inQ = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { out.push(cur); cur = '' }
        else cur += ch
      }
      out.push(cur); return out.map((c) => c.trim())
    }
    const hs = split(lines[0])
    const rs = lines.slice(1).map((l) => { const cols = split(l); const obj = {}; hs.forEach((h, i) => { obj[h] = cols[i] || '' }); return obj })
    return { headers: hs, rows: rs }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const { headers: hs, rows: rs } = parseCsv(text)
    setHeaders(hs); setRows(rs)
    const auto = { date: '', description: '', amount: '', type: '', category: '', notes: '' }
    hs.forEach((h) => {
      const l = h.toLowerCase()
      if (!auto.date && l.includes('date')) auto.date = h
      if (!auto.description && (l.includes('desc') || l === 'narration' || l === 'particulars')) auto.description = h
      if (!auto.amount && (l === 'amount' || l.includes('amount') || l === 'value')) auto.amount = h
      if (!auto.type && (l === 'type' || l === 'kind')) auto.type = h
      if (!auto.category && l.includes('categ')) auto.category = h
      if (!auto.notes && l.includes('note')) auto.notes = h
    })
    setMapping(auto)
  }

  const doImport = async () => {
    if (!mapping.date || !mapping.description || !mapping.amount) { toast.push('Map at least Date, Description and Amount', 'error'); return }
    if (!defaultAccount) { toast.push('Choose a default account', 'error'); return }
    setBusy(true)
    let ok = 0; let fail = 0
    for (const r of rows) {
      const rawAmount = String(r[mapping.amount] || '').replace(/[,₹\s]/g, '')
      const amount = Number(rawAmount)
      if (!amount || isNaN(amount)) { fail++; continue }
      const rawType = (mapping.type ? String(r[mapping.type] || '').toLowerCase() : '')
      let finalType = 'expense'
      if (rawType.includes('income') || rawType.includes('credit') || rawType === 'cr') finalType = 'income'
      else if (rawType.includes('expense') || rawType.includes('debit') || rawType === 'dr') finalType = 'expense'
      else if (rawAmount.startsWith('-')) finalType = 'expense'
      const catName = mapping.category ? String(r[mapping.category] || '').trim().toLowerCase() : ''
      const cat = catName ? categories.find((c) => c.name.toLowerCase() === catName && c.type === finalType) : null
      let dateVal = r[mapping.date] || todayISO()
      const m = String(dateVal).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
      if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; dateVal = `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` }
      const payload = { type: finalType, amount: Math.abs(amount), description: String(r[mapping.description] || 'Import').slice(0, 200), date: dateVal, account_id: defaultAccount, category_id: cat?.id || null, notes: mapping.notes ? String(r[mapping.notes] || '') : null }
      const res = await fetch('/api/finance/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) ok++; else fail++
    }
    setBusy(false)
    toast.push(`Imported ${ok} transaction${ok === 1 ? '' : 's'}${fail ? ` · ${fail} failed` : ''}`, fail ? 'info' : 'success')
    onImported()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Import from CSV</h2>
            <p className="mt-1 text-xs text-slate-500">Map your columns to match Deepak Finance fields</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        {rows.length === 0 ? (
          <div className="mt-6">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center hover:border-cyan-300/40 hover:bg-cyan-300/5">
              <ListChecks size={24} className="text-cyan-300" />
              <div className="mt-3 text-sm font-medium text-white">Choose a CSV file</div>
              <div className="mt-1 text-xs text-slate-500">Bank statement, spreadsheet export — we&apos;ll auto-detect columns</div>
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {['date', 'description', 'amount', 'type', 'category', 'notes'].map((field) => (
                <label key={field} className="text-sm text-slate-300 capitalize">{field}
                  <select value={mapping[field]} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-2.5 text-white outline-none">
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
              <label className="text-sm text-slate-300 sm:col-span-2">Default account
                <select value={defaultAccount} onChange={(e) => setDefaultAccount(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-2.5 text-white outline-none">
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/20 text-xs">
              <table className="w-full">
                <thead className="bg-white/[.04] text-slate-500"><tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-white/5">{headers.map((h) => <td key={h} className="px-3 py-2 text-slate-400">{r[h]}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-slate-500">{rows.length} rows detected · showing first 5</div>
            <button onClick={doImport} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Importing…' : `Import ${rows.length} transactions`}</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Budgets View ---------------- */
function BudgetsView({ data, onAdd, onEdit, onDelete }) {
  const { budgets, categories, transactions } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const yearKey = `${now.getFullYear()}`
  const spendByCat = (categoryId, period) => transactions.filter((t) => {
    if (t.type !== 'expense' || t.category_id !== categoryId) return false
    const d = new Date(t.date)
    if (period === 'monthly') return `${d.getFullYear()}-${d.getMonth()}` === monthKey
    return `${d.getFullYear()}` === yearKey
  }).reduce((s, t) => s + Number(t.amount || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Guardrails</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Budgets</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add budget</button>
      </div>
      {budgets.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Target} title="No budgets yet" message="Set a monthly limit per category to keep spending in check." cta="Add budget" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const cat = categories.find((c) => c.id === b.category_id)
            const spent = spendByCat(b.category_id, b.period)
            const limit = Number(b.amount || 0)
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
            const tone = pct >= 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
            const text = pct >= 100 ? 'text-rose-300' : pct >= 80 ? 'text-amber-300' : 'text-emerald-300'
            return (
              <div key={b.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl" style={{ background: `${cat?.color || '#94a3b8'}22`, color: cat?.color }} />
                    <div>
                      <div className="text-sm font-semibold text-white">{cat?.name || 'Category'}</div>
                      <div className="text-[11px] capitalize text-slate-500">{b.period}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onEdit(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <div className="text-2xl font-semibold tracking-tight text-white">{money(spent)}</div>
                  <div className="text-xs text-slate-500">of {money(limit)}</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className={`mt-2 text-xs ${text}`}>{pct >= 100 ? `Over budget by ${money(spent - limit)}` : `${pct}% used · ${money(limit - spent)} left`}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Portfolio Form ---------------- */
function PortfolioForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing ? { ...editing } : { name: '', broker: 'other', demat_account_id: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/portfolios/${editing.id}` : '/api/finance/portfolios'
      const payload = { ...form, demat_account_id: form.demat_account_id || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Portfolio updated' : 'Portfolio added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit portfolio' : 'Add portfolio'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Zerodha Demat A" />
          </label>
          <label className="text-sm text-slate-300">Broker
            <select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="zerodha">Zerodha</option><option value="angel_one">Angel One</option><option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Linked account (optional)
            <select value={form.demat_account_id || ''} onChange={(e) => setForm({ ...form, demat_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">None</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save portfolio'}</button>
      </form>
    </div>
  )
}

/* ---------------- Holding Form ---------------- */
function HoldingForm({ open, onClose, onSaved, editing, portfolios, defaultPortfolioId, toast }) {
  const initial = editing
    ? { ...editing, qty: String(editing.qty), avg_buy_price: String(editing.avg_buy_price), current_price: String(editing.current_price) }
    : { portfolio_id: defaultPortfolioId || portfolios[0]?.id || '', symbol: '', exchange: 'NSE', company_name: '', qty: '', avg_buy_price: '', current_price: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open, defaultPortfolioId])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/holdings/${editing.id}` : '/api/finance/holdings'
      const payload = { ...form, symbol: form.symbol.toUpperCase(), qty: Number(form.qty), avg_buy_price: Number(form.avg_buy_price), current_price: Number(form.current_price || form.avg_buy_price), last_price_updated_at: new Date().toISOString() }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Holding updated' : 'Holding added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit holding' : 'Add holding'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Portfolio
            <select required value={form.portfolio_id} onChange={(e) => setForm({ ...form, portfolio_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose portfolio…</option>
              {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Symbol
            <input required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 uppercase text-white outline-none focus:border-cyan-300/50" placeholder="RELIANCE" />
          </label>
          <label className="text-sm text-slate-300">Exchange
            <select value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="NSE">NSE</option><option value="BSE">BSE</option>
            </select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Company name
            <input value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Reliance Industries" />
          </label>
          <label className="text-sm text-slate-300">Quantity
            <input required type="number" step="0.0001" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Avg buy price
            <input required type="number" step="0.01" min="0" value={form.avg_buy_price} onChange={(e) => setForm({ ...form, avg_buy_price: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Current price <span className="text-xs text-slate-500">(manual — Kite live prices coming soon)</span>
            <input type="number" step="0.01" min="0" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Same as avg if blank" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update holding' : 'Save holding'}</button>
      </form>
    </div>
  )
}

/* ---------------- Investments View ---------------- */
function InvestmentsView({ data, onAddPortfolio, onAddHolding, onEditPortfolio, onEditHolding, onDeletePortfolio, onDeleteHolding, onRefreshPrice, onRefreshAll, pricesLoading, onAddFunds, onConnectKite, showMoney }) {
  const { portfolios, holdings, profile } = data
  const kiteConnected = !!profile?.kite_access_token && profile.kite_access_token_at && (Date.now() - new Date(profile.kite_access_token_at).getTime() < 20 * 60 * 60 * 1000)
  const holdingsByPortfolio = (id) => holdings.filter((h) => h.portfolio_id === id)
  const totalInvested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const totalCurrent = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  const totalPnl = totalCurrent - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Wealth builders</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Investments</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefreshAll} disabled={pricesLoading || data.holdings.length === 0} className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"><RefreshCw size={14} className={pricesLoading ? 'animate-spin' : ''} />{pricesLoading ? 'Fetching…' : 'Refresh prices'}</button>
          <button onClick={onAddPortfolio} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">New portfolio</button>
          <button onClick={() => onAddHolding()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add holding</button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 p-5">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-400">Invested value</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{showMoney ? money(totalInvested) : '••••••'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Current value</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{showMoney ? money(totalCurrent) : '••••••'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Overall P&amp;L</div>
            <div className={`mt-2 flex items-baseline gap-2 text-2xl font-semibold tracking-tight ${totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {showMoney ? (totalPnl >= 0 ? '+' : '−') + money(totalPnl).replace('-', '') : '••••'}
              <span className="text-xs">({totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2.5 text-xs text-cyan-200">
          <Sparkles size={13} />
          {kiteConnected ? <span>Live prices via <b>Kite</b>. Token refreshes tomorrow after 6 AM IST.</span> : <span>Currently using Yahoo Finance. Connect your Zerodha Kite for real-time NSE quotes.</span>}
          {!kiteConnected && <button onClick={onConnectKite} className="ml-auto rounded-lg bg-cyan-300/20 px-3 py-1 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-300/30">Connect Kite</button>}
        </div>
      </div>

      {portfolios.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={TrendingUp} title="No portfolios yet" message="Create a portfolio like ‘Zerodha Demat A’ to group your holdings." cta="Create portfolio" onCta={onAddPortfolio} />
        </div>
      ) : (
        <div className="space-y-6">
          {portfolios.map((p) => {
            const items = holdingsByPortfolio(p.id)
            const invested = items.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
            const current = items.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
            const pnl = current - invested
            const pct = invested > 0 ? (pnl / invested) * 100 : 0
            return (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[.035]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{p.name}</div>
                    <div className="text-xs capitalize text-slate-500">{p.broker.replace('_', ' ')} · {items.length} holding{items.length === 1 ? '' : 's'} · Cash {money(p.cash_balance || 0)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Value</div>
                      <div className="text-sm font-semibold text-white">{showMoney ? money(current + Number(p.cash_balance || 0)) : '••••'}</div>
                    </div>
                    <div className={`text-right ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      <div className="text-xs opacity-70">P&amp;L</div>
                      <div className="text-sm font-semibold">{showMoney ? (pnl >= 0 ? '+' : '−') + money(pnl).replace('-', '') : '••••'} <span className="text-[10px]">({pct.toFixed(1)}%)</span></div>
                    </div>
                    <button onClick={() => onAddFunds(p)} className="rounded-lg bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/25">+ Funds</button>
                    <button onClick={() => onAddHolding(p.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15">+ Holding</button>
                    <button onClick={() => onEditPortfolio(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDeletePortfolio(p)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">No holdings in this portfolio yet.</div>
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
                          <th className="px-3 py-3 text-right">P&amp;L</th>
                          <th className="px-3 py-3 text-right">%</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((h) => {
                          const inv = Number(h.qty) * Number(h.avg_buy_price)
                          const cur = Number(h.qty) * Number(h.current_price || h.avg_buy_price)
                          const p = cur - inv
                          const pp = inv > 0 ? (p / inv) * 100 : 0
                          return (
                            <tr key={h.id} className="border-t border-white/5 text-slate-300">
                              <td className="px-5 py-3">
                                <div className="text-sm font-semibold text-white">{h.symbol}</div>
                                <div className="text-[11px] text-slate-500">{h.exchange}{h.company_name ? ` · ${h.company_name}` : ''}</div>
                              </td>
                              <td className="px-3 py-3 text-right">{Number(h.qty)}</td>
                              <td className="px-3 py-3 text-right">{money2(h.avg_buy_price)}</td>
                              <td className="px-3 py-3 text-right">
                                <button onClick={() => onRefreshPrice(h)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-300 hover:bg-white/5">
                                  {money2(h.current_price || h.avg_buy_price)} <RefreshCw size={11} className="text-slate-500" />
                                </button>
                              </td>
                              <td className="px-3 py-3 text-right text-white">{showMoney ? money(cur) : '••••'}</td>
                              <td className={`px-3 py-3 text-right font-semibold ${p >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{showMoney ? (p >= 0 ? '+' : '−') + money(p).replace('-', '') : '••••'}</td>
                              <td className={`px-3 py-3 text-right ${p >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pp >= 0 ? '+' : ''}{pp.toFixed(2)}%</td>
                              <td className="px-5 py-3">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => onEditHolding(h)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                                  <button onClick={() => onDeleteHolding(h)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
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
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Loan Form ---------------- */
function LoanForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, principal: String(editing.principal), interest_rate: String(editing.interest_rate), tenure_months: String(editing.tenure_months), emi_amount: String(editing.emi_amount) }
    : { name: '', lender: '', principal: '', interest_rate: '', tenure_months: '', emi_amount: '', start_date: todayISO(), paid_from_account_id: accounts[0]?.id || '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  // Auto-calc EMI if principal/rate/tenure known and emi is empty
  const suggestEmi = () => {
    const P = Number(form.principal), r = Number(form.interest_rate) / 12 / 100, n = Number(form.tenure_months)
    if (P > 0 && r >= 0 && n > 0) {
      const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      setForm({ ...form, emi_amount: emi.toFixed(2) })
    }
  }

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/loans/${editing.id}` : '/api/finance/loans'
      const payload = { ...form, principal: Number(form.principal), interest_rate: Number(form.interest_rate), tenure_months: Number(form.tenure_months), emi_amount: Number(form.emi_amount) }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Loan updated' : 'Loan added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit loan' : 'Add loan'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Home loan" />
          </label>
          <label className="text-sm text-slate-300">Lender
            <input value={form.lender || ''} onChange={(e) => setForm({ ...form, lender: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC Bank" />
          </label>
          <label className="text-sm text-slate-300">Principal
            <input required type="number" step="0.01" min="0" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Interest rate % p.a.
            <input required type="number" step="0.01" min="0" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Tenure (months)
            <input required type="number" min="1" value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">EMI amount
            <div className="mt-2 flex gap-2">
              <input required type="number" step="0.01" min="0" value={form.emi_amount} onChange={(e) => setForm({ ...form, emi_amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
              <button type="button" onClick={suggestEmi} className="rounded-xl border border-white/10 px-3 text-xs text-cyan-200 hover:bg-white/5">Calc</button>
            </div>
          </label>
          <label className="text-sm text-slate-300">Start date
            <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Pay from account
            <select value={form.paid_from_account_id || ''} onChange={(e) => setForm({ ...form, paid_from_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">None</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update loan' : 'Save loan'}</button>
      </form>
    </div>
  )
}

/* ---------------- Loan Payment Form ---------------- */
function LoanPaymentForm({ open, onClose, onSaved, loan, accounts, toast }) {
  const initial = { amount: '', type: 'emi', payment_date: todayISO(), account_id: loan?.paid_from_account_id || accounts[0]?.id || '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm({ ...initial, amount: loan?.emi_amount ? String(loan.emi_amount) : '', account_id: loan?.paid_from_account_id || accounts[0]?.id || '' }) }, [loan, open, accounts])
  if (!open || !loan) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch('/api/finance/loan_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_id: loan.id, ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      const msg = data.interest_saved > 0 ? `Payment logged · Interest saved ${money(data.interest_saved)}` : 'Payment logged'
      toast.push(msg)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log payment</h2>
            <p className="mt-1 text-xs text-slate-500">{loan.name} · outstanding {money(loan.outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 'emi', l: 'EMI' }, { v: 'prepayment', l: 'Prepayment' }].map((t) => (
              <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
            ))}
          </div>
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Payment date
            <input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Pay from account
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Notes
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Optional" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Log payment'}</button>
      </form>
    </div>
  )
}

/* ---------------- Loans View ---------------- */
function LoansView({ data, onAdd, onEdit, onDelete, onPay, onDeletePayment, showMoney }) {
  const { loans, loan_payments, accounts } = data
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Debt clarity</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Loans</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add loan</button>
      </div>
      {loans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Landmark} title="No loans yet" message="Log home, car or personal loans and track EMIs + prepayments." cta="Add loan" onCta={onAdd} />
        </div>
      ) : (
        <div className="space-y-6">
          {loans.map((loan) => {
            const payments = loan_payments.filter((p) => p.loan_id === loan.id)
            const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
            const principal = Number(loan.principal || 0)
            const outstanding = Number(loan.outstanding || 0)
            const cleared = principal > 0 ? Math.min(100, Math.round(((principal - outstanding) / principal) * 100)) : 0
            const account = accounts.find((a) => a.id === loan.paid_from_account_id)
            return (
              <div key={loan.id} className="rounded-2xl border border-white/10 bg-white/[.035]">
                <div className="grid gap-5 border-b border-white/10 px-5 py-5 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">{loan.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${loan.status === 'closed' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-cyan-400/15 text-cyan-200'}`}>{loan.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{loan.lender || 'Lender'} · EMI {money(loan.emi_amount)} · {loan.interest_rate}% p.a. · {loan.tenure_months} mo</div>
                    {account && <div className="mt-1 text-[11px] text-slate-500">Paying from {account.name}</div>}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Outstanding</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(outstanding) : '••••'}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${cleared}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300">{cleared}% cleared</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total paid</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(totalPaid) : '••••'}</div>
                    {Number(loan.interest_saved || 0) > 0 && <div className="mt-2 text-[11px] text-emerald-300">Interest saved {money(loan.interest_saved)}</div>}
                  </div>
                  <div className="flex flex-col gap-2 self-start">
                    <button onClick={() => onPay(loan)} disabled={loan.status === 'closed'} className="rounded-lg bg-gradient-to-r from-cyan-300 to-blue-500 px-3 py-2 text-xs font-semibold text-[#07101c] disabled:opacity-50">Log payment</button>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(loan)} className="rounded-lg border border-white/10 p-2 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => onDelete(loan)} className="rounded-lg border border-white/10 p-2 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
                {payments.length > 0 && (
                  <div className="divide-y divide-white/5">
                    {payments.slice(0, 5).map((p) => {
                      const acc = accounts.find((a) => a.id === p.account_id)
                      return (
                        <div key={p.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 px-5 py-3 text-sm">
                          <div className="capitalize text-slate-300">{p.type === 'emi' ? 'EMI' : 'Prepayment'}</div>
                          <div className="text-slate-500">{formatDate(p.payment_date)}{acc ? ` · ${acc.name}` : ''}</div>
                          <div className="text-right font-medium text-white">{showMoney ? money(p.amount) : '••••'}</div>
                          <button onClick={() => onDeletePayment(p)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                        </div>
                      )
                    })}
                    {payments.length > 5 && <div className="px-5 py-2 text-xs text-slate-500">+ {payments.length - 5} more payments</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Bucket List Form ---------------- */
function BucketForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing ? { ...editing, estimated_cost: String(editing.estimated_cost) } : { title: '', estimated_cost: '', priority: 'medium', target_date: '', status: 'wishlist', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/bucket_list/${editing.id}` : '/api/finance/bucket_list'
      const payload = { ...form, estimated_cost: Number(form.estimated_cost), target_date: form.target_date || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Added to bucket list'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit dream' : 'Add to bucket list'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Title
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Trip to Iceland" />
          </label>
          <label className="text-sm text-slate-300">Estimated cost
            <input required type="number" step="0.01" min="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="250000" />
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[{ v: 'low', l: 'Low' }, { v: 'medium', l: 'Medium' }, { v: 'high', l: 'High' }, { v: 'dream', l: 'Dream' }].map((p) => (
              <button key={p.v} type="button" onClick={() => setForm({ ...form, priority: p.v })} className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${form.priority === p.v ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{p.l}</button>
            ))}
          </div>
          <label className="text-sm text-slate-300">Target date
            <input type="date" value={form.target_date || ''} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="wishlist">Wishlist</option><option value="saving">Saving</option><option value="achieved">Achieved</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Why this matters" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Add to list'}</button>
      </form>
    </div>
  )
}

/* ---------------- Bucket List View ---------------- */
function BucketListView({ data, onAdd, onEdit, onDelete }) {
  const { bucket_list, transactions } = data
  // avg monthly savings from last 6 months
  const now = new Date()
  const months = new Set()
  let incomeTotal = 0, expenseTotal = 0
  for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.add(`${d.getFullYear()}-${d.getMonth()}`) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!months.has(key)) return
    if (t.type === 'income') incomeTotal += Number(t.amount || 0)
    if (t.type === 'expense') expenseTotal += Number(t.amount || 0)
  })
  const avgMonthlySavings = Math.max(0, (incomeTotal - expenseTotal) / months.size)

  const priorityMeta = {
    dream: { c: 'bg-violet-400/15 text-violet-200 border-violet-400/30', i: Star },
    high: { c: 'bg-rose-400/15 text-rose-200 border-rose-400/30', i: Rocket },
    medium: { c: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30', i: Target },
    low: { c: 'bg-slate-400/15 text-slate-300 border-slate-400/30', i: Heart },
  }
  const statusMeta = {
    wishlist: 'bg-slate-500/15 text-slate-300',
    saving: 'bg-cyan-400/15 text-cyan-200',
    achieved: 'bg-emerald-400/15 text-emerald-200',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Dreams with a plan</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Bucket list</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/5 to-transparent p-5">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><PiggyBank size={18} /></div>
          <div>
            <div className="text-white">Avg monthly savings (last 6 months)</div>
            <div className="text-xs text-slate-500">Used to estimate months-to-goal for each dream</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-semibold text-white">{money(avgMonthlySavings)}</div>
            <div className="text-[11px] text-slate-500">per month</div>
          </div>
        </div>
      </div>

      {bucket_list.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Mountain} title="Your list is empty" message="Add the dreams you're building towards — trip, gadget, business, home." cta="Add first dream" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bucket_list.map((b) => {
            const meta = priorityMeta[b.priority] || priorityMeta.medium
            const cost = Number(b.estimated_cost || 0)
            const months = avgMonthlySavings > 0 ? Math.ceil(cost / avgMonthlySavings) : null
            const years = months ? Math.floor(months / 12) : null
            const monthsRem = months ? months % 12 : null
            const timeLabel = months == null ? 'Log income first to estimate' : years > 0 ? `${years}y ${monthsRem}m at current pace` : `${months} month${months === 1 ? '' : 's'} at current pace`
            return (
              <div key={b.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${meta.c}`}>
                    <meta.i size={11} /> {b.priority}
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => onEdit(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-4 text-lg font-semibold text-white">{b.title}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{money(cost)}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusMeta[b.status]}`}>{b.status}</span>
                  {b.target_date && <span className="text-[11px] text-slate-500">by {formatDate(b.target_date)}</span>}
                </div>
                <div className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Rocket size={13} className="text-cyan-300" />{timeLabel}</div>
                </div>
                {b.notes && <div className="mt-2 text-[11px] text-slate-500">{b.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Add Portfolio Funds ---------------- */
function PortfolioFundsForm({ open, onClose, onSaved, portfolio, accounts, toast }) {
  const [form, setForm] = useState({ amount: '', account_id: accounts[0]?.id || '', notes: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm({ amount: '', account_id: accounts[0]?.id || '', notes: '' }) }, [open, accounts])
  if (!open || !portfolio) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch(`/api/finance/portfolios/${portfolio.id}/add_funds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not add funds')
      toast.push('Funds added to ' + portfolio.name); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Add funds</h2>
            <p className="mt-1 text-xs text-slate-500">{portfolio.name} · current cash {money(portfolio.cash_balance || 0)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="1000" />
          </label>
          <label className="text-sm text-slate-300">From account
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Notes
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Optional" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Adding…' : 'Add funds'}</button>
      </form>
    </div>
  )
}

/* ---------------- Lend / Borrow Form ---------------- */
function LendForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount) }
    : { person_name: '', type: 'lent', amount: '', date: todayISO(), due_date: '', from_account_id: accounts[0]?.id || '', reason: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/lend_borrow/${editing.id}` : '/api/finance/lend_borrow'
      const payload = { ...form, amount: Number(form.amount), due_date: form.due_date || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Recorded'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit record' : 'Log lend or borrow'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[{ v: 'lent', l: 'I lent' }, { v: 'borrowed', l: 'I borrowed' }].map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Person name
            <input required value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Rohan" />
          </label>
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Date
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">{form.type === 'lent' ? 'From account' : 'To account'}
            <select value={form.from_account_id || ''} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">None (skip account impact)</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Due date (optional)
            <input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Reason
            <input value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Rent help, exam fees…" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save'}</button>
      </form>
    </div>
  )
}

/* ---------------- Lend / Borrow View ---------------- */
function LendBorrowView({ data, onAdd, onEdit, onDelete, showMoney }) {
  const { lend_borrow, lend_repayments, accounts } = data
  const now = new Date()
  const lent = lend_borrow.filter((l) => l.type === 'lent')
  const borrowed = lend_borrow.filter((l) => l.type === 'borrowed')
  const lentPending = lent.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const borrowedPending = borrowed.reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)

  const card = (l) => {
    const repaid = Number(l.amount_repaid || 0)
    const pending = Math.max(0, Number(l.amount) - repaid)
    const pct = Number(l.amount) > 0 ? Math.min(100, Math.round((repaid / Number(l.amount)) * 100)) : 0
    const overdue = l.due_date && l.status !== 'returned' && new Date(l.due_date) < now
    const acc = accounts.find((a) => a.id === l.from_account_id)
    const paymentsForThis = lend_repayments.filter((r) => r.lend_borrow_id === l.id)
    return (
      <div key={l.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold text-white">{l.person_name}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${l.status === 'returned' ? 'bg-emerald-400/15 text-emerald-200' : l.status === 'partial' ? 'bg-amber-400/15 text-amber-200' : 'bg-cyan-400/15 text-cyan-200'}`}>{l.status}</span>
              {overdue && <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-rose-200">overdue</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500">{l.reason || (l.type === 'lent' ? 'Lent' : 'Borrowed')} · {formatDate(l.date)}{acc ? ` · ${acc.name}` : ''}{l.due_date ? ` · due ${formatDate(l.due_date)}` : ''}</div>
          </div>
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={() => onEdit(l)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
            <button onClick={() => onDelete(l)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">Pending</div>
            <div className="text-2xl font-semibold text-white">{showMoney ? money(pending) : '••••'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">of {showMoney ? money(l.amount) : '••••'}</div>
            <div className="text-[11px] text-emerald-300">{money(repaid)} repaid</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        {paymentsForThis.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-white/5 pt-3 text-xs">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Repayments</div>
            {paymentsForThis.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-slate-400">
                <span>{formatDate(r.date)}</span><span className="font-medium text-emerald-300">+{money(r.amount)}</span>
              </div>
            ))}
            {paymentsForThis.length > 3 && <div className="text-slate-500">+ {paymentsForThis.length - 3} more</div>}
          </div>
        )}
        <div className="mt-3 text-[11px] text-slate-500">
          {l.type === 'lent' ? '💡 To record a repayment, add an Income transaction and link it to this person.' : '💡 To repay, add an Expense transaction from any account.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Money between people</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Lend &amp; borrow</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Log</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-emerald-500/5 p-5">
          <div className="text-xs text-slate-400">Total lent (pending)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{showMoney ? money(lentPending) : '••••••'}</div>
          <div className="mt-1 text-xs text-emerald-300">{lent.length} people</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-rose-500/5 p-5">
          <div className="text-xs text-slate-400">Total borrowed (pending)</div>
          <div className="mt-2 text-2xl font-semibold text-white">{showMoney ? money(borrowedPending) : '••••••'}</div>
          <div className="mt-1 text-xs text-rose-300">{borrowed.length} people</div>
        </div>
      </div>
      {lend_borrow.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Heart} title="Nothing to track" message="Log money you've lent to friends or borrowed from someone." cta="Add first record" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lend_borrow.map(card)}</div>
      )}
    </div>
  )
}

/* ---------------- Profile View ---------------- */
function ProfileView({ data, user, theme, onThemeChange, onSaveProfile, onAddCategory, onEditCategory, onDeleteCategory }) {
  const { profile, categories } = data
  const [form, setForm] = useState({ full_name: '', age: '', avatar_url: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', age: profile.age ?? '', avatar_url: profile.avatar_url || '' })
  }, [profile])
  const save = async () => {
    setBusy(true)
    try { await onSaveProfile({ ...form, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) }
  }
  const grouped = { income: categories.filter((c) => c.type === 'income'), expense: categories.filter((c) => c.type === 'expense') }
  const initials = (form.full_name || user?.email || 'D').slice(0, 1).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Your space</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Profile &amp; settings</h1>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="h-20 w-20 rounded-2xl border border-white/10 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-3xl font-semibold text-[#07101c]">{initials}</div>
            )}
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Full name
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Deepak Perumal" />
            </label>
            <label className="text-sm text-slate-300">Age
              <input type="number" min="1" max="150" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
            <label className="text-sm text-slate-300 sm:col-span-2">Avatar URL
              <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="https://…" />
            </label>
            <div className="text-sm text-slate-300 sm:col-span-2">
              <div className="text-xs text-slate-500">Email</div>
              <div className="mt-1 text-white">{user?.email}</div>
            </div>
          </div>
        </div>
        <button onClick={save} disabled={busy} className="mt-6 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save profile'}</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
        <div className="text-sm font-semibold text-white">Theme</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[{ v: 'dark', l: 'Dark', c: 'from-slate-900 to-slate-700' }, { v: 'midnight', l: 'Midnight', c: 'from-[#0b1220] to-[#1e2a44]' }, { v: 'ocean', l: 'Ocean', c: 'from-cyan-900 to-blue-950' }].map((t) => (
            <button key={t.v} onClick={() => onThemeChange(t.v)} className={`rounded-2xl border p-4 text-left transition ${theme === t.v ? 'border-cyan-300/50 bg-cyan-400/10' : 'border-white/10 hover:bg-white/[.04]'}`}>
              <div className={`h-16 rounded-lg bg-gradient-to-br ${t.c}`} />
              <div className="mt-3 text-sm font-medium text-white">{t.l}</div>
              {theme === t.v && <div className="text-[11px] text-cyan-300">Active</div>}
            </button>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-slate-500">Currently only dark themes; light mode coming soon.</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Categories</div>
            <div className="text-xs text-slate-500">Group your income and expenses your way</div>
          </div>
          <button onClick={onAddCategory} className="flex items-center gap-1 rounded-xl bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[.1]"><Plus size={13} />Add</button>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {['income', 'expense'].map((k) => (
            <div key={k}>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
              <div className="space-y-1.5">
                {grouped[k].length === 0 ? <div className="text-sm text-slate-500">No categories</div> : grouped[k].map((c) => (
                  <div key={c.id} className="group flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                    <div className="flex items-center gap-3"><div className="h-6 w-6 rounded-md" style={{ background: `${c.color || '#94a3b8'}33`, color: c.color }} /><span className="text-sm text-white">{c.name}</span></div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEditCategory(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => onDeleteCategory(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Credit Card Form ---------------- */
function CreditCardForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing
    ? { ...editing, credit_limit: String(editing.credit_limit), billing_date: String(editing.billing_date), due_date_offset: String(editing.due_date_offset) }
    : { name: '', bank: '', last4: '', credit_limit: '', billing_date: '1', due_date_offset: '15', color: '#a78bfa' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/credit_cards/${editing.id}` : '/api/finance/credit_cards'
      const payload = { ...form, credit_limit: Number(form.credit_limit), billing_date: Number(form.billing_date), due_date_offset: Number(form.due_date_offset) }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Card updated' : 'Card added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const palette = ['#a78bfa', '#22d3ee', '#f472b6', '#f59e0b', '#34d399', '#60a5fa']
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit card' : 'Add credit card'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC MoneyBack" />
          </label>
          <label className="text-sm text-slate-300">Bank
            <input value={form.bank || ''} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC Bank" />
          </label>
          <label className="text-sm text-slate-300">Last 4 digits
            <input maxLength={4} value={form.last4 || ''} onChange={(e) => setForm({ ...form, last4: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="1234" />
          </label>
          <label className="text-sm text-slate-300">Credit limit
            <input required type="number" step="1" min="0" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="200000" />
          </label>
          <label className="text-sm text-slate-300">Billing day (1-28)
            <input required type="number" min="1" max="28" value={form.billing_date} onChange={(e) => setForm({ ...form, billing_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Due date offset (days)
            <input required type="number" min="1" max="30" value={form.due_date_offset} onChange={(e) => setForm({ ...form, due_date_offset: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <div className="text-sm text-slate-300 sm:col-span-2">Colour
            <div className="mt-2 flex flex-wrap gap-2">
              {palette.map((c) => (<button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full border-2 transition ${form.color === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />))}
            </div>
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update card' : 'Save card'}</button>
      </form>
    </div>
  )
}

/* ---------------- Credit Card Spend Form ---------------- */
function CardSpendForm({ open, onClose, onSaved, card, categories, toast }) {
  const initial = { amount: '', description: '', category_id: '', date: todayISO(), time: new Date().toTimeString().slice(0, 5), notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(initial) }, [open])
  if (!open || !card) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch('/api/finance/credit_card_transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credit_card_id: card.id, ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push('Spend logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const expenseCats = categories.filter((c) => c.type === 'expense')
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Log spend</h2>
            <p className="mt-1 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Swiggy order" />
          </label>
          <label className="text-sm text-slate-300">Category
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">No category</option>
              {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="text-sm text-slate-300">Date
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
            <label className="text-sm text-slate-300">Time
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-2 w-[110px] rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Log spend'}</button>
      </form>
    </div>
  )
}

/* ---------------- Card Bill Payment ---------------- */
function CardPayForm({ open, onClose, onSaved, card, accounts, toast }) {
  const [form, setForm] = useState({ amount: '', account_id: accounts[0]?.id || '', date: todayISO(), notes: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open && card) setForm({ amount: String(card.current_outstanding || ''), account_id: accounts[0]?.id || '', date: todayISO(), notes: '' }) }, [open, card, accounts])
  if (!open || !card) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch(`/api/finance/credit_cards/${card.id}/pay_bill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not pay')
      toast.push('Bill paid'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pay bill</h2>
            <p className="mt-1 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Pay from account
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose account…</option>
              {accounts.filter((a) => a.type !== 'credit_card').map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Date
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Paying…' : 'Pay bill'}</button>
      </form>
    </div>
  )
}

/* ---------------- Credit Cards View ---------------- */
function CreditCardsView({ data, onAdd, onEdit, onDelete, onSpend, onPay, onDeleteSpend, showMoney }) {
  const { credit_cards, credit_card_transactions, categories } = data
  const totalOutstanding = credit_cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const totalLimit = credit_cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const overallUtil = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0

  const nextDueLabel = (card) => {
    const now = new Date(); const bd = Number(card.billing_date), offset = Number(card.due_date_offset)
    let billing = new Date(now.getFullYear(), now.getMonth(), bd)
    if (now > billing) billing = new Date(now.getFullYear(), now.getMonth() + 1, bd)
    const due = new Date(billing); due.setDate(due.getDate() + offset)
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
    return { due, days }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Plastic tracker</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Credit cards</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add card</button>
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
        <div className="grid gap-6 xl:grid-cols-2">
          {credit_cards.map((card) => {
            const util = Number(card.credit_limit) > 0 ? Math.min(100, Math.round((Number(card.current_outstanding) / Number(card.credit_limit)) * 100)) : 0
            const tone = util >= 80 ? 'bg-rose-400' : util >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
            const txns = credit_card_transactions.filter((t) => t.credit_card_id === card.id).slice(0, 5)
            const nd = nextDueLabel(card)
            return (
              <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[.035]">
                <div className="rounded-t-2xl p-5" style={{ background: `linear-gradient(135deg, ${card.color}22, transparent)` }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${card.color}33`, color: card.color }}><CreditCard size={20} /></div>
                      <div>
                        <div className="text-base font-semibold text-white">{card.name}</div>
                        <div className="text-xs text-slate-500">{card.bank || 'Bank'}{card.last4 ? ` · •${card.last4}` : ''} · Bill on {card.billing_date} · Due in {nd.days > 0 ? `${nd.days} day${nd.days === 1 ? '' : 's'}` : 'overdue'}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(card)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(card)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Outstanding</div>
                      <div className="text-2xl font-semibold text-white">{showMoney ? money(card.current_outstanding) : '••••'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Limit</div>
                      <div className="text-sm text-slate-300">{showMoney ? money(card.credit_limit) : '••••'}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${util}%` }} /></div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={util >= 80 ? 'text-rose-300' : util >= 50 ? 'text-amber-300' : 'text-emerald-300'}>{util}% used</span>
                    <span className="text-slate-500">₹{new Intl.NumberFormat('en-IN').format(Math.max(0, Number(card.credit_limit) - Number(card.current_outstanding)))} available</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => onSpend(card)} className="flex-1 rounded-xl bg-white/[.06] py-2 text-xs font-semibold text-white hover:bg-white/[.1]">+ Log spend</button>
                    <button onClick={() => onPay(card)} disabled={Number(card.current_outstanding) <= 0} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-2 text-xs font-semibold text-[#07101c] disabled:opacity-50">Pay bill</button>
                  </div>
                </div>
                {txns.length > 0 && (
                  <div className="divide-y divide-white/5 border-t border-white/10">
                    {txns.map((t) => {
                      const cat = categories.find((c) => c.id === t.category_id)
                      return (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                          <div>
                            <div className="text-white">{t.description}</div>
                            <div className="text-[11px] text-slate-500">{cat?.name || 'Uncategorised'} · {formatDateTime(t.date, t.time)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold text-rose-300">-{money(t.amount)}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-500">{t.status}</div>
                            </div>
                            <button onClick={() => onDeleteSpend(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Scholarship Form ---------------- */
function ScholarshipForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, total_amount: String(editing.total_amount) }
    : { name: '', total_amount: '', academic_year: '', source: '', status: 'pending', received_date: '', due_date: '', received_to_account_id: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/scholarships/${editing.id}` : '/api/finance/scholarships'
      const payload = { ...form, total_amount: Number(form.total_amount), received_date: form.received_date || null, due_date: form.due_date || null, received_to_account_id: form.received_to_account_id || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Scholarship added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit scholarship' : 'Add scholarship'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300 sm:col-span-2">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Merit scholarship Q1" />
          </label>
          <label className="text-sm text-slate-300">Total amount
            <input required type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Academic year
            <input value={form.academic_year || ''} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="2025-26" />
          </label>
          <label className="text-sm text-slate-300">Source
            <input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Govt / Foundation / College" />
          </label>
          <label className="text-sm text-slate-300">Status
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="pending">Pending</option><option value="received">Received</option><option value="paid">Paid to college</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Received date
            <input type="date" value={form.received_date || ''} onChange={(e) => setForm({ ...form, received_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Due date (to college)
            <input type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Received into account (when marked received)
            <select value={form.received_to_account_id || ''} onChange={(e) => setForm({ ...form, received_to_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">None</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save'}</button>
      </form>
    </div>
  )
}

/* ---------------- Scholarship Pay Form ---------------- */
function ScholarshipPayForm({ open, onClose, onSaved, scholarship, accounts, toast }) {
  const initial = { amount: '', paid_to: 'College', payment_date: todayISO(), account_id: scholarship?.received_to_account_id || accounts[0]?.id || '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm({ ...initial, account_id: scholarship?.received_to_account_id || accounts[0]?.id || '' }) }, [open, scholarship, accounts])
  if (!open || !scholarship) return null
  const pending = Number(scholarship.total_amount) - Number(scholarship.amount_paid_to_college || 0)
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch('/api/finance/scholarship_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scholarship_id: scholarship.id, ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not pay')
      toast.push('Payment logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pay to college</h2>
            <p className="mt-1 text-xs text-slate-500">{scholarship.name} · pending {money(pending)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Paid to
            <input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="College name / bursar" />
          </label>
          <label className="text-sm text-slate-300">Date
            <input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">From account
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="">Choose account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
            </select>
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Paying…' : 'Log payment'}</button>
      </form>
    </div>
  )
}

/* ---------------- Scholarships View ---------------- */
function ScholarshipsView({ data, onAdd, onEdit, onDelete, onPay, showMoney }) {
  const { scholarships, scholarship_payments, transactions, categories, accounts } = data
  const totalReceived = scholarships.filter((s) => s.status !== 'pending').reduce((s, x) => s + Number(x.total_amount || 0), 0)
  const totalPaidCollege = scholarships.reduce((s, x) => s + Number(x.amount_paid_to_college || 0), 0)
  const pendingToCollege = totalReceived - totalPaidCollege

  // Misuse detection: for each scholarship, look at transactions from its received_to_account after received_date,
  // any non-scholarship expense counted as potentially misused
  const misuseWarn = (s) => {
    if (!s.received_to_account_id || !s.received_date) return null
    const misused = transactions.filter((t) => t.account_id === s.received_to_account_id && t.type === 'expense' && new Date(t.date) >= new Date(s.received_date) && t.linked_module !== 'scholarship' && t.linked_module !== 'investment')
    const amount = misused.reduce((a, t) => a + Number(t.amount || 0), 0)
    return amount > 0 ? { amount, count: misused.length } : null
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Scholarship trail</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Scholarships &amp; fees</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add scholarship</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Received" value={showMoney ? money(totalReceived) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{scholarships.filter((s) => s.status !== 'pending').length} batch(es)</span>} />
        <StatCard label="Paid to college" value={showMoney ? money(totalPaidCollege) : '••••'} icon={ArrowDownRight} accent="bg-cyan-400/15 text-cyan-200" sub={<span>{scholarship_payments.length} payment(s)</span>} />
        <StatCard label="Pending to college" value={showMoney ? money(pendingToCollege) : '••••'} icon={Target} accent="bg-amber-400/15 text-amber-200" tone={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'} sub={<span className={pendingToCollege > 0 ? 'text-amber-300' : 'text-emerald-300'}>{pendingToCollege > 0 ? 'Due to college' : 'All paid'}</span>} />
      </div>

      {scholarships.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={ShieldCheck} title="No scholarships yet" message="Log received batches and payments to college, and we'll warn if funds are misused." cta="Add first batch" onCta={onAdd} />
        </div>
      ) : (
        <div className="space-y-4">
          {scholarships.map((s) => {
            const paid = Number(s.amount_paid_to_college || 0)
            const total = Number(s.total_amount || 0)
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const pending = Math.max(0, total - paid)
            const acc = accounts.find((a) => a.id === s.received_to_account_id)
            const warn = misuseWarn(s)
            return (
              <div key={s.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">{s.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${s.status === 'paid' ? 'bg-emerald-400/15 text-emerald-200' : s.status === 'received' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-500/15 text-slate-300'}`}>{s.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{s.source || '—'} · {s.academic_year || '—'}{acc ? ` · into ${acc.name}` : ''}{s.received_date ? ` · received ${formatDate(s.received_date)}` : ''}{s.due_date ? ` · due ${formatDate(s.due_date)}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onPay(s)} disabled={pending <= 0} className="rounded-lg bg-gradient-to-r from-cyan-300 to-blue-500 px-3 py-1.5 text-xs font-semibold text-[#07101c] disabled:opacity-50">Pay to college</button>
                    <button onClick={() => onEdit(s)} className="rounded-lg border border-white/10 p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => onDelete(s)} className="rounded-lg border border-white/10 p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div><div className="text-xs text-slate-500">Total</div><div className="mt-1 text-lg font-semibold text-white">{money(total)}</div></div>
                  <div><div className="text-xs text-slate-500">Paid to college</div><div className="mt-1 text-lg font-semibold text-emerald-300">{money(paid)}</div></div>
                  <div><div className="text-xs text-slate-500">Pending</div><div className="mt-1 text-lg font-semibold text-amber-300">{money(pending)}</div></div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
                {warn && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/5 px-4 py-2.5 text-xs text-amber-200">
                    <Sparkles size={13} /> Warning: {money(warn.amount)} across {warn.count} non-scholarship expenses from the receiving account since money arrived. Consider paying college first.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- Zopkit Form ---------------- */
function ZopkitForm({ open, onClose, onSaved, editing, toast }) {
  const initial = editing
    ? { ...editing, amount: String(editing.amount), time: editing.time?.slice(0, 5) || new Date().toTimeString().slice(0, 5) }
    : { type: 'expense', amount: '', description: '', category: 'tools/subscriptions', date: todayISO(), time: new Date().toTimeString().slice(0, 5), added_by: 'self', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/zopkit_transactions/${editing.id}` : '/api/finance/zopkit_transactions'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push(editing ? 'Updated' : 'Logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }
  const cats = ['tools/subscriptions', 'team expenses', 'miscellaneous', 'other']
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit entry' : 'Log Zopkit transaction'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[{ v: 'expense', l: 'Expense', c: 'bg-rose-400/15 text-rose-200 border-rose-400/30' }, { v: 'income', l: 'Income (from CEO)', c: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' }].map((t) => (
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, added_by: t.v === 'income' ? 'ceo' : 'self' })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Amount
            <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="text-sm text-slate-300">Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Vercel subscription" />
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="text-sm text-slate-300">Date
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
            <label className="text-sm text-slate-300">Time
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-2 w-[110px] rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
            </label>
          </div>
          <label className="text-sm text-slate-300">Added by
            <select value={form.added_by} onChange={(e) => setForm({ ...form, added_by: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
              <option value="self">Self</option><option value="ceo">CEO</option>
            </select>
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save'}</button>
      </form>
    </div>
  )
}

/* ---------------- Zopkit View ---------------- */
function ZopkitView({ data, onAdd, onEdit, onDelete, showMoney }) {
  const { zopkit_transactions } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const monthTx = zopkit_transactions.filter((t) => { const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === monthKey })
  const monthIn = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const monthOut = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalIn = zopkit_transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalOut = zopkit_transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const balance = totalIn - totalOut

  const byCategory = {}
  monthTx.filter((t) => t.type === 'expense').forEach((t) => { const k = t.category || 'other'; byCategory[k] = (byCategory[k] || 0) + Number(t.amount || 0) })

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Startup ledger</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Zopkit finance</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Log</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={`In · ${now.toLocaleString('en-IN', { month: 'short' })}`} value={showMoney ? money(monthIn) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{monthTx.filter(t => t.type === 'income').length} entries</span>} />
        <StatCard label={`Out · ${now.toLocaleString('en-IN', { month: 'short' })}`} value={showMoney ? money(monthOut) : '••••'} icon={ArrowDownRight} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span className="text-rose-300">{monthTx.filter(t => t.type === 'expense').length} entries</span>} />
        <StatCard label="Net this month" value={showMoney ? money(monthIn - monthOut) : '••••'} icon={Target} accent="bg-cyan-400/15 text-cyan-200" sub={<span className={monthIn - monthOut >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{monthIn - monthOut >= 0 ? 'Positive' : 'Negative'}</span>} tone={monthIn - monthOut >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
        <StatCard label="Zopkit balance" value={showMoney ? money(balance) : '••••'} icon={Briefcase} accent="bg-violet-400/15 text-violet-200" sub={<span>All-time</span>} />
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-3 text-sm font-semibold text-white">This month by category</div>
          <div className="space-y-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
              const pct = monthOut > 0 ? Math.round((amt / monthOut) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize">{cat}</span><span className="text-white">{money(amt)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
        {zopkit_transactions.length === 0 ? (
          <EmptyState icon={Briefcase} title="No Zopkit entries yet" message="Log the money flowing through your startup — CEO transfers, tools, team ops." cta="Add first entry" onCta={onAdd} />
        ) : (
          <div className="divide-y divide-white/5">
            {zopkit_transactions.map((t) => (
              <div key={t.id} className="group grid grid-cols-[1.4fr_.9fr_.6fr_auto] items-center gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.type === 'income' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                    {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{t.description}</div>
                    <div className="text-[11px] text-slate-500">{t.category || 'other'} · by {t.added_by}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                <div className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>{showMoney ? (t.type === 'income' ? '+' : '-') + money(t.amount).replace('-', '') : '••••'}</div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => onEdit(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Money Rules View + Widget ---------------- */
function MoneyRulesWidget({ rules, onOpen }) {
  const active = rules.filter((r) => r.is_active).slice(0, 4)
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><Star size={15} /></div>
          <div className="text-sm font-semibold text-white">Money rules</div>
        </div>
        <button onClick={onOpen} className="text-xs text-cyan-300 hover:underline">Manage</button>
      </div>
      {active.length === 0 ? (
        <button onClick={onOpen} className="w-full rounded-xl border border-dashed border-white/10 py-4 text-sm text-slate-400 hover:bg-white/5">+ Add your first financial rule</button>
      ) : (
        <ul className="space-y-2">
          {active.map((r) => (<li key={r.id} className="flex items-start gap-2 text-sm text-slate-200"><span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-300" />{r.rule_text}</li>))}
        </ul>
      )}
    </div>
  )
}

function MoneyRulesView({ data, onAdd, onToggle, onEdit, onDelete }) {
  const { money_rules } = data
  const [text, setText] = useState('')
  const submit = async (e) => { e.preventDefault(); if (!text.trim()) return; await onAdd(text.trim()); setText('') }
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Your compass</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Money rules</h1>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Save 30% of every paycheck before spending" className="flex-1 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-white outline-none focus:border-cyan-300/50" />
        <button className="rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-5 py-3 text-sm font-semibold text-[#07101c]">+ Add</button>
      </form>
      {money_rules.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Star} title="No rules yet" message="Write down your personal money principles. They&apos;ll appear on the dashboard as a gentle reminder." />
        </div>
      ) : (
        <div className="space-y-2">
          {money_rules.map((r, i) => (
            <div key={r.id} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/15 text-xs font-semibold text-violet-200">{i + 1}</div>
              <div className={`flex-1 text-sm ${r.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>{r.rule_text}</div>
              <button onClick={() => onToggle(r)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${r.is_active ? 'bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25' : 'bg-white/[.06] text-slate-400 hover:bg-white/[.1]'}`}>{r.is_active ? 'Active' : 'Off'}</button>
              <button onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-rose-300/70 opacity-0 transition hover:bg-rose-300/10 group-hover:opacity-100"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Views ---------------- */
function DashboardView({ data, showMoney, onOpenTxForm, setView, onAddRule }) {
  const { accounts, transactions, categories, holdings = [], loans = [], bucket_list = [], money_rules = [] } = data
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const invested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
  const currentInv = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
  const pnl = currentInv - invested
  const totalOutstanding = loans.filter((l) => l.status !== 'closed').reduce((s, l) => s + Number(l.outstanding || 0), 0)
  const netWorth = totalBalance + currentInv - totalOutstanding
  // Monthly aggregation for last 6 months
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), income: 0, expense: 0 }) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket[t.type] += Number(t.amount || 0)
  })
  const thisMonth = months[months.length - 1]
  const savingsRate = thisMonth?.income > 0 ? Math.round(((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100) : 0
  const recent = transactions.slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net worth" value={showMoney ? money(netWorth) : '••••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />Cash + Investments − Debt</span>} icon={PiggyBank} accent="bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101c]" />
        <StatCard label={`Income · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.income || 0) : '••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />This month</span>} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200" />
        <StatCard label={`Expense · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.expense || 0) : '••••'} sub={<span className="flex items-center gap-1 text-rose-300"><ArrowDownRight size={13} />This month</span>} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" />
        <StatCard label="Savings rate" value={`${savingsRate}%`} sub={<span className={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'}>{savingsRate >= 20 ? 'Great pace' : 'Aim for 20%+'}</span>} icon={Target} accent="bg-violet-400/15 text-violet-200" tone={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

      {(holdings.length > 0 || loans.length > 0 || bucket_list.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {holdings.length > 0 && (
            <button onClick={() => setView('investments')} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Portfolio</span>
                <TrendingUp size={16} className="text-violet-300" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{showMoney ? money(currentInv) : '••••'}</div>
              <div className={`mt-1 text-xs ${pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pnl >= 0 ? '+' : '−'}{money(pnl).replace('-', '')} P&amp;L</div>
            </button>
          )}
          {loans.length > 0 && (
            <button onClick={() => setView('loans')} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Loans outstanding</span>
                <Briefcase size={16} className="text-amber-300" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{showMoney ? money(totalOutstanding) : '••••'}</div>
              <div className="mt-1 text-xs text-slate-500">{loans.filter((l) => l.status !== 'closed').length} active loan{loans.filter((l) => l.status !== 'closed').length === 1 ? '' : 's'}</div>
            </button>
          )}
          {bucket_list.length > 0 && (
            <button onClick={() => setView('bucket')} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:bg-white/[.06]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Bucket list</span>
                <Mountain size={16} className="text-cyan-300" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-white">{bucket_list.length} dream{bucket_list.length === 1 ? '' : 's'}</div>
              <div className="mt-1 text-xs text-slate-500">{bucket_list.filter((b) => b.status === 'saving').length} being saved for</div>
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Cash flow · last 6 months</div>
              <div className="text-xs text-slate-500">Income vs expense</div>
            </div>
            <BarChart3 size={16} className="text-slate-500" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => money(v)} />
                <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar dataKey="income" fill="#34d399" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#fb7185" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <MoneyRulesWidget rules={money_rules} onOpen={() => setView('rules')} />
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Your accounts</div>
                <div className="text-xs text-slate-500">Live balance</div>
              </div>
              <button onClick={() => setView('accounts')} className="text-xs text-cyan-300 hover:underline">Manage</button>
            </div>
            {accounts.length === 0 ? (
              <EmptyState icon={Landmark} title="No accounts yet" message="Add your first bank or wallet to start tracking." cta="Add account" onCta={() => setView('accounts')} />
            ) : (
              <div className="space-y-3">
                {accounts.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${a.color || '#22d3ee'}22`, color: a.color || '#22d3ee' }}>
                        {a.type === 'credit_card' ? <CreditCard size={16} /> : a.type === 'cash' || a.type === 'wallet' ? <Wallet size={16} /> : <Landmark size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{a.name}</div>
                        <div className="text-[11px] capitalize text-slate-500">{a.type.replace('_', ' ')}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white">{showMoney ? money(a.current_balance) : '••••'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-white">Recent transactions</div>
            <div className="text-xs text-slate-500">Latest activity across accounts</div>
          </div>
          <button onClick={() => setView('transactions')} className="text-xs text-cyan-300 hover:underline">See all</button>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions yet" message="Log your first income or expense to see it here." cta="Add transaction" onCta={onOpenTxForm} />
        ) : (
          <div className="divide-y divide-white/5 border-t border-white/10">
            {recent.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id)
              const acc = accounts.find((a) => a.id === t.account_id)
              const sign = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? '+' : '-'
              const color = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in') ? 'text-emerald-300' : t.type === 'transfer' ? 'text-cyan-300' : 'text-rose-300'
              return (
                <div key={t.id} className="grid grid-cols-[1.4fr_1fr_.7fr] items-center gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05]" style={{ color: cat?.color || '#94a3b8' }}>
                      {t.type === 'transfer' ? <ArrowLeftRight size={16} /> : t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.description}</div>
                      <div className="text-[11px] text-slate-500">{cat?.name || (t.type === 'transfer' ? 'Transfer' : 'Uncategorised')}{acc ? ` · ${acc.name}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                  <div className={`text-right text-sm font-semibold ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TransactionsView({ data, onOpenTxForm, onEditTx, onDeleteTx, onImport, showMoney }) {
  const { transactions, accounts, categories } = data
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [accountId, setAccountId] = useState('all')

  const visible = useMemo(() => transactions.filter((t) => {
    if (type !== 'all' && t.type !== type) return false
    if (accountId !== 'all' && t.account_id !== accountId) return false
    const q = query.toLowerCase()
    return `${t.description} ${t.notes || ''}`.toLowerCase().includes(q)
  }), [transactions, type, accountId, query])

  const exportCsv = () => {
    const csv = ['Date,Description,Type,Amount,Category,Account,Notes', ...visible.map((r) => {
      const cat = categories.find((c) => c.id === r.category_id)?.name || ''
      const acc = accounts.find((a) => a.id === r.account_id)?.name || ''
      return [r.date, JSON.stringify(r.description || ''), r.type, r.amount, JSON.stringify(cat), JSON.stringify(acc), JSON.stringify(r.notes || '')].join(',')
    })].join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'deepak-finance-transactions.csv'
    link.click(); URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Money movement</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Every rupee, accounted for</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onImport} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Import CSV</button>
          <button onClick={exportCsv} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Export CSV</button>
          <button onClick={onOpenTxForm} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add</button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className="w-full rounded-xl border border-white/10 bg-white/[.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-300/50" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/10 bg-[#101621] px-4 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option>
        </select>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-xl border border-white/10 bg-[#101621] px-4 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
          <span>Description</span><span>Category / Account</span><span>Date</span><span className="text-right">Amount</span><span />
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={Wallet} title="No transactions match" message="Try adjusting filters, or add your first entry." cta="Add transaction" onCta={onOpenTxForm} />
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id)
              const acc = accounts.find((a) => a.id === t.account_id)
              const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
              const isTransfer = t.type === 'transfer'
              const sign = isIn ? '+' : '-'
              const color = isIn ? 'text-emerald-300' : isTransfer ? 'text-cyan-300' : 'text-rose-300'
              return (
                <div key={t.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05]" style={{ color: cat?.color || (isTransfer ? '#22d3ee' : '#94a3b8') }}>
                      {isTransfer ? <ArrowLeftRight size={16} /> : isIn ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.description}</div>
                      {t.notes && <div className="text-[11px] text-slate-500">{t.notes}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5" style={{ color: cat?.color || '#94a3b8' }}>{cat?.name || (isTransfer ? (t.transfer_direction === 'in' ? 'Transfer in' : 'Transfer out') : 'Uncategorised')}</span>
                    {acc && <span className="ml-2">{acc.name}</span>}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(t.date, t.time)}</div>
                  <div className={`text-sm font-semibold sm:text-right ${color}`}>{showMoney ? `${sign}${money(t.amount).replace('-', '')}` : '••••'}</div>
                  <div className="flex gap-1 sm:justify-end">
                    <button onClick={() => onEditTx(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDeleteTx(t)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function AccountsView({ data, onAdd, onEdit, onDelete, showMoney }) {
  const { accounts } = data
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Where the money lives</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Accounts</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add account</button>
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Landmark} title="No accounts yet" message="Add a bank, wallet or startup account to start tracking balances." cta="Add account" onCta={onAdd} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${a.color || '#22d3ee'}22`, color: a.color || '#22d3ee' }}>
                  {a.type === 'credit_card' ? <CreditCard size={18} /> : a.type === 'cash' || a.type === 'wallet' ? <Wallet size={18} /> : <Landmark size={18} />}
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => onEdit(a)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(a)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-sm font-semibold text-white">{a.name}</div>
                <div className="text-xs capitalize text-slate-500">{a.type.replace('_', ' ')}{a.bank_name ? ` · ${a.bank_name}` : ''}{a.account_number_last4 ? ` · •${a.account_number_last4}` : ''}</div>
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{showMoney ? money(a.current_balance) : '••••••'}</div>
              <div className="mt-1 text-[11px] text-slate-500">Opening {money(a.opening_balance)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoriesView({ data, onAdd, onEdit, onDelete }) {
  const { categories } = data
  const grouped = { income: categories.filter((c) => c.type === 'income'), expense: categories.filter((c) => c.type === 'expense') }
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Group your spending</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Categories</h1>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add category</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {['income', 'expense'].map((k) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold capitalize text-white">{k}</div>
              <div className="text-xs text-slate-500">{grouped[k].length}</div>
            </div>
            {grouped[k].length === 0 ? <div className="py-6 text-center text-sm text-slate-500">No {k} categories yet.</div> : (
              <div className="space-y-2">
                {grouped[k].map((c) => (
                  <div key={c.id} className="group flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg" style={{ background: `${c.color || '#94a3b8'}22`, color: c.color }} />
                      <div className="text-sm text-white">{c.name}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => onEdit(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(c)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsView({ data }) {
  const { transactions, categories } = data
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === monthKey && t.type !== 'transfer'
  })
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const savings = income - expense
  const rate = income > 0 ? Math.round((savings / income) * 100) : 0

  // Top expense categories
  const byCat = {}
  monthTx.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'uncat'
    byCat[key] = (byCat[key] || 0) + Number(t.amount || 0)
  })
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, value]) => {
    const cat = categories.find((c) => c.id === id)
    return { name: cat?.name || 'Uncategorised', value, color: cat?.color || '#64748b' }
  })

  const insights = []
  if (income > 0) {
    if (rate >= 30) insights.push({ tone: 'good', text: `Impressive! You're saving ${rate}% of your income this month — well above the 20% benchmark.` })
    else if (rate >= 20) insights.push({ tone: 'good', text: `Solid month — you're saving ${rate}% of your income.` })
    else if (rate >= 0) insights.push({ tone: 'warn', text: `Only ${rate}% saved so far this month. Try to trim one variable expense category.` })
    else insights.push({ tone: 'warn', text: `You've spent more than you earned this month. Review your top category below.` })
  }
  if (topCats[0]) insights.push({ tone: 'info', text: `Biggest expense category: ${topCats[0].name} at ${money(topCats[0].value)}.` })
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysPassed = now.getDate()
  if (expense > 0) insights.push({ tone: 'info', text: `Daily burn: ${money(Math.round(expense / daysPassed))} · projected month ${money(Math.round((expense / daysPassed) * daysInMonth))}.` })

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Smart spending</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Insights · {now.toLocaleString('en-IN', { month: 'long' })}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Income this month" value={money(income)} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{monthTx.filter(t => t.type === 'income').length} entries</span>} />
        <StatCard label="Expenses this month" value={money(expense)} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span className="text-rose-300">{monthTx.filter(t => t.type === 'expense').length} entries</span>} />
        <StatCard label="Savings" value={money(savings)} icon={PiggyBank} accent="bg-cyan-300/15 text-cyan-200" sub={<span className={rate >= 20 ? 'text-emerald-300' : 'text-amber-300'}>{rate}% of income</span>} tone={rate >= 20 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Where money goes</div>
          {topCats.length === 0 ? (
            <EmptyState icon={Tag} title="No expense data" message="Log a few expenses to see your top categories." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} stroke="none">
                    {topCats.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f1420', border: '1px solid #ffffff22', borderRadius: 12, color: '#fff' }} formatter={(v) => money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 text-sm font-semibold text-white">Smart insights</div>
          {insights.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing to analyse yet" message="Log a few transactions this month and we'll surface patterns." />
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${ins.tone === 'good' ? 'border-emerald-400/25 bg-emerald-500/5 text-emerald-100' : ins.tone === 'warn' ? 'border-amber-400/25 bg-amber-500/5 text-amber-100' : 'border-cyan-400/20 bg-cyan-400/5 text-cyan-100'}`}>
                  <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
                  <div>{ins.text}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-widest text-slate-500">Top categories</div>
            {topCats.length === 0 ? <div className="text-sm text-slate-500">No expense categories yet.</div> : topCats.map((c) => {
              const pct = expense > 0 ? Math.round((c.value / expense) * 100) : 0
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{c.name}</span><span className="text-white">{money(c.value)} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Shell (nav + main) ---------------- */
function Shell({ user, onLogout }) {
  const [view, setView] = useState('dashboard')
  const [showMoney, setShowMoney] = useState(true)
  const [data, setData] = useState({ accounts: [], categories: [], transactions: [], budgets: [], portfolios: [], holdings: [], sips: [], loans: [], loan_payments: [], bucket_list: [], lend_borrow: [], lend_repayments: [], credit_cards: [], credit_card_transactions: [], scholarships: [], scholarship_payments: [], zopkit_transactions: [], money_rules: [], profile: null })
  const [loading, setLoading] = useState(true)

  const toast = useToast()

  const [txFormOpen, setTxFormOpen] = useState(false)
  const [txEditing, setTxEditing] = useState(null)
  const [accFormOpen, setAccFormOpen] = useState(false)
  const [accEditing, setAccEditing] = useState(null)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [catEditing, setCatEditing] = useState(null)
  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const [budgetEditing, setBudgetEditing] = useState(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [portfolioFormOpen, setPortfolioFormOpen] = useState(false)
  const [portfolioEditing, setPortfolioEditing] = useState(null)
  const [holdingFormOpen, setHoldingFormOpen] = useState(false)
  const [holdingEditing, setHoldingEditing] = useState(null)
  const [holdingDefaultPortfolio, setHoldingDefaultPortfolio] = useState('')
  const [loanFormOpen, setLoanFormOpen] = useState(false)
  const [loanEditing, setLoanEditing] = useState(null)
  const [loanPayOpen, setLoanPayOpen] = useState(false)
  const [loanPayLoan, setLoanPayLoan] = useState(null)
  const [bucketFormOpen, setBucketFormOpen] = useState(false)
  const [bucketEditing, setBucketEditing] = useState(null)
  const [lendFormOpen, setLendFormOpen] = useState(false)
  const [lendEditing, setLendEditing] = useState(null)
  const [fundsFormOpen, setFundsFormOpen] = useState(false)
  const [fundsPortfolio, setFundsPortfolio] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [cardEditing, setCardEditing] = useState(null)
  const [cardSpendOpen, setCardSpendOpen] = useState(false)
  const [cardSpendTarget, setCardSpendTarget] = useState(null)
  const [cardPayOpen, setCardPayOpen] = useState(false)
  const [cardPayTarget, setCardPayTarget] = useState(null)
  const [scholarshipFormOpen, setScholarshipFormOpen] = useState(false)
  const [scholarshipEditing, setScholarshipEditing] = useState(null)
  const [scholarshipPayOpen, setScholarshipPayOpen] = useState(false)
  const [scholarshipPayTarget, setScholarshipPayTarget] = useState(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [zopkitFormOpen, setZopkitFormOpen] = useState(false)
  const [zopkitEditing, setZopkitEditing] = useState(null)

  const refresh = async () => {
    try {
      const response = await fetch('/api/finance/summary')
      if (!response.ok) throw new Error('Failed to load')
      const result = await response.json()
      setData({
        accounts: result.accounts || [], categories: result.categories || [], transactions: result.transactions || [], budgets: result.budgets || [],
        portfolios: result.portfolios || [], holdings: result.holdings || [], sips: result.sips || [],
        loans: result.loans || [], loan_payments: result.loan_payments || [], bucket_list: result.bucket_list || [],
        lend_borrow: result.lend_borrow || [], lend_repayments: result.lend_repayments || [],
        credit_cards: result.credit_cards || [], credit_card_transactions: result.credit_card_transactions || [],
        scholarships: result.scholarships || [], scholarship_payments: result.scholarship_payments || [],
        zopkit_transactions: result.zopkit_transactions || [], money_rules: result.money_rules || [],
        profile: result.profile || null,
      })
    } catch (e) {
      toast.push(e.message || 'Could not load data', 'error')
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const openTxForm = (t = null) => { setTxEditing(t); setTxFormOpen(true) }
  const closeTxForm = () => { setTxFormOpen(false); setTxEditing(null) }
  const onTxSaved = async () => { closeTxForm(); await refresh() }

  const openAccForm = (a = null) => { setAccEditing(a); setAccFormOpen(true) }
  const closeAccForm = () => { setAccFormOpen(false); setAccEditing(null) }
  const onAccSaved = async () => { closeAccForm(); await refresh() }

  const openCatForm = (c = null) => { setCatEditing(c); setCatFormOpen(true) }
  const closeCatForm = () => { setCatFormOpen(false); setCatEditing(null) }
  const onCatSaved = async () => { closeCatForm(); await refresh() }

  const openBudgetForm = (b = null) => { setBudgetEditing(b); setBudgetFormOpen(true) }
  const closeBudgetForm = () => { setBudgetFormOpen(false); setBudgetEditing(null) }
  const onBudgetSaved = async () => { closeBudgetForm(); await refresh() }

  const deleteBudget = async (b) => {
    if (!window.confirm('Delete this budget?')) return
    const response = await fetch(`/api/finance/budgets/${b.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Budget deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Investments
  const openPortfolioForm = (p = null) => { setPortfolioEditing(p); setPortfolioFormOpen(true) }
  const closePortfolioForm = () => { setPortfolioFormOpen(false); setPortfolioEditing(null) }
  const onPortfolioSaved = async () => { closePortfolioForm(); await refresh() }
  const openHoldingForm = (portfolioId = '') => { setHoldingEditing(null); setHoldingDefaultPortfolio(portfolioId); setHoldingFormOpen(true) }
  const openHoldingEdit = (h) => { setHoldingEditing(h); setHoldingFormOpen(true) }
  const closeHoldingForm = () => { setHoldingFormOpen(false); setHoldingEditing(null) }
  const onHoldingSaved = async () => { closeHoldingForm(); await refresh() }
  const deletePortfolio = async (p) => {
    if (!window.confirm(`Delete portfolio "${p.name}"? Its holdings will be removed too.`)) return
    const response = await fetch(`/api/finance/portfolios/${p.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Portfolio deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteHolding = async (h) => {
    if (!window.confirm(`Remove ${h.symbol}?`)) return
    const response = await fetch(`/api/finance/holdings/${h.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Holding removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const refreshHoldingPrice = async (h) => {
    const price = window.prompt(`Update current price for ${h.symbol}`, String(h.current_price || h.avg_buy_price))
    if (!price) return
    const response = await fetch(`/api/finance/holdings/${h.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_price: Number(price), last_price_updated_at: new Date().toISOString() }) })
    if (response.ok) { toast.push(`${h.symbol} updated`); await refresh() } else { toast.push('Update failed', 'error') }
  }

  // Loans
  const openLoanForm = (l = null) => { setLoanEditing(l); setLoanFormOpen(true) }
  const closeLoanForm = () => { setLoanFormOpen(false); setLoanEditing(null) }
  const onLoanSaved = async () => { closeLoanForm(); await refresh() }
  const openLoanPay = (loan) => { setLoanPayLoan(loan); setLoanPayOpen(true) }
  const closeLoanPay = () => { setLoanPayOpen(false); setLoanPayLoan(null) }
  const onLoanPaid = async () => { closeLoanPay(); await refresh() }
  const deleteLoan = async (l) => {
    if (!window.confirm(`Delete loan "${l.name}"? All payment records will be removed.`)) return
    const response = await fetch(`/api/finance/loans/${l.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Loan deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteLoanPayment = async (p) => {
    if (!window.confirm('Reverse this payment? The linked transaction and outstanding will restore.')) return
    const response = await fetch(`/api/finance/loan_payments/${p.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Payment reversed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Bucket list
  const openBucketForm = (b = null) => { setBucketEditing(b); setBucketFormOpen(true) }
  const closeBucketForm = () => { setBucketFormOpen(false); setBucketEditing(null) }
  const onBucketSaved = async () => { closeBucketForm(); await refresh() }
  const deleteBucket = async (b) => {
    if (!window.confirm(`Remove "${b.title}" from bucket list?`)) return
    const response = await fetch(`/api/finance/bucket_list/${b.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Lend/Borrow
  const openLendForm = (l = null) => { setLendEditing(l); setLendFormOpen(true) }
  const closeLendForm = () => { setLendFormOpen(false); setLendEditing(null) }
  const onLendSaved = async () => { closeLendForm(); await refresh() }
  const deleteLend = async (l) => {
    if (!window.confirm(`Delete record for ${l.person_name}? Linked transaction (if any) will be removed too.`)) return
    const response = await fetch(`/api/finance/lend_borrow/${l.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Portfolio funds
  const openFundsForm = (p) => { setFundsPortfolio(p); setFundsFormOpen(true) }
  const closeFundsForm = () => { setFundsFormOpen(false); setFundsPortfolio(null) }
  const onFundsSaved = async () => { closeFundsForm(); await refresh() }

  // Profile
  const onSaveProfile = async (payload) => {
    const response = await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (response.ok) { toast.push('Profile saved'); await refresh() } else { toast.push('Could not save', 'error') }
  }
  useEffect(() => { if (data.profile?.theme) setTheme(data.profile.theme) }, [data.profile])
  const onThemeChange = async (t) => { setTheme(t); await fetch('/api/finance/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: t }) }); toast.push(`Theme: ${t}`, 'info') }

  // Credit cards
  const openCardForm = (c = null) => { setCardEditing(c); setCardFormOpen(true) }
  const closeCardForm = () => { setCardFormOpen(false); setCardEditing(null) }
  const onCardSaved = async () => { closeCardForm(); await refresh() }
  const deleteCard = async (c) => {
    if (!window.confirm(`Delete card "${c.name}"? All linked spends will be removed.`)) return
    const response = await fetch(`/api/finance/credit_cards/${c.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Card deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openCardSpend = (c) => { setCardSpendTarget(c); setCardSpendOpen(true) }
  const closeCardSpend = () => { setCardSpendOpen(false); setCardSpendTarget(null) }
  const onCardSpendSaved = async () => { closeCardSpend(); await refresh() }
  const openCardPay = (c) => { setCardPayTarget(c); setCardPayOpen(true) }
  const closeCardPay = () => { setCardPayOpen(false); setCardPayTarget(null) }
  const onCardPaid = async () => { closeCardPay(); await refresh() }
  const deleteCardSpend = async (t) => {
    if (!window.confirm('Delete this spend?')) return
    const response = await fetch(`/api/finance/credit_card_transactions/${t.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Spend removed'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Scholarships
  const openScholarshipForm = (s = null) => { setScholarshipEditing(s); setScholarshipFormOpen(true) }
  const closeScholarshipForm = () => { setScholarshipFormOpen(false); setScholarshipEditing(null) }
  const onScholarshipSaved = async () => { closeScholarshipForm(); await refresh() }
  const deleteScholarship = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? Linked payments will be removed.`)) return
    const response = await fetch(`/api/finance/scholarships/${s.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const openScholarshipPay = (s) => { setScholarshipPayTarget(s); setScholarshipPayOpen(true) }
  const closeScholarshipPay = () => { setScholarshipPayOpen(false); setScholarshipPayTarget(null) }
  const onScholarshipPaid = async () => { closeScholarshipPay(); await refresh() }

  // Live prices refresh
  const refreshAllPrices = async () => {
    if (data.holdings.length === 0) return
    setPricesLoading(true)
    try {
      const symbols = data.holdings.map((h) => ({ symbol: h.symbol, exchange: h.exchange }))
      const response = await fetch('/api/finance/prices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbols }) })
      const result = await response.json()
      const updated = Object.keys(result.prices || {}).length
      toast.push(`Refreshed ${updated} price${updated === 1 ? '' : 's'}${result.kite_active ? ' via Kite live' : ' via Yahoo'}`, updated ? 'success' : 'info')
      await refresh()
    } catch (e) { toast.push('Price fetch failed', 'error') } finally { setPricesLoading(false) }
  }

  // Zopkit
  const openZopkitForm = (t = null) => { setZopkitEditing(t); setZopkitFormOpen(true) }
  const closeZopkitForm = () => { setZopkitFormOpen(false); setZopkitEditing(null) }
  const onZopkitSaved = async () => { closeZopkitForm(); await refresh() }
  const deleteZopkit = async (t) => {
    if (!window.confirm('Delete this Zopkit entry?')) return
    const response = await fetch(`/api/finance/zopkit_transactions/${t.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  // Money rules
  const addRule = async (rule_text) => {
    const nextOrder = (data.money_rules?.[data.money_rules.length - 1]?.order_index ?? 0) + 1
    const response = await fetch('/api/finance/money_rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rule_text, order_index: nextOrder, is_active: true }) })
    if (response.ok) { toast.push('Rule added'); await refresh() } else { toast.push('Could not add', 'error') }
  }
  const toggleRule = async (r) => {
    const response = await fetch(`/api/finance/money_rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !r.is_active }) })
    if (response.ok) await refresh()
  }
  const deleteRule = async (r) => {
    if (!window.confirm(`Delete rule "${r.rule_text}"?`)) return
    const response = await fetch(`/api/finance/money_rules/${r.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Rule deleted'); await refresh() }
  }
  const connectKite = () => { window.location.href = '/api/kite/login' }

  const deleteTx = async (t) => {
    if (!window.confirm('Delete this transaction? Balances will be recomputed.')) return
    const response = await fetch(`/api/finance/transactions/${t.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Transaction deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteAccount = async (a) => {
    if (!window.confirm(`Delete "${a.name}"? Its transactions stay but lose the account link.`)) return
    const response = await fetch(`/api/finance/accounts/${a.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Account deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }
  const deleteCategory = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return
    const response = await fetch(`/api/finance/categories/${c.id}`, { method: 'DELETE' })
    if (response.ok) { toast.push('Category deleted'); await refresh() } else { toast.push('Delete failed', 'error') }
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || 'Deepak'

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'transactions', label: 'Transactions', icon: BarChart3 },
    { key: 'accounts', label: 'Accounts', icon: Landmark },
    { key: 'cards', label: 'Credit cards', icon: CreditCard },
    { key: 'investments', label: 'Investments', icon: TrendingUp },
    { key: 'loans', label: 'Loans', icon: Briefcase },
    { key: 'lend', label: 'Lend / Borrow', icon: Heart },
    { key: 'scholarships', label: 'Scholarships', icon: ShieldCheck },
    { key: 'budgets', label: 'Budgets', icon: Target },
    { key: 'bucket', label: 'Bucket list', icon: Mountain },
    { key: 'zopkit', label: 'Zopkit', icon: Rocket },
    { key: 'rules', label: 'Money rules', icon: Star },
    { key: 'insights', label: 'Insights', icon: LineChart },
    { key: 'profile', label: 'Profile', icon: Sparkles },
  ]
  const bottomNav = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { key: 'transactions', label: 'Ledger', icon: BarChart3 },
    { key: 'investments', label: 'Invest', icon: TrendingUp },
    { key: 'profile', label: 'You', icon: Sparkles },
  ]

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100">
      {toast.view}
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 px-5 py-6 lg:flex">
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-600 text-[#07101c]"><CircleDollarSign size={22} /></div>Deepak Finance
          </div>
          <nav className="mt-10 space-y-1">
            {nav.map((n) => (
              <button key={n.key} onClick={() => setView(n.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${view === n.key ? 'bg-white/[.06] text-white' : 'text-slate-400 hover:bg-white/[.04] hover:text-white'}`}>
                <n.icon size={17} />{n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.035] p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-white"><ShieldCheck size={14} className="text-emerald-300" />Secure session</div>
            <div className="mt-2 truncate">{user?.email}</div>
            <button onClick={onLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-slate-300 hover:bg-white/5"><LogOut size={13} />Sign out</button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-5 pb-24 pt-6 lg:px-10 lg:pb-10">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Welcome back</div>
              <div className="mt-1 text-xl font-semibold text-white">Hi, {firstName} 👋</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMoney((v) => !v)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
                {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={onLogout} className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5 lg:inline-flex"><LogOut size={13} className="mr-1" />Sign out</button>
            </div>
          </header>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
              <Skeleton className="col-span-full h-72" />
            </div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardView data={data} showMoney={showMoney} onOpenTxForm={() => openTxForm()} setView={setView} />}
              {view === 'transactions' && <TransactionsView data={data} onOpenTxForm={() => openTxForm()} onEditTx={openTxForm} onDeleteTx={deleteTx} onImport={() => setCsvOpen(true)} showMoney={showMoney} />}
              {view === 'accounts' && <AccountsView data={data} onAdd={() => openAccForm()} onEdit={openAccForm} onDelete={deleteAccount} showMoney={showMoney} />}
              {view === 'categories' && <CategoriesView data={data} onAdd={() => openCatForm()} onEdit={openCatForm} onDelete={deleteCategory} />}
              {view === 'categories' && <CategoriesView data={data} onAdd={() => openCatForm()} onEdit={openCatForm} onDelete={deleteCategory} />}
              {view === 'budgets' && <BudgetsView data={data} onAdd={() => openBudgetForm()} onEdit={openBudgetForm} onDelete={deleteBudget} />}
              {view === 'investments' && <InvestmentsView data={data} onAddPortfolio={() => openPortfolioForm()} onEditPortfolio={openPortfolioForm} onDeletePortfolio={deletePortfolio} onAddHolding={openHoldingForm} onEditHolding={openHoldingEdit} onDeleteHolding={deleteHolding} onRefreshPrice={refreshHoldingPrice} onRefreshAll={refreshAllPrices} pricesLoading={pricesLoading} onAddFunds={openFundsForm} onConnectKite={connectKite} showMoney={showMoney} />}
              {view === 'cards' && <CreditCardsView data={data} onAdd={() => openCardForm()} onEdit={openCardForm} onDelete={deleteCard} onSpend={openCardSpend} onPay={openCardPay} onDeleteSpend={deleteCardSpend} showMoney={showMoney} />}
              {view === 'scholarships' && <ScholarshipsView data={data} onAdd={() => openScholarshipForm()} onEdit={openScholarshipForm} onDelete={deleteScholarship} onPay={openScholarshipPay} showMoney={showMoney} />}
              {view === 'zopkit' && <ZopkitView data={data} onAdd={() => openZopkitForm()} onEdit={openZopkitForm} onDelete={deleteZopkit} showMoney={showMoney} />}
              {view === 'rules' && <MoneyRulesView data={data} onAdd={addRule} onToggle={toggleRule} onEdit={() => {}} onDelete={deleteRule} />}
              {view === 'loans' && <LoansView data={data} onAdd={() => openLoanForm()} onEdit={openLoanForm} onDelete={deleteLoan} onPay={openLoanPay} onDeletePayment={deleteLoanPayment} showMoney={showMoney} />}
              {view === 'lend' && <LendBorrowView data={data} onAdd={() => openLendForm()} onEdit={openLendForm} onDelete={deleteLend} showMoney={showMoney} />}
              {view === 'bucket' && <BucketListView data={data} onAdd={() => openBucketForm()} onEdit={openBucketForm} onDelete={deleteBucket} />}
              {view === 'insights' && <InsightsView data={data} />}
              {view === 'profile' && <ProfileView data={data} user={user} theme={theme} onThemeChange={onThemeChange} onSaveProfile={onSaveProfile} onAddCategory={() => openCatForm()} onEditCategory={openCatForm} onDeleteCategory={deleteCategory} />}
            </>
          )}
        </main>
      </div>

      {/* Floating quick add */}
      <button onClick={() => openTxForm()} className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101c] shadow-2xl shadow-cyan-500/30 transition hover:scale-105 lg:bottom-8 lg:right-8" title="Quick add transaction">
        <Plus size={24} />
      </button>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0b0f18]/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {bottomNav.map((n) => (
            <button key={n.key} onClick={() => setView(n.key)} className={`flex flex-col items-center gap-1 py-3 text-[11px] ${view === n.key ? 'text-cyan-300' : 'text-slate-500'}`}>
              <n.icon size={18} />{n.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <TransactionForm open={txFormOpen} onClose={closeTxForm} onSaved={onTxSaved} editing={txEditing} accounts={data.accounts} categories={data.categories} lendBorrow={data.lend_borrow} onAddAccount={() => { closeTxForm(); openAccForm() }} toast={toast} />
      <AccountForm open={accFormOpen} onClose={closeAccForm} onSaved={onAccSaved} editing={accEditing} toast={toast} />
      <CategoryForm open={catFormOpen} onClose={closeCatForm} onSaved={onCatSaved} editing={catEditing} toast={toast} />
      <BudgetForm open={budgetFormOpen} onClose={closeBudgetForm} onSaved={onBudgetSaved} editing={budgetEditing} categories={data.categories} toast={toast} />
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} onImported={async () => { setCsvOpen(false); await refresh() }} accounts={data.accounts} categories={data.categories} toast={toast} />
      <PortfolioForm open={portfolioFormOpen} onClose={closePortfolioForm} onSaved={onPortfolioSaved} editing={portfolioEditing} accounts={data.accounts} toast={toast} />
      <HoldingForm open={holdingFormOpen} onClose={closeHoldingForm} onSaved={onHoldingSaved} editing={holdingEditing} portfolios={data.portfolios} defaultPortfolioId={holdingDefaultPortfolio} toast={toast} />
      <LoanForm open={loanFormOpen} onClose={closeLoanForm} onSaved={onLoanSaved} editing={loanEditing} accounts={data.accounts} toast={toast} />
      <LoanPaymentForm open={loanPayOpen} onClose={closeLoanPay} onSaved={onLoanPaid} loan={loanPayLoan} accounts={data.accounts} toast={toast} />
      <BucketForm open={bucketFormOpen} onClose={closeBucketForm} onSaved={onBucketSaved} editing={bucketEditing} toast={toast} />
      <LendForm open={lendFormOpen} onClose={closeLendForm} onSaved={onLendSaved} editing={lendEditing} accounts={data.accounts} toast={toast} />
      <PortfolioFundsForm open={fundsFormOpen} onClose={closeFundsForm} onSaved={onFundsSaved} portfolio={fundsPortfolio} accounts={data.accounts} toast={toast} />
      <CreditCardForm open={cardFormOpen} onClose={closeCardForm} onSaved={onCardSaved} editing={cardEditing} toast={toast} />
      <CardSpendForm open={cardSpendOpen} onClose={closeCardSpend} onSaved={onCardSpendSaved} card={cardSpendTarget} categories={data.categories} toast={toast} />
      <CardPayForm open={cardPayOpen} onClose={closeCardPay} onSaved={onCardPaid} card={cardPayTarget} accounts={data.accounts} toast={toast} />
      <ScholarshipForm open={scholarshipFormOpen} onClose={closeScholarshipForm} onSaved={onScholarshipSaved} editing={scholarshipEditing} accounts={data.accounts} toast={toast} />
      <ScholarshipPayForm open={scholarshipPayOpen} onClose={closeScholarshipPay} onSaved={onScholarshipPaid} scholarship={scholarshipPayTarget} accounts={data.accounts} toast={toast} />
      <ZopkitForm open={zopkitFormOpen} onClose={closeZopkitForm} onSaved={onZopkitSaved} editing={zopkitEditing} toast={toast} />
    </div>
  )
}

/* ---------------- Root ---------------- */
function App() {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : { user: null }).then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])
  if (user === undefined) return <div className="flex min-h-screen items-center justify-center bg-[#080b12] text-sm text-slate-500">Loading your financial space…</div>
  if (!user) return <AuthScreen onAuth={setUser} />
  return <Shell user={user} onLogout={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null) }} />
}

export default App
