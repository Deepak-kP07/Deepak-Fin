'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, ChevronRight, CircleDollarSign, CreditCard,
  Eye, EyeOff, Landmark, LayoutDashboard, LogOut, Menu, PiggyBank, Plus, Search, ShieldCheck, Sparkles,
  Tag, Target, TrendingDown, TrendingUp, Wallet, X, Zap, Trash2, Pencil, LineChart, ListChecks,
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
function TransactionForm({ open, onClose, onSaved, editing, accounts, categories, toast }) {
  const now = todayISO()
  const initial = useMemo(() => {
    if (editing) return { ...editing, amount: String(editing.amount), to_account_id: '' }
    return { type: 'expense', amount: '', description: '', date: now, account_id: accounts[0]?.id || '', to_account_id: '', category_id: '', notes: '' }
  }, [editing, open])
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [initial])

  if (!open) return null
  const catsForType = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))

  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/transactions/${editing.id}` : '/api/finance/transactions'
      const payload = { ...form, amount: Number(form.amount) }
      if (payload.type !== 'transfer') delete payload.to_account_id
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
            <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v, category_id: t.v === 'transfer' ? '' : (categories.find((c) => c.type === (t.v === 'income' ? 'income' : 'expense'))?.id || '') })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === t.v ? t.c : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Amount
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="0.00" />
          </label>
          <label className="text-sm text-slate-300">Date
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
          </label>

          <label className="text-sm text-slate-300">{form.type === 'transfer' ? 'From account' : 'Account'}
            <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
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

          <label className="text-sm text-slate-300 sm:col-span-2">Description
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder={form.type === 'income' ? 'e.g. Salary credit' : form.type === 'transfer' ? 'e.g. Moved to savings' : 'e.g. Groceries at BigBazaar'} />
          </label>
          <label className="text-sm text-slate-300 sm:col-span-2">Notes
            <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="Optional context" />
          </label>
        </div>

        <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">
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

/* ---------------- Views ---------------- */
function DashboardView({ data, showMoney, onOpenTxForm, setView }) {
  const { accounts, transactions, categories } = data
  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
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
        <StatCard label="Net worth" value={showMoney ? money(totalBalance) : '••••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</span>} icon={PiggyBank} accent="bg-gradient-to-br from-cyan-300 to-blue-500 text-[#07101c]" />
        <StatCard label={`Income · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.income || 0) : '••••'} sub={<span className="flex items-center gap-1"><ArrowUpRight size={13} />This month</span>} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200" />
        <StatCard label={`Expense · ${thisMonth?.label || ''}`} value={showMoney ? money(thisMonth?.expense || 0) : '••••'} sub={<span className="flex items-center gap-1 text-rose-300"><ArrowDownRight size={13} />This month</span>} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" />
        <StatCard label="Savings rate" value={`${savingsRate}%`} sub={<span className={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'}>{savingsRate >= 20 ? 'Great pace' : 'Aim for 20%+'}</span>} icon={Target} accent="bg-violet-400/15 text-violet-200" tone={savingsRate >= 20 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

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
                  <div className="text-xs text-slate-500">{formatDate(t.date)}</div>
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
                  <div className="text-xs text-slate-500">{formatDate(t.date)}</div>
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
  const [data, setData] = useState({ accounts: [], categories: [], transactions: [], budgets: [] })
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

  const refresh = async () => {
    try {
      const response = await fetch('/api/finance/summary')
      if (!response.ok) throw new Error('Failed to load')
      const result = await response.json()
      setData({ accounts: result.accounts || [], categories: result.categories || [], transactions: result.transactions || [], budgets: result.budgets || [] })
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
    { key: 'categories', label: 'Categories', icon: Tag },
    { key: 'budgets', label: 'Budgets', icon: Target },
    { key: 'insights', label: 'Insights', icon: LineChart },
  ]
  const bottomNav = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { key: 'transactions', label: 'Ledger', icon: BarChart3 },
    { key: 'insights', label: 'Insights', icon: LineChart },
    { key: 'accounts', label: 'Accounts', icon: Landmark },
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
              {view === 'budgets' && <BudgetsView data={data} onAdd={() => openBudgetForm()} onEdit={openBudgetForm} onDelete={deleteBudget} />}
              {view === 'insights' && <InsightsView data={data} />}
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
      <TransactionForm open={txFormOpen} onClose={closeTxForm} onSaved={onTxSaved} editing={txEditing} accounts={data.accounts} categories={data.categories} toast={toast} />
      <AccountForm open={accFormOpen} onClose={closeAccForm} onSaved={onAccSaved} editing={accEditing} toast={toast} />
      <CategoryForm open={catFormOpen} onClose={closeCatForm} onSaved={onCatSaved} editing={catEditing} toast={toast} />
      <BudgetForm open={budgetFormOpen} onClose={closeBudgetForm} onSaved={onBudgetSaved} editing={budgetEditing} categories={data.categories} toast={toast} />
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} onImported={async () => { setCsvOpen(false); await refresh() }} accounts={data.accounts} categories={data.categories} toast={toast} />
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
