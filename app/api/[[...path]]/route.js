import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRouteClient, applyCookies } from '@/lib/supabase/server'
import { calcEmi, projectSchedule, totalInterest, accrueInterest, daysBetween } from '@/lib/amortization'

function handleCORS(response, cookiesToSet = []) {
  applyCookies(response, cookiesToSet)
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

async function currentUser(supabase) {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

const safeFields = {
  accounts: ['name', 'type', 'bank_name', 'account_number_last4', 'opening_balance', 'currency', 'color', 'icon', 'is_active', 'linked_account_id'],
  categories: ['name', 'type', 'icon', 'color', 'is_default'],
  transactions: ['account_id', 'category_id', 'amount', 'type', 'description', 'date', 'time', 'notes', 'linked_module', 'linked_module_id', 'transfer_group_id', 'transfer_direction', 'attachment_path', 'attachment_name'],
  recurring_transactions: ['account_id', 'category_id', 'type', 'amount', 'description', 'notes', 'frequency', 'day_of_month', 'next_due_date', 'is_active'],
  budgets: ['category_id', 'amount', 'period', 'start_date'],
  portfolios: ['name', 'broker', 'demat_account_id', 'cash_balance'],
  holdings: ['portfolio_id', 'symbol', 'exchange', 'company_name', 'qty', 'avg_buy_price', 'current_price', 'last_price_updated_at'],
  sips: ['fund_name', 'folio_number', 'monthly_amount', 'start_date', 'units_held', 'nav', 'current_value'],
  loans: ['name', 'lender', 'principal', 'interest_rate', 'tenure_months', 'emi_amount', 'start_date', 'total_interest', 'status', 'paid_from_account_id', 'outstanding', 'interest_saved', 'emi_due_day'],
  loan_payments: ['loan_id', 'amount', 'type', 'payment_date', 'account_id', 'interest_saved', 'interest_portion', 'prepay_mode', 'outstanding_before', 'emi_before', 'linked_transaction_id', 'notes'],
  bucket_list: ['title', 'estimated_cost', 'priority', 'target_date', 'status', 'notes'],
  lend_borrow: ['person_name', 'type', 'amount', 'date', 'due_date', 'from_account_id', 'reason', 'status', 'notes'],
  lend_repayments: ['lend_borrow_id', 'amount', 'date', 'account_id', 'linked_transaction_id', 'notes'],
  profiles: ['full_name', 'age', 'avatar_url', 'theme', 'currency', 'kite_access_token', 'kite_access_token_at'],
  credit_cards: ['name', 'bank', 'last4', 'credit_limit', 'billing_date', 'due_date_offset', 'current_outstanding', 'color'],
  credit_card_transactions: ['credit_card_id', 'amount', 'description', 'category_id', 'date', 'time', 'status', 'linked_transaction_id'],
  scholarships: ['name', 'total_amount', 'academic_year', 'source', 'status', 'received_date', 'due_date', 'received_to_account_id', 'amount_paid_to_college', 'notes'],
  scholarship_payments: ['scholarship_id', 'amount', 'paid_to', 'payment_date', 'account_id', 'notes'],
  zopkit_transactions: ['type', 'amount', 'description', 'category', 'date', 'time', 'added_by', 'notes'],
  money_rules: ['rule_text', 'icon', 'order_index', 'is_active'],
}

function pickFields(table, source) {
  return Object.fromEntries((safeFields[table] || []).filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

// Records a repayment against a lend/borrow record and bumps amount_repaid — used for
// both directions (income repaying money lent out, expense repaying money borrowed).
// Guarded against the record's own origination transaction (lend_borrow.linked_transaction_id)
// so editing/re-saving that transaction is never mistaken for a repayment.
async function applyLendRepayment(supabase, userId, transactionId, lendBorrowId, amount, extra) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb || lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_repayments').insert({ lend_borrow_id: lendBorrowId, user_id: userId, amount, linked_transaction_id: transactionId, ...extra })
  const newRepaid = Number(lb.amount_repaid || 0) + Number(amount)
  const newStatus = newRepaid >= Number(lb.amount) ? 'returned' : newRepaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount_repaid: newRepaid, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}

async function reverseLendRepayment(supabase, userId, transactionId, lendBorrowId, amount) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb || lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_repayments').delete().eq('linked_transaction_id', transactionId).eq('user_id', userId)
  const newRepaid = Math.max(0, Number(lb.amount_repaid || 0) - Number(amount))
  const newStatus = newRepaid >= Number(lb.amount) ? 'returned' : newRepaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount_repaid: newRepaid, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}

function applyOrder(query, table) {
  if (table === 'transactions' || table === 'credit_card_transactions' || table === 'zopkit_transactions') {
    return query.order('date', { ascending: false }).order('time', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  }
  if (table === 'lend_borrow' || table === 'lend_repayments') return query.order('date', { ascending: false })
  if (table === 'loan_payments' || table === 'scholarship_payments') return query.order('payment_date', { ascending: false })
  if (table === 'categories') return query.order('type', { ascending: true }).order('name', { ascending: true })
  if (table === 'money_rules') return query.order('order_index', { ascending: true }).order('created_at', { ascending: true })
  if (table === 'accounts' || table === 'portfolios' || table === 'holdings' || table === 'credit_cards') return query.order('created_at', { ascending: true })
  if (table === 'recurring_transactions') return query.order('next_due_date', { ascending: true })
  return query.order('created_at', { ascending: false })
}

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'wallet', color: '#34d399' },
  { name: 'Freelance', type: 'income', icon: 'briefcase', color: '#22d3ee' },
  { name: 'Interest', type: 'income', icon: 'trending-up', color: '#4ade80' },
  { name: 'Food & dining', type: 'expense', icon: 'utensils', color: '#fb7185' },
  { name: 'Home', type: 'expense', icon: 'home', color: '#f59e0b' },
  { name: 'Transport', type: 'expense', icon: 'car', color: '#60a5fa' },
  { name: 'Investment', type: 'expense', icon: 'trending-up', color: '#a78bfa' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#f472b6' },
  { name: 'Bills & utilities', type: 'expense', icon: 'zap', color: '#facc15' },
  { name: 'Health', type: 'expense', icon: 'heart', color: '#ef4444' },
  { name: 'Entertainment', type: 'expense', icon: 'music', color: '#c084fc' },
  { name: 'Loan / Debt', type: 'expense', icon: 'landmark', color: '#f97316' },
  { name: 'Loan / Debt', type: 'income', icon: 'landmark', color: '#f97316' },
  { name: 'Lended', type: 'expense', icon: 'heart', color: '#38bdf8' },
]

async function syncProfileFromAuth(supabase, user) {
  const meta = user.user_metadata || {}
  const googleAvatar = meta.avatar_url || meta.picture
  const googleName = meta.full_name || meta.name
  if (!googleAvatar && !googleName) return
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
  if (!profile) return
  const patch = {}
  if (!profile.avatar_url && googleAvatar) patch.avatar_url = googleAvatar
  if (!profile.full_name && googleName) patch.full_name = googleName
  if (Object.keys(patch).length > 0) {
    await supabase.from('profiles').update(patch).eq('id', user.id)
  }
}

async function ensureDefaults(supabase, userId) {
  const { data: existing } = await supabase.from('categories').select('id').eq('user_id', userId).limit(1)
  if (existing && existing.length > 0) return
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true }))
  await supabase.from('categories').insert(rows)
}

// Finds (or, for accounts predating this category, creates) a category by name — used to
// silently tag loan-payment transactions as "Loan / Debt" instead of leaving them Uncategorised,
// without needing the loan payment form to ask the user to pick one every time.
async function ensureCategory(supabase, userId, name, type) {
  const { data: existing } = await supabase.from('categories').select('id').eq('user_id', userId).eq('name', name).eq('type', type).maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase.from('categories').insert({ user_id: userId, name, type, icon: 'landmark', color: '#f97316', is_default: true }).select('id').maybeSingle()
  return created?.id || null
}

function addInterval(dateStr, frequency) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

// No cron/background-job infra exists in this app, so recurring rules (rent, salary, SIPs,
// subscriptions) are caught up lazily — every time the summary endpoint is hit, any rule whose
// next_due_date has already passed gets its missed occurrences generated as real transactions,
// stepping forward until it's caught up to today. Capped at 60 iterations per rule as a guard
// against a corrupted/very old next_due_date generating an unbounded backlog in one request.
async function generateDueRecurring(supabase, userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: due } = await supabase.from('recurring_transactions').select('*').eq('user_id', userId).eq('is_active', true).lte('next_due_date', today)
  if (!due || due.length === 0) return
  for (const rule of due) {
    let nextDue = rule.next_due_date
    let lastGenerated = rule.last_generated_date
    let guard = 0
    while (nextDue <= today && guard < 60) {
      await supabase.from('transactions').insert({
        user_id: userId, account_id: rule.account_id, category_id: rule.category_id, amount: rule.amount,
        type: rule.type, description: rule.description, date: nextDue, notes: rule.notes,
        recurring_source_id: rule.id,
      })
      lastGenerated = nextDue
      nextDue = addInterval(nextDue, rule.frequency)
      guard++
    }
    await supabase.from('recurring_transactions').update({ next_due_date: nextDue, last_generated_date: lastGenerated }).eq('id', rule.id).eq('user_id', userId)
  }
}

function randomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; const v = c === 'x' ? r : (r & 0x3) | 0x8; return v.toString(16)
  })
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  const { supabase, cookiesToSet } = getRouteClient(request)
  const cors = (response) => handleCORS(response, cookiesToSet)

  try {
    // ---- AUTH ROUTES ----
    if (route === '/auth/signup' && method === 'POST') {
      const body = await request.json()
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: { full_name: body.name || '' } },
      })
      if (error) return cors(NextResponse.json({ message: error.message }, { status: error.status || 400 }))
      return cors(NextResponse.json({ user: data.user, access_token: data.session?.access_token || null }))
    }
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
      if (error) return cors(NextResponse.json({ message: error.message }, { status: 400 }))
      return cors(NextResponse.json({ user: data.user }))
    }
    if (route === '/auth/me' && method === 'GET') {
      const user = await currentUser(supabase)
      if (user) {
        await ensureDefaults(supabase, user.id).catch(() => {})
        await syncProfileFromAuth(supabase, user).catch(() => {})
      }
      return cors(NextResponse.json({ user }, { status: user ? 200 : 401 }))
    }
    if (route === '/auth/logout' && method === 'POST') {
      await supabase.auth.signOut()
      return cors(NextResponse.json({ ok: true }))
    }
    // Google OAuth (PKCE) redirects here after Supabase's own /auth/v1/callback.
    if (route === '/auth/oauth_callback' && method === 'GET') {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const redirectUrl = new URL('/', url.origin)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) redirectUrl.searchParams.set('auth_error', error.message)
      } else {
        const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
        if (oauthError) redirectUrl.searchParams.set('auth_error', oauthError)
      }
      return applyCookies(NextResponse.redirect(redirectUrl), cookiesToSet)
    }

    // ---- FINANCE SUMMARY ----
    if (route === '/finance/summary' && method === 'GET') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      await ensureDefaults(supabase, user.id).catch(() => {})
      await generateDueRecurring(supabase, user.id).catch(() => {})
      const readAll = async (table) => {
        const { data } = await applyOrder(supabase.from(table).select('*').eq('user_id', user.id), table)
        return data || []
      }
      const [accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, credit_cards, credit_card_transactions, scholarships, scholarship_payments, zopkit_transactions, money_rules, recurring_transactions, profile] = await Promise.all([
        readAll('accounts'),
        readAll('categories'),
        readAll('transactions'),
        readAll('budgets'),
        readAll('portfolios'),
        readAll('holdings'),
        readAll('sips'),
        readAll('loans'),
        readAll('loan_payments'),
        readAll('bucket_list'),
        readAll('lend_borrow'),
        readAll('lend_repayments'),
        readAll('credit_cards'),
        readAll('credit_card_transactions'),
        readAll('scholarships'),
        readAll('scholarship_payments'),
        readAll('zopkit_transactions'),
        readAll('money_rules'),
        readAll('recurring_transactions'),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then((r) => r.data),
      ])
      return cors(NextResponse.json({ accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, credit_cards, credit_card_transactions, scholarships, scholarship_payments, zopkit_transactions, money_rules, recurring_transactions, profile }))
    }

    // ---- PRICES: Yahoo Finance fallback (public); Kite when creds set ----
    if (route === '/finance/prices' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const { symbols = [] } = await request.json()
      const kiteKey = process.env.KITE_API_KEY
      let kiteToken = process.env.KITE_ACCESS_TOKEN
      let kiteSource = 'env'
      const { data: profile } = await supabase.from('profiles').select('kite_access_token,kite_access_token_at').eq('id', user.id).maybeSingle()
      if (profile?.kite_access_token) {
        const issuedAt = profile.kite_access_token_at ? new Date(profile.kite_access_token_at) : null
        const now = new Date()
        const stillFresh = issuedAt && (now.getTime() - issuedAt.getTime() < 20 * 60 * 60 * 1000)
        if (stillFresh) { kiteToken = profile.kite_access_token; kiteSource = 'user' }
      }
      const out = {}
      let usedKite = false
      if (kiteKey && kiteToken && symbols.length > 0) {
        try {
          const params = symbols.map((s) => `i=${encodeURIComponent(s.exchange + ':' + s.symbol)}`).join('&')
          const kr = await fetch(`https://api.kite.trade/quote/ltp?${params}`, { headers: { 'X-Kite-Version': '3', Authorization: `token ${kiteKey}:${kiteToken}` }, cache: 'no-store' })
          if (kr.ok) {
            const kd = await kr.json()
            for (const s of symbols) {
              const key = `${s.exchange}:${s.symbol}`
              if (kd.data?.[key]?.last_price) { out[s.symbol] = { price: Number(kd.data[key].last_price), source: 'kite' }; usedKite = true }
            }
          }
        } catch (e) { /* fall through to yahoo */ }
      }
      await Promise.all(symbols.map(async (s) => {
        if (out[s.symbol]) return
        const suffix = s.exchange === 'BSE' ? '.BO' : '.NS'
        try {
          const yr = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol + suffix)}?interval=1d&range=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
          if (yr.ok) {
            const yd = await yr.json()
            const p = yd?.chart?.result?.[0]?.meta?.regularMarketPrice
            if (p) out[s.symbol] = { price: Number(p), source: 'yahoo' }
          }
        } catch (e) {}
      }))
      const nowIso = new Date().toISOString()
      for (const s of symbols) {
        if (!out[s.symbol]) continue
        await supabase.from('holdings').update({ current_price: out[s.symbol].price, last_price_updated_at: nowIso }).eq('user_id', user.id).eq('symbol', s.symbol).eq('exchange', s.exchange)
      }
      return cors(NextResponse.json({ prices: out, updated_at: nowIso, kite_active: usedKite, kite_source: usedKite ? kiteSource : null }))
    }

    // ---- KITE OAuth: login redirect ----
    if (route === '/kite/login' && method === 'GET') {
      const kiteKey = process.env.KITE_API_KEY
      if (!kiteKey) return cors(NextResponse.json({ error: 'KITE_API_KEY not set' }, { status: 400 }))
      return NextResponse.redirect(`https://kite.zerodha.com/connect/login?api_key=${kiteKey}&v=3`, 302)
    }

    // ---- KITE OAuth: callback (exchanges request_token for access_token) ----
    if (route === '/kite/callback' && method === 'GET') {
      const url = new URL(request.url)
      const requestToken = url.searchParams.get('request_token')
      const status = url.searchParams.get('status')
      const kiteKey = process.env.KITE_API_KEY, kiteSecret = process.env.KITE_API_SECRET
      let accessToken = null, exchangeError = null, user_id = null
      const user = await currentUser(supabase)
      user_id = user?.id
      if (requestToken && kiteKey && kiteSecret) {
        try {
          const checksum = crypto.createHash('sha256').update(kiteKey + requestToken + kiteSecret).digest('hex')
          const body = new URLSearchParams({ api_key: kiteKey, request_token: requestToken, checksum }).toString()
          const kr = await fetch('https://api.kite.trade/session/token', { method: 'POST', headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' })
          const kd = await kr.json()
          if (kr.ok && kd?.data?.access_token) {
            accessToken = kd.data.access_token
            if (user_id) {
              await supabase.from('profiles').update({ kite_access_token: accessToken, kite_access_token_at: new Date().toISOString() }).eq('id', user_id)
            }
          } else {
            exchangeError = kd?.message || JSON.stringify(kd)
          }
        } catch (e) { exchangeError = String(e) }
      }
      const ok = !!accessToken
      const html = `<!doctype html><html><head><title>Kite login</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#080b12;color:#e2e8f0;font-family:system-ui;padding:40px;text-align:center;max-width:640px;margin:0 auto}code{background:#1e293b;padding:6px 10px;border-radius:6px;color:#67e8f9;word-break:break-all}h1{margin-bottom:4px}p{color:#94a3b8;font-size:14px;line-height:1.6}a{display:inline-block;margin-top:24px;background:linear-gradient(90deg,#67e8f9,#3b82f6);color:#07101c;padding:12px 24px;border-radius:12px;font-weight:600;text-decoration:none}</style></head><body><h1>${ok ? '✅ Kite connected' : status === 'success' && !user_id ? '⚠️ Sign in first' : '⚠️ Kite connection failed'}</h1>${ok ? `<p>Live NSE/BSE prices are now active for your account. You&#39;ll need to reconnect tomorrow after 6 AM IST when Zerodha rotates the token.</p>` : !user_id ? `<p>Please sign in to Personal Finance, then click <b>Connect Kite</b> from Investments and try again.</p>` : `<p>${exchangeError ? 'Kite said: <code>' + exchangeError.slice(0, 300) + '</code>' : 'No request_token received.'}</p>`}<a href="/">Back to Personal Finance</a></body></html>`
      return applyCookies(new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } }), cookiesToSet)
    }
    if (route === '/kite/postback' && (method === 'POST' || method === 'GET')) {
      try { const body = method === 'POST' ? await request.json().catch(() => null) : null; console.log('[kite/postback]', body) } catch {}
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- CREDIT CARD spend ----
    if (route === '/finance/credit_card_transactions' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const cardId = body.credit_card_id, amount = Number(body.amount)
      if (!cardId || !(amount > 0)) return cors(NextResponse.json({ error: 'credit_card_id and amount required' }, { status: 400 }))
      const { data: card } = await supabase.from('credit_cards').select('*').eq('id', cardId).eq('user_id', user.id).maybeSingle()
      if (!card) return cors(NextResponse.json({ error: 'Card not found' }, { status: 404 }))
      const payload = { ...pickFields('credit_card_transactions', body), user_id: user.id }
      if (!payload.time) payload.time = new Date().toTimeString().slice(0, 5)
      if (!payload.date) payload.date = new Date().toISOString().slice(0, 10)
      const { data: created, error } = await supabase.from('credit_card_transactions').insert(payload).select().single()
      if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
      await supabase.from('credit_cards').update({ current_outstanding: Number(card.current_outstanding || 0) + amount }).eq('id', cardId).eq('user_id', user.id)
      return cors(NextResponse.json(created))
    }
    if (route.startsWith('/finance/credit_card_transactions/') && method === 'DELETE') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const id = route.split('/').pop()
      const { data: cct } = await supabase.from('credit_card_transactions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (cct) {
        const { data: card } = await supabase.from('credit_cards').select('*').eq('id', cct.credit_card_id).eq('user_id', user.id).maybeSingle()
        if (card && cct.status !== 'paid') {
          await supabase.from('credit_cards').update({ current_outstanding: Math.max(0, Number(card.current_outstanding || 0) - Number(cct.amount)) }).eq('id', card.id).eq('user_id', user.id)
        }
      }
      const { error } = await supabase.from('credit_card_transactions').delete().eq('id', id).eq('user_id', user.id)
      return cors(NextResponse.json({ ok: !error }))
    }

    // ---- TRANSACTION edit history ----
    if (route.match(/^\/finance\/transactions\/([^/]+)\/history$/) && method === 'GET') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const txId = route.match(/^\/finance\/transactions\/([^/]+)\/history$/)[1]
      const { data } = await supabase.from('transaction_edit_history').select('*').eq('transaction_id', txId).eq('user_id', user.id).order('changed_at', { ascending: false })
      return cors(NextResponse.json(data || []))
    }

    // ---- TRANSACTION attachment: signed URL for viewing (bucket is private), and delete ----
    if (route.match(/^\/finance\/transactions\/([^/]+)\/attachment$/) && (method === 'GET' || method === 'DELETE')) {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const txId = route.match(/^\/finance\/transactions\/([^/]+)\/attachment$/)[1]
      const { data: tx } = await supabase.from('transactions').select('attachment_path').eq('id', txId).eq('user_id', user.id).maybeSingle()
      if (!tx?.attachment_path) return cors(NextResponse.json({ error: 'No attachment' }, { status: 404 }))

      if (method === 'GET') {
        const { data: signed, error } = await supabase.storage.from('attachments').createSignedUrl(tx.attachment_path, 300)
        if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
        return cors(NextResponse.json({ url: signed.signedUrl }))
      }

      await supabase.storage.from('attachments').remove([tx.attachment_path])
      await supabase.from('transactions').update({ attachment_path: null, attachment_name: null }).eq('id', txId).eq('user_id', user.id)
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- CREDIT CARD bill payment ----
    if (route.match(/^\/finance\/credit_cards\/([^/]+)\/pay_bill$/) && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const cardId = route.match(/^\/finance\/credit_cards\/([^/]+)\/pay_bill$/)[1]
      const body = await request.json()
      const amount = Number(body.amount)
      if (!body.account_id || !(amount > 0)) return cors(NextResponse.json({ error: 'account_id and amount required' }, { status: 400 }))
      const { data: card } = await supabase.from('credit_cards').select('*').eq('id', cardId).eq('user_id', user.id).maybeSingle()
      if (!card) return cors(NextResponse.json({ error: 'Card not found' }, { status: 404 }))
      const now = new Date()
      const txPayload = { user_id: user.id, account_id: body.account_id, amount, type: 'expense', description: `Credit card bill · ${card.name}`, date: body.date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), notes: body.notes || null }
      const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
      const newOutstanding = Math.max(0, Number(card.current_outstanding || 0) - amount)
      await supabase.from('credit_cards').update({ current_outstanding: newOutstanding }).eq('id', cardId).eq('user_id', user.id)
      await supabase.from('credit_card_transactions').update({ status: 'paid' }).eq('credit_card_id', cardId).eq('user_id', user.id).eq('status', 'pending')
      return cors(NextResponse.json({ new_outstanding: newOutstanding, transaction_id: tx?.id }))
    }

    // ---- SCHOLARSHIP payment to college ----
    if (route === '/finance/scholarship_payments' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const amount = Number(body.amount)
      if (!body.scholarship_id || !(amount > 0)) return cors(NextResponse.json({ error: 'scholarship_id and amount required' }, { status: 400 }))
      const { data: s } = await supabase.from('scholarships').select('*').eq('id', body.scholarship_id).eq('user_id', user.id).maybeSingle()
      if (!s) return cors(NextResponse.json({ error: 'Scholarship not found' }, { status: 404 }))
      let linkedTxId = null
      if (body.account_id) {
        const now = new Date()
        const txPayload = { user_id: user.id, account_id: body.account_id, amount, type: 'expense', description: `${s.name} → ${body.paid_to || 'College'}`, date: body.payment_date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), notes: body.notes || null, linked_module: 'scholarship', linked_module_id: s.id }
        const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
        if (tx?.id) linkedTxId = tx.id
      }
      const paymentPayload = { user_id: user.id, scholarship_id: body.scholarship_id, amount, paid_to: body.paid_to || 'College', payment_date: body.payment_date || new Date().toISOString().slice(0, 10), account_id: body.account_id || null, linked_transaction_id: linkedTxId, notes: body.notes || null }
      const { data: payment } = await supabase.from('scholarship_payments').insert(paymentPayload).select().single()
      const newPaid = Number(s.amount_paid_to_college || 0) + amount
      const newStatus = newPaid >= Number(s.total_amount) ? 'paid' : s.status
      await supabase.from('scholarships').update({ amount_paid_to_college: newPaid, status: newStatus }).eq('id', s.id).eq('user_id', user.id)
      return cors(NextResponse.json({ payment, new_paid: newPaid }))
    }

    // ---- PROFILE ----
    if (route === '/finance/profile' && (method === 'GET' || method === 'PATCH' || method === 'PUT')) {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      if (method === 'GET') {
        const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (!row) {
          const { data: created } = await supabase.from('profiles').insert({ id: user.id, full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')?.[0] || '', avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null }).select().single()
          return cors(NextResponse.json(created))
        }
        return cors(NextResponse.json(row))
      }
      const body = await request.json()
      const payload = pickFields('profiles', body)
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!existing) {
        const { data: created } = await supabase.from('profiles').insert({ id: user.id, ...payload }).select().single()
        return cors(NextResponse.json(created))
      }
      const { data: updated } = await supabase.from('profiles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', user.id).select().maybeSingle()
      return cors(NextResponse.json(updated))
    }

    // ---- PORTFOLIO: add funds ----
    const addFundsMatch = route.match(/^\/finance\/portfolios\/([^/]+)\/add_funds$/)
    if (addFundsMatch && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const portfolioId = addFundsMatch[1]
      const body = await request.json()
      const amount = Number(body.amount)
      if (!(amount > 0) || !body.account_id) return cors(NextResponse.json({ error: 'amount and account_id required' }, { status: 400 }))
      const { data: p } = await supabase.from('portfolios').select('*').eq('id', portfolioId).eq('user_id', user.id).maybeSingle()
      if (!p) return cors(NextResponse.json({ error: 'Portfolio not found' }, { status: 404 }))
      const now = new Date()
      const txPayload = { user_id: user.id, account_id: body.account_id, amount, type: 'expense', description: `Funded ${p.name}`, date: body.date || now.toISOString().slice(0, 10), time: body.time || now.toTimeString().slice(0, 5), linked_module: 'investment', linked_module_id: portfolioId, notes: body.notes || null }
      await supabase.from('transactions').insert(txPayload)
      const newCash = Number(p.cash_balance || 0) + amount
      await supabase.from('portfolios').update({ cash_balance: newCash }).eq('id', portfolioId).eq('user_id', user.id)
      return cors(NextResponse.json({ cash_balance: newCash }))
    }

    // ---- LOAN PAYMENT with side effects ----
    if (route === '/finance/loan_payments' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const { loan_id, type: paymentType = 'emi', prepay_mode: rawPrepayMode, payment_date, account_id, notes } = body
      if (!loan_id) return cors(NextResponse.json({ error: 'loan_id is required' }, { status: 400 }))

      const { data: loan } = await supabase.from('loans').select('*').eq('id', loan_id).eq('user_id', user.id).maybeSingle()
      if (!loan) return cors(NextResponse.json({ error: 'Loan not found' }, { status: 404 }))

      const currentOutstanding0 = Number(loan.outstanding || 0)
      const currentEmi0 = Number(loan.emi_amount || 0)
      const effectiveDate = payment_date || new Date().toISOString().slice(0, 10)

      if (paymentType === 'adjustment') {
        // Reconciles the tracked outstanding to whatever the lender's own app/statement shows
        // right now — no cash actually moves (no linked transaction), and it never touches
        // interest_saved since it isn't a repayment, just correcting for drift (fees, penalty
        // charges, rounding — anything this app doesn't model that the real lender applies).
        //
        // The figure the user types in is a live, today-inclusive number (a lender's app bakes
        // in interest accrued since the last payment, same as this app's own display now does)
        // — but what gets stored has to stay a principal-only baseline, or every day afterward
        // would accrue fresh interest on top of interest that's already been counted once. So
        // back today's not-yet-billed interest back out before saving.
        const targetOutstanding = Number(body.target_outstanding)
        if (!(targetOutstanding >= 0)) return cors(NextResponse.json({ error: 'target_outstanding is required' }, { status: 400 }))
        const { data: recentReal } = await supabase.from('loan_payments').select('payment_date').eq('loan_id', loan_id).eq('user_id', user.id).neq('type', 'adjustment').order('payment_date', { ascending: false }).limit(1)
        const lastRealDate = recentReal?.[0]?.payment_date || loan.start_date
        const daysSinceLastReal = Math.max(0, daysBetween(lastRealDate, effectiveDate))
        const rate = Number(loan.interest_rate || 0)
        const impliedPrincipal = daysSinceLastReal > 0 ? targetOutstanding / (1 + (rate / 100 / 365) * daysSinceLastReal) : targetOutstanding
        const diff = currentOutstanding0 - impliedPrincipal
        if (Math.abs(diff) < 0.01) return cors(NextResponse.json({ error: 'Outstanding already matches — nothing to adjust' }, { status: 400 }))
        const newStatus = impliedPrincipal <= 0.01 ? 'closed' : loan.status
        const paymentPayload = {
          user_id: user.id, loan_id, amount: Math.abs(diff), type: 'adjustment', payment_date: effectiveDate,
          account_id: null, interest_saved: null, interest_portion: 0, prepay_mode: null,
          outstanding_before: currentOutstanding0, emi_before: currentEmi0,
          linked_transaction_id: null, notes: notes || (diff > 0 ? 'Synced down to lender-reported outstanding' : 'Synced up to lender-reported outstanding — unaccounted fees/charges'),
        }
        const { data: payment } = await supabase.from('loan_payments').insert(paymentPayload).select().single()
        await supabase.from('loans').update({ outstanding: impliedPrincipal, status: newStatus }).eq('id', loan_id).eq('user_id', user.id)
        return cors(NextResponse.json({ payment, new_outstanding: impliedPrincipal }))
      }

      const amount = Number(body.amount)
      if (!(amount > 0)) return cors(NextResponse.json({ error: 'a positive amount is required' }, { status: 400 }))

      const annualRatePct = Number(loan.interest_rate || 0)
      const currentOutstanding = currentOutstanding0
      const currentEmi = currentEmi0
      let interestPortion = 0
      let principalPortion = amount
      let interestSaved = 0
      let newEmi = currentEmi
      let prepayMode = null
      let excessAmount = 0

      // Interest owed since the last payment is charged first — always, regardless of whether
      // this is logged as a routine EMI or an intentional extra ("prepayment"). Per the loan
      // agreement's own Clause 2.11 (interest first, then principal), calling a payment a
      // "prepayment" doesn't exempt it from interest that has already genuinely accrued —
      // that only applies to the amount actually beyond a standard EMI's worth.
      //
      // Same-day payments must find each other here — `lte` (not `lt`) plus a created_at
      // tiebreaker, since this payment hasn't been inserted yet so it can't match itself. A
      // second payment logged minutes after the first, same calendar date, has zero real days
      // elapsed and must be charged zero interest — falling back past it to the last *different*
      // date would double-charge interest for a window the first payment already paid for.
      //
      // A sync/adjustment doesn't count as "the last payment" here — it only corrects the
      // principal figure, it isn't a moment money actually changed hands, so it must never
      // reset how many days of real, still-owed interest a genuine payment gets charged for.
      const { data: priorPayments } = await supabase.from('loan_payments').select('payment_date').eq('loan_id', loan_id).eq('user_id', user.id).neq('type', 'adjustment').lte('payment_date', effectiveDate).order('payment_date', { ascending: false }).order('created_at', { ascending: false }).limit(1)
      const hasPriorPayment = priorPayments && priorPayments.length > 0
      const previousDate = priorPayments?.[0]?.payment_date || loan.start_date
      const days = Math.max(0, daysBetween(previousDate, effectiveDate))
      interestPortion = Math.min(accrueInterest(currentOutstanding, annualRatePct, days), amount)
      principalPortion = Math.max(0, amount - interestPortion)

      // Paying more than the standard EMI in one go (e.g. a few days early with extra thrown
      // in) isn't a bigger EMI — interest owed this period is fixed by time elapsed, not by
      // how much you hand over. Only the amount beyond the standard EMI is genuinely extra,
      // and gets the reduce-tenure/reduce-EMI interest-saved treatment.
      //
      // But that "up to one EMI counts as just the regular installment" carve-out can only
      // apply once per real gap in time — if this payment lands the same day as the one right
      // before it (zero days elapsed, `hasPriorPayment` true), no new due date could plausibly
      // have come up in that window, so there's no "next EMI" left to attribute anything to.
      // The whole amount is genuine prepayment. A same-day payment with NO prior payment at all
      // (e.g. day-one disbursal) still gets the normal carve-out — there's nothing to double up.
      const claimsFreshCycle = !(hasPriorPayment && days === 0)
      excessAmount = claimsFreshCycle ? Math.max(0, amount - currentEmi) : amount
      if (excessAmount > 0.01) {
        prepayMode = rawPrepayMode === 'reduce_emi' ? 'reduce_emi' : 'reduce_tenure'
        const standardPrincipal = Math.max(0, (amount - excessAmount) - interestPortion)
        const standardOutstandingAfter = Math.max(0, currentOutstanding - standardPrincipal)
        const actualOutstandingAfter = Math.max(0, currentOutstanding - principalPortion)
        const scheduleStandard = projectSchedule({ outstanding: standardOutstandingAfter, annualRatePct, emiAmount: currentEmi, startDate: effectiveDate })
        if (prepayMode === 'reduce_emi') {
          newEmi = calcEmi(actualOutstandingAfter, annualRatePct, scheduleStandard.length)
        }
        const scheduleActual = projectSchedule({ outstanding: actualOutstandingAfter, annualRatePct, emiAmount: newEmi, startDate: effectiveDate })
        interestSaved = Math.max(0, totalInterest(scheduleStandard) - totalInterest(scheduleActual))
      }
      const newOutstanding = Math.max(0, currentOutstanding - principalPortion)
      const newInterestSaved = Number(loan.interest_saved || 0) + interestSaved
      const newStatus = newOutstanding <= 0.01 ? 'closed' : loan.status

      let linkedTxId = null
      const payingAccountId = account_id || loan.paid_from_account_id
      // A "cc:<id>" account_id means this was paid on a credit card, not a bank/cash account —
      // same convention the transaction form already uses. No money leaves a bank account; the
      // card's outstanding balance goes up instead, exactly like logging a card spend directly.
      const payingCardId = typeof payingAccountId === 'string' && payingAccountId.startsWith('cc:') ? payingAccountId.slice(3) : null
      if (payingAccountId) {
        const loanCategoryId = await ensureCategory(supabase, user.id, 'Loan / Debt', 'expense')
        const txPayload = {
          user_id: user.id, account_id: payingCardId ? null : payingAccountId, amount, type: 'expense',
          description: `Loan ${excessAmount > 0.01 ? 'EMI + prepayment' : 'EMI'} · ${loan.name}`,
          date: effectiveDate, category_id: loanCategoryId,
          notes: notes || null, linked_module: payingCardId ? 'credit_card' : 'loan', linked_module_id: payingCardId || loan_id,
        }
        const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
        if (tx?.id) linkedTxId = tx.id
        if (payingCardId) {
          const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', payingCardId).eq('user_id', user.id).maybeSingle()
          if (card) await supabase.from('credit_cards').update({ current_outstanding: Number(card.current_outstanding || 0) + amount }).eq('id', payingCardId).eq('user_id', user.id)
        }
      }

      const paymentPayload = {
        user_id: user.id, loan_id, amount, type: paymentType,
        payment_date: effectiveDate,
        account_id: payingCardId ? null : payingAccountId, interest_saved: interestSaved || null,
        interest_portion: interestPortion || 0, prepay_mode: prepayMode,
        outstanding_before: currentOutstanding, emi_before: currentEmi,
        linked_transaction_id: linkedTxId, notes: notes || null,
      }
      const { data: payment } = await supabase.from('loan_payments').insert(paymentPayload).select().single()

      await supabase.from('loans').update({ outstanding: newOutstanding, interest_saved: newInterestSaved, emi_amount: newEmi, status: newStatus }).eq('id', loan_id).eq('user_id', user.id)

      return cors(NextResponse.json({ payment, new_outstanding: newOutstanding, new_emi_amount: newEmi, interest_saved: interestSaved }))
    }

    if (route.startsWith('/finance/loan_payments/') && method === 'DELETE') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const id = route.split('/').pop()
      const { data: payment } = await supabase.from('loan_payments').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (!payment) return cors(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      if (payment.linked_transaction_id) {
        const { data: linkedTx } = await supabase.from('transactions').select('linked_module, linked_module_id, amount').eq('id', payment.linked_transaction_id).eq('user_id', user.id).maybeSingle()
        if (linkedTx?.linked_module === 'credit_card' && linkedTx.linked_module_id) {
          const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', linkedTx.linked_module_id).eq('user_id', user.id).maybeSingle()
          if (card) await supabase.from('credit_cards').update({ current_outstanding: Math.max(0, Number(card.current_outstanding || 0) - Number(linkedTx.amount)) }).eq('id', linkedTx.linked_module_id).eq('user_id', user.id)
        }
        await supabase.from('transactions').delete().eq('id', payment.linked_transaction_id).eq('user_id', user.id)
      }
      const { data: loan } = await supabase.from('loans').select('*').eq('id', payment.loan_id).eq('user_id', user.id).maybeSingle()
      if (loan) {
        // Exact restore from the snapshot taken before this payment was applied —
        // no re-derivation, so it can never drift from what was actually committed.
        const restoredOutstanding = payment.outstanding_before != null ? Number(payment.outstanding_before) : Number(loan.outstanding || 0) + Number(payment.amount)
        const restoredEmi = payment.emi_before != null ? Number(payment.emi_before) : Number(loan.emi_amount || 0)
        const newInterestSaved = Math.max(0, Number(loan.interest_saved || 0) - Number(payment.interest_saved || 0))
        await supabase.from('loans').update({ outstanding: restoredOutstanding, emi_amount: restoredEmi, interest_saved: newInterestSaved, status: restoredOutstanding > 0.01 ? 'active' : loan.status }).eq('id', loan.id).eq('user_id', user.id)
      }
      await supabase.from('loan_payments').delete().eq('id', id).eq('user_id', user.id)
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- FINANCE CRUD (accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, credit_cards, credit_card_transactions, scholarships, scholarship_payments) ----
    const collectionMatch = route.match(/^\/finance\/(accounts|categories|transactions|budgets|portfolios|holdings|sips|loans|loan_payments|bucket_list|lend_borrow|lend_repayments|credit_cards|credit_card_transactions|scholarships|scholarship_payments|zopkit_transactions|money_rules|recurring_transactions)(?:\/([^/]+))?$/)
    if (collectionMatch) {
      const [, table, id] = collectionMatch
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      if (table === 'categories') await ensureDefaults(supabase, user.id).catch(() => {})

      if (method === 'GET') {
        if (id) {
          const { data: row } = await supabase.from(table).select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
          return cors(NextResponse.json(row || null))
        }
        const { data: rows } = await applyOrder(supabase.from(table).select('*').eq('user_id', user.id), table)
        return cors(NextResponse.json(rows || []))
      }

      if (method === 'POST') {
        const body = await request.json()
        // A transaction made against a credit card (not a bank/cash account) — link it via
        // linked_module instead of account_id, matching the existing generic-link pattern.
        if (table === 'transactions' && body.credit_card_id) {
          body.linked_module = 'credit_card'
          body.linked_module_id = body.credit_card_id
          body.account_id = null
        }
        // Handle transfers: create two paired rows sharing transfer_group_id
        if (table === 'transactions' && body.type === 'transfer') {
          const amount = Number(body.amount)
          if (!body.account_id || !body.to_account_id || body.account_id === body.to_account_id || !(amount > 0)) {
            return cors(NextResponse.json({ error: 'Invalid transfer: pick two different accounts and a positive amount.' }, { status: 400 }))
          }
          const groupId = randomUUID()
          const nowStr = new Date().toTimeString().slice(0, 5)
          const base = { amount, type: 'transfer', description: body.description || 'Transfer', date: body.date, time: body.time || nowStr, notes: body.notes || null, transfer_group_id: groupId, user_id: user.id }
          const rows = [
            { ...base, account_id: body.account_id, transfer_direction: 'out' },
            { ...base, account_id: body.to_account_id, transfer_direction: 'in' },
          ]
          const { data: created, error } = await supabase.from('transactions').insert(rows).select()
          if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
          return cors(NextResponse.json(created))
        }
        const payload = { ...pickFields(table, body), user_id: user.id }
        if (table === 'accounts' && payload.opening_balance !== undefined) payload.current_balance = payload.opening_balance
        if (table === 'loans' && payload.principal !== undefined && payload.outstanding === undefined) payload.outstanding = payload.principal
        if (table === 'transactions' && !payload.time) payload.time = new Date().toTimeString().slice(0, 5)
        // "cc:<id>" in from_account_id means this lend was funded on a credit card — not a real
        // accounts.id, so it can't go into this (uuid, FK) column. The side-effect below still
        // reads the original "cc:<id>" off `body` (untouched), so card funding is still applied.
        if (table === 'lend_borrow' && typeof payload.from_account_id === 'string' && payload.from_account_id.startsWith('cc:')) {
          payload.from_account_id = null
        }
        const { data: created, error } = await supabase.from(table).insert(payload).select().single()
        if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))

        // Side-effect: a transaction linked to a lend/borrow record is a repayment (income
        // repaying money lent out, or expense repaying money borrowed) → record it + update pending
        if (table === 'transactions' && created?.id && body.linked_module === 'lend' && body.linked_module_id) {
          await applyLendRepayment(supabase, user.id, created.id, body.linked_module_id, created.amount, { date: created.date, account_id: created.account_id, notes: created.notes || null })
        }

        // Side-effect: a credit-card-linked transaction bumps the card's outstanding
        // (expense increases debt, income/refund reduces it) — no separate
        // credit_card_transactions row needed, this transaction is the record of it.
        if (table === 'transactions' && created?.id && body.linked_module === 'credit_card' && body.linked_module_id) {
          const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', body.linked_module_id).eq('user_id', user.id).maybeSingle()
          if (card) {
            const delta = body.type === 'income' ? -Number(created.amount) : Number(created.amount)
            const newOutstanding = Math.max(0, Number(card.current_outstanding || 0) + delta)
            await supabase.from('credit_cards').update({ current_outstanding: newOutstanding }).eq('id', body.linked_module_id).eq('user_id', user.id)
          }
        }

        // Side-effect: creating a holding decrements portfolio cash_balance
        if (table === 'holdings' && created?.id && payload.portfolio_id) {
          const cost = Number(payload.qty || 0) * Number(payload.avg_buy_price || 0)
          const { data: p } = await supabase.from('portfolios').select('cash_balance').eq('id', payload.portfolio_id).eq('user_id', user.id).maybeSingle()
          if (p) await supabase.from('portfolios').update({ cash_balance: Number(p.cash_balance || 0) - cost }).eq('id', payload.portfolio_id).eq('user_id', user.id)
        }

        // Side-effect: creating a lend_borrow of type 'lent' from an account → deduct via expense transaction.
        // "cc:<id>" means funded on a credit card instead of a bank/cash account — no money leaves
        // a bank account, the card's outstanding balance goes up instead.
        if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'lent') {
          const amount = Number(body.amount)
          const nowStr = new Date().toTimeString().slice(0, 5)
          const lentCategoryId = await ensureCategory(supabase, user.id, 'Lended', 'expense')
          const lentCardId = typeof body.from_account_id === 'string' && body.from_account_id.startsWith('cc:') ? body.from_account_id.slice(3) : null
          const txPayload = { user_id: user.id, account_id: lentCardId ? null : body.from_account_id, amount, type: 'expense', description: `Lent to ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, category_id: lentCategoryId, linked_module: lentCardId ? 'credit_card' : 'lend', linked_module_id: lentCardId || created.id, notes: body.notes || null }
          const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
          if (tx?.id) await supabase.from('lend_borrow').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
          if (lentCardId) {
            const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', lentCardId).eq('user_id', user.id).maybeSingle()
            if (card) await supabase.from('credit_cards').update({ current_outstanding: Number(card.current_outstanding || 0) + amount }).eq('id', lentCardId).eq('user_id', user.id)
          }
        }
        // Side-effect: borrowed money → income into account
        if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'borrowed') {
          const amount = Number(body.amount)
          const nowStr = new Date().toTimeString().slice(0, 5)
          const borrowedCategoryId = await ensureCategory(supabase, user.id, 'Loan / Debt', 'income')
          const txPayload = { user_id: user.id, account_id: body.from_account_id, amount, type: 'income', description: `Borrowed from ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, category_id: borrowedCategoryId, linked_module: 'lend', linked_module_id: created.id, notes: body.notes || null }
          const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
          if (tx?.id) await supabase.from('lend_borrow').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
        }

        // Side-effect: scholarship marked as received with an account → income transaction
        if (table === 'scholarships' && created?.id && payload.status === 'received' && payload.received_to_account_id) {
          const now = new Date()
          const txPayload = { user_id: user.id, account_id: payload.received_to_account_id, amount: Number(payload.total_amount), type: 'income', description: `${payload.name} received`, date: payload.received_date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), linked_module: 'scholarship', linked_module_id: created.id, notes: payload.notes || null }
          const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
          if (tx?.id) await supabase.from('scholarships').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
        }

        return cors(NextResponse.json(created))
      }

      if ((method === 'PATCH' || method === 'PUT') && id) {
        const body = await request.json()
        if (table === 'transactions' && body.credit_card_id) {
          body.linked_module = 'credit_card'
          body.linked_module_id = body.credit_card_id
          body.account_id = null
        }
        let oldRow = null
        if (table === 'transactions') {
          const { data } = await supabase.from('transactions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
          oldRow = data
        }
        const patch = pickFields(table, body)
        const { data: updated, error } = await supabase.from(table).update(patch).eq('id', id).eq('user_id', user.id).select().maybeSingle()
        if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))

        // Snapshot whatever actually changed — before-values only, so "what did this used to
        // say" is answerable without needing a full old/new row dump for every field untouched.
        if (table === 'transactions' && oldRow && updated?.id) {
          const changed = {}
          for (const field of Object.keys(patch)) {
            if (String(oldRow[field] ?? '') !== String(patch[field] ?? '')) changed[field] = oldRow[field]
          }
          if (Object.keys(changed).length > 0) {
            await supabase.from('transaction_edit_history').insert({ transaction_id: id, user_id: user.id, previous_values: changed })
          }
        }

        if (table === 'transactions' && updated?.id) {
          // Unwind whatever side-effect the old version of this transaction had applied,
          // then reapply based on the new version — handles relinking, unlinking, and amount edits.
          if (oldRow?.linked_module === 'lend' && oldRow.linked_module_id) {
            await reverseLendRepayment(supabase, user.id, id, oldRow.linked_module_id, oldRow.amount)
          }
          if (updated.linked_module === 'lend' && updated.linked_module_id) {
            await applyLendRepayment(supabase, user.id, updated.id, updated.linked_module_id, updated.amount, { date: updated.date, account_id: updated.account_id, notes: updated.notes || null })
          }
          if (oldRow?.linked_module === 'credit_card' && oldRow.linked_module_id) {
            const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', oldRow.linked_module_id).eq('user_id', user.id).maybeSingle()
            if (card) {
              const delta = oldRow.type === 'income' ? Number(oldRow.amount) : -Number(oldRow.amount)
              const newOutstanding = Math.max(0, Number(card.current_outstanding || 0) + delta)
              await supabase.from('credit_cards').update({ current_outstanding: newOutstanding }).eq('id', oldRow.linked_module_id).eq('user_id', user.id)
            }
          }
          if (updated.linked_module === 'credit_card' && updated.linked_module_id) {
            const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', updated.linked_module_id).eq('user_id', user.id).maybeSingle()
            if (card) {
              const delta = updated.type === 'income' ? -Number(updated.amount) : Number(updated.amount)
              const newOutstanding = Math.max(0, Number(card.current_outstanding || 0) + delta)
              await supabase.from('credit_cards').update({ current_outstanding: newOutstanding }).eq('id', updated.linked_module_id).eq('user_id', user.id)
            }
          }
        }
        return cors(NextResponse.json(updated))
      }

      if (method === 'DELETE' && id) {
        // If deleting a transaction that is part of a transfer group, remove both sides
        if (table === 'transactions') {
          const { data: row } = await supabase.from('transactions').select('id, transfer_group_id, linked_module, linked_module_id, amount, type, attachment_path').eq('id', id).eq('user_id', user.id).maybeSingle()
          if (row?.attachment_path) await supabase.storage.from('attachments').remove([row.attachment_path])
          const groupId = row?.transfer_group_id
          if (groupId) {
            const { error } = await supabase.from('transactions').delete().eq('transfer_group_id', groupId).eq('user_id', user.id)
            return cors(NextResponse.json({ ok: !error }))
          }
          // Reverse the credit card outstanding this transaction had applied
          if (row?.linked_module === 'credit_card' && row.linked_module_id) {
            const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', row.linked_module_id).eq('user_id', user.id).maybeSingle()
            if (card) {
              const delta = row.type === 'income' ? Number(row.amount) : -Number(row.amount)
              const newOutstanding = Math.max(0, Number(card.current_outstanding || 0) + delta)
              await supabase.from('credit_cards').update({ current_outstanding: newOutstanding }).eq('id', row.linked_module_id).eq('user_id', user.id)
            }
          }
          // Reverse the lend/borrow repayment this transaction had recorded
          if (row?.linked_module === 'lend' && row.linked_module_id) {
            await reverseLendRepayment(supabase, user.id, id, row.linked_module_id, row.amount)
          }
        }
        // Deleting a holding → refund cost back to portfolio cash
        if (table === 'holdings') {
          const { data: h } = await supabase.from('holdings').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
          if (h) {
            const { data: p } = await supabase.from('portfolios').select('cash_balance').eq('id', h.portfolio_id).eq('user_id', user.id).maybeSingle()
            if (p) await supabase.from('portfolios').update({ cash_balance: Number(p.cash_balance || 0) + Number(h.qty) * Number(h.avg_buy_price) }).eq('id', h.portfolio_id).eq('user_id', user.id)
          }
        }
        // Deleting a lend_borrow → remove linked transaction (bank/cash balance restores
        // automatically via the DB trigger; a card's outstanding isn't trigger-managed, so
        // that has to be reversed by hand here first).
        if (table === 'lend_borrow') {
          const { data: lb } = await supabase.from('lend_borrow').select('linked_transaction_id').eq('id', id).eq('user_id', user.id).maybeSingle()
          if (lb?.linked_transaction_id) {
            const { data: linkedTx } = await supabase.from('transactions').select('linked_module, linked_module_id, amount').eq('id', lb.linked_transaction_id).eq('user_id', user.id).maybeSingle()
            if (linkedTx?.linked_module === 'credit_card' && linkedTx.linked_module_id) {
              const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', linkedTx.linked_module_id).eq('user_id', user.id).maybeSingle()
              if (card) await supabase.from('credit_cards').update({ current_outstanding: Math.max(0, Number(card.current_outstanding || 0) - Number(linkedTx.amount)) }).eq('id', linkedTx.linked_module_id).eq('user_id', user.id)
            }
            await supabase.from('transactions').delete().eq('id', lb.linked_transaction_id).eq('user_id', user.id)
          }
        }
        const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
        return cors(NextResponse.json({ ok: !error }))
      }
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
