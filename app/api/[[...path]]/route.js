import { NextResponse } from 'next/server'

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function serviceHeaders(extra = {}) {
  return { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, 'Content-Type': 'application/json', ...extra }
}

async function supabaseAuth(path, body) {
  return fetch(`${supabaseUrl()}${path}`, {
    method: 'POST',
    headers: { apikey: anonKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
}

async function currentUser(request) {
  const token = request.cookies.get('df_access_token')?.value
  if (!token) return null
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: anonKey(), Authorization: `Bearer ${token}` }, cache: 'no-store',
  })
  return response.ok ? response.json() : null
}

async function restRequest(table, method, query = '', body, extraHeaders = {}) {
  const headers = serviceHeaders({ Prefer: 'return=representation', ...extraHeaders })
  const response = await fetch(`${supabaseUrl()}/rest/v1/${table}${query}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
  })
  const text = await response.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  return { response, data }
}

const safeFields = {
  accounts: ['name', 'type', 'bank_name', 'account_number_last4', 'opening_balance', 'currency', 'color', 'icon', 'is_active'],
  categories: ['name', 'type', 'icon', 'color', 'is_default'],
  transactions: ['account_id', 'category_id', 'amount', 'type', 'description', 'date', 'time', 'notes', 'linked_module', 'linked_module_id', 'transfer_group_id', 'transfer_direction'],
  budgets: ['category_id', 'amount', 'period', 'start_date'],
  portfolios: ['name', 'broker', 'demat_account_id', 'cash_balance'],
  holdings: ['portfolio_id', 'symbol', 'exchange', 'company_name', 'qty', 'avg_buy_price', 'current_price', 'last_price_updated_at'],
  sips: ['fund_name', 'folio_number', 'monthly_amount', 'start_date', 'units_held', 'nav', 'current_value'],
  loans: ['name', 'lender', 'principal', 'interest_rate', 'tenure_months', 'emi_amount', 'start_date', 'total_interest', 'status', 'paid_from_account_id', 'outstanding', 'interest_saved'],
  loan_payments: ['loan_id', 'amount', 'type', 'payment_date', 'account_id', 'interest_saved', 'linked_transaction_id', 'notes'],
  bucket_list: ['title', 'estimated_cost', 'priority', 'target_date', 'status', 'notes'],
  lend_borrow: ['person_name', 'type', 'amount', 'date', 'due_date', 'from_account_id', 'reason', 'status', 'notes'],
  lend_repayments: ['lend_borrow_id', 'amount', 'date', 'account_id', 'linked_transaction_id', 'notes'],
  profiles: ['full_name', 'age', 'avatar_url', 'theme', 'currency'],
}

function pickFields(table, source) {
  return Object.fromEntries((safeFields[table] || []).filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
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
]

async function ensureDefaults(userId) {
  const check = await fetch(`${supabaseUrl()}/rest/v1/categories?user_id=eq.${userId}&select=id&limit=1`, { headers: serviceHeaders(), cache: 'no-store' })
  if (!check.ok) return
  const existing = await check.json().catch(() => [])
  if (Array.isArray(existing) && existing.length > 0) return
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true }))
  await fetch(`${supabaseUrl()}/rest/v1/categories`, {
    method: 'POST', headers: serviceHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify(rows), cache: 'no-store',
  })
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

  try {
    // ---- AUTH ROUTES ----
    if (route === '/auth/signup' && method === 'POST') {
      const body = await request.json()
      const response = await supabaseAuth('/auth/v1/signup', { email: body.email, password: body.password, data: { full_name: body.name || '' } })
      const data = await response.json()
      // If email confirmation is disabled, signup returns tokens; set cookies
      const result = NextResponse.json(data, { status: response.status })
      if (response.ok && data.access_token) {
        result.cookies.set('df_access_token', data.access_token, cookieOptions)
        if (data.refresh_token) result.cookies.set('df_refresh_token', data.refresh_token, cookieOptions)
      }
      return handleCORS(result)
    }
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const response = await supabaseAuth('/auth/v1/token?grant_type=password', { email: body.email, password: body.password })
      const data = await response.json()
      if (!response.ok) return handleCORS(NextResponse.json(data, { status: response.status }))
      const result = NextResponse.json({ user: data.user })
      result.cookies.set('df_access_token', data.access_token, cookieOptions)
      result.cookies.set('df_refresh_token', data.refresh_token, cookieOptions)
      return handleCORS(result)
    }
    if (route === '/auth/me' && method === 'GET') {
      const user = await currentUser(request)
      if (user) await ensureDefaults(user.id).catch(() => {})
      return handleCORS(NextResponse.json({ user }, { status: user ? 200 : 401 }))
    }
    if (route === '/auth/logout' && method === 'POST') {
      const result = NextResponse.json({ ok: true })
      result.cookies.delete('df_access_token'); result.cookies.delete('df_refresh_token')
      return handleCORS(result)
    }

    // ---- FINANCE SUMMARY ----
    if (route === '/finance/summary' && method === 'GET') {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      await ensureDefaults(user.id).catch(() => {})
      const headers = serviceHeaders()
      const read = async (table, extraQuery = '') => {
        const response = await fetch(`${supabaseUrl()}/rest/v1/${table}?user_id=eq.${user.id}&select=*${extraQuery}`, { headers, cache: 'no-store' })
        return response.ok ? response.json() : []
      }
      const [accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, profile] = await Promise.all([
        read('accounts', '&order=created_at.asc'),
        read('categories', '&order=type.asc,name.asc'),
        read('transactions', '&order=date.desc,time.desc.nullslast,created_at.desc'),
        read('budgets', '&order=created_at.desc'),
        read('portfolios', '&order=created_at.asc'),
        read('holdings', '&order=created_at.asc'),
        read('sips', '&order=created_at.desc'),
        read('loans', '&order=created_at.desc'),
        read('loan_payments', '&order=payment_date.desc'),
        read('bucket_list', '&order=created_at.desc'),
        read('lend_borrow', '&order=date.desc'),
        read('lend_repayments', '&order=date.desc'),
        (async () => {
          const r = await fetch(`${supabaseUrl()}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers, cache: 'no-store' })
          if (!r.ok) return null
          const arr = await r.json()
          return arr[0] || null
        })(),
      ])
      return handleCORS(NextResponse.json({ accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, profile }))
    }

    // ---- PROFILE ----
    if (route === '/finance/profile' && (method === 'GET' || method === 'PATCH' || method === 'PUT')) {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      if (method === 'GET') {
        const r = await fetch(`${supabaseUrl()}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
        const rows = r.ok ? await r.json() : []
        if (!rows[0]) {
          // create default
          const upsert = await restRequest('profiles', 'POST', '', { id: user.id, full_name: user.user_metadata?.full_name || user.email?.split('@')?.[0] || '' })
          return handleCORS(NextResponse.json(Array.isArray(upsert.data) ? upsert.data[0] : upsert.data))
        }
        return handleCORS(NextResponse.json(rows[0]))
      }
      const body = await request.json()
      const payload = pickFields('profiles', body)
      // upsert style
      const check = await fetch(`${supabaseUrl()}/rest/v1/profiles?id=eq.${user.id}&select=id`, { headers: serviceHeaders(), cache: 'no-store' })
      const existing = check.ok ? await check.json() : []
      if (!existing[0]) {
        const created = await restRequest('profiles', 'POST', '', { id: user.id, ...payload })
        return handleCORS(NextResponse.json(Array.isArray(created.data) ? created.data[0] : created.data))
      }
      const result = await restRequest('profiles', 'PATCH', `?id=eq.${user.id}`, { ...payload, updated_at: new Date().toISOString() })
      return handleCORS(NextResponse.json(Array.isArray(result.data) ? result.data[0] : result.data))
    }

    // ---- PORTFOLIO: add funds ----
    const addFundsMatch = route.match(/^\/finance\/portfolios\/([^/]+)\/add_funds$/)
    if (addFundsMatch && method === 'POST') {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const portfolioId = addFundsMatch[1]
      const body = await request.json()
      const amount = Number(body.amount)
      if (!(amount > 0) || !body.account_id) return handleCORS(NextResponse.json({ error: 'amount and account_id required' }, { status: 400 }))
      // Fetch portfolio
      const pr = await fetch(`${supabaseUrl()}/rest/v1/portfolios?id=eq.${portfolioId}&user_id=eq.${user.id}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
      const p = (pr.ok ? await pr.json() : [])[0]
      if (!p) return handleCORS(NextResponse.json({ error: 'Portfolio not found' }, { status: 404 }))
      // Create expense transaction from account
      const now = new Date()
      const txPayload = { user_id: user.id, account_id: body.account_id, amount, type: 'expense', description: `Funded ${p.name}`, date: body.date || now.toISOString().slice(0, 10), time: body.time || now.toTimeString().slice(0, 5), linked_module: 'investment', linked_module_id: portfolioId, notes: body.notes || null }
      await restRequest('transactions', 'POST', '', txPayload)
      const newCash = Number(p.cash_balance || 0) + amount
      await restRequest('portfolios', 'PATCH', `?id=eq.${portfolioId}&user_id=eq.${user.id}`, { cash_balance: newCash })
      return handleCORS(NextResponse.json({ cash_balance: newCash }))
    }

    // ---- LOAN PAYMENT with side effects ----
    if (route === '/finance/loan_payments' && method === 'POST') {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const { loan_id, amount: rawAmount, type: paymentType = 'emi', payment_date, account_id, notes } = body
      const amount = Number(rawAmount)
      if (!loan_id || !(amount > 0)) return handleCORS(NextResponse.json({ error: 'loan_id and positive amount are required' }, { status: 400 }))

      // Fetch loan
      const loanRes = await fetch(`${supabaseUrl()}/rest/v1/loans?id=eq.${encodeURIComponent(loan_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
      const loanRows = loanRes.ok ? await loanRes.json() : []
      const loan = loanRows[0]
      if (!loan) return handleCORS(NextResponse.json({ error: 'Loan not found' }, { status: 404 }))

      const rate = Number(loan.interest_rate || 0) / 12 / 100
      const currentOutstanding = Number(loan.outstanding || 0)
      let interestPortion = 0
      let principalPortion = amount
      let interestSaved = 0
      if (paymentType === 'emi') {
        interestPortion = Math.min(currentOutstanding * rate, amount)
        principalPortion = Math.max(0, amount - interestPortion)
      } else if (paymentType === 'prepayment') {
        // approximate interest saved via remaining tenure * monthly interest on reducing balance
        const monthlyInterest = currentOutstanding * rate
        const monthsSaved = amount > 0 ? amount / (Number(loan.emi_amount || 0) || amount) : 0
        interestSaved = Math.round(monthlyInterest * monthsSaved * 100) / 100
        principalPortion = amount
      }
      const newOutstanding = Math.max(0, currentOutstanding - principalPortion)
      const newInterestSaved = Number(loan.interest_saved || 0) + interestSaved
      const newStatus = newOutstanding <= 0.01 ? 'closed' : loan.status

      // Create the paying transaction (expense) linked to loan
      let linkedTxId = null
      const payingAccountId = account_id || loan.paid_from_account_id
      if (payingAccountId) {
        const txPayload = {
          user_id: user.id, account_id: payingAccountId, amount, type: 'expense',
          description: `Loan ${paymentType === 'emi' ? 'EMI' : 'prepayment'} · ${loan.name}`,
          date: payment_date || new Date().toISOString().slice(0, 10),
          notes: notes || null, linked_module: 'loan', linked_module_id: loan_id,
        }
        const txRes = await restRequest('transactions', 'POST', '', txPayload)
        const tx = Array.isArray(txRes.data) ? txRes.data[0] : txRes.data
        if (tx?.id) linkedTxId = tx.id
      }

      // Insert loan_payment
      const paymentPayload = {
        user_id: user.id, loan_id, amount, type: paymentType,
        payment_date: payment_date || new Date().toISOString().slice(0, 10),
        account_id: payingAccountId, interest_saved: interestSaved || null,
        linked_transaction_id: linkedTxId, notes: notes || null,
      }
      const payRes = await restRequest('loan_payments', 'POST', '', paymentPayload)

      // Update loan
      await restRequest('loans', 'PATCH', `?id=eq.${encodeURIComponent(loan_id)}&user_id=eq.${encodeURIComponent(user.id)}`, { outstanding: newOutstanding, interest_saved: newInterestSaved, status: newStatus })

      return handleCORS(NextResponse.json({ payment: Array.isArray(payRes.data) ? payRes.data[0] : payRes.data, new_outstanding: newOutstanding, interest_saved: interestSaved }, { status: 200 }))
    }

    if (route.startsWith('/finance/loan_payments/') && method === 'DELETE') {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const id = route.split('/').pop()
      // Fetch payment first
      const pRes = await fetch(`${supabaseUrl()}/rest/v1/loan_payments?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
      const rows = pRes.ok ? await pRes.json() : []
      const payment = rows[0]
      if (!payment) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      // Delete linked transaction (balance recomputes automatically)
      if (payment.linked_transaction_id) {
        await restRequest('transactions', 'DELETE', `?id=eq.${encodeURIComponent(payment.linked_transaction_id)}&user_id=eq.${encodeURIComponent(user.id)}`)
      }
      // Restore loan outstanding
      const loanRes = await fetch(`${supabaseUrl()}/rest/v1/loans?id=eq.${encodeURIComponent(payment.loan_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
      const loan = (loanRes.ok ? await loanRes.json() : [])[0]
      if (loan) {
        // Approximate reversal: add back the amount (best-effort; for EMI we split, but reversing exact interest is complex — add back full amount to outstanding minus interest portion approx)
        const rate = Number(loan.interest_rate || 0) / 12 / 100
        const interestPortion = payment.type === 'emi' ? Math.min(Number(loan.outstanding) * rate, Number(payment.amount)) : 0
        const restored = Math.min(Number(loan.principal || 0), Number(loan.outstanding || 0) + Number(payment.amount) - interestPortion)
        const newInterestSaved = Math.max(0, Number(loan.interest_saved || 0) - Number(payment.interest_saved || 0))
        await restRequest('loans', 'PATCH', `?id=eq.${encodeURIComponent(loan.id)}&user_id=eq.${encodeURIComponent(user.id)}`, { outstanding: restored, interest_saved: newInterestSaved, status: 'active' })
      }
      await restRequest('loan_payments', 'DELETE', `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ---- FINANCE CRUD (accounts, categories, transactions, budgets, portfolios, holdings, sips, loans, loan_payments, bucket_list, lend_borrow, lend_repayments) ----
    const collectionMatch = route.match(/^\/finance\/(accounts|categories|transactions|budgets|portfolios|holdings|sips|loans|loan_payments|bucket_list|lend_borrow|lend_repayments)(?:\/([^/]+))?$/)
    if (collectionMatch) {
      const [, table, id] = collectionMatch
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      if (table === 'categories') await ensureDefaults(user.id).catch(() => {})

      if (method === 'GET') {
        const orderClause = table === 'transactions' ? 'date.desc,time.desc.nullslast,created_at.desc' : table === 'lend_borrow' || table === 'lend_repayments' ? 'date.desc' : 'created_at.desc'
        const query = id
          ? `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`
          : `?user_id=eq.${encodeURIComponent(user.id)}&select=*&order=${orderClause}`
        const result = await restRequest(table, 'GET', query)
        return handleCORS(NextResponse.json(id ? (Array.isArray(result.data) ? result.data[0] || null : null) : (result.data || []), { status: result.response.status }))
      }

      if (method === 'POST') {
        const body = await request.json()
        // Handle transfers: create two paired rows sharing transfer_group_id
        if (table === 'transactions' && body.type === 'transfer') {
          const amount = Number(body.amount)
          if (!body.account_id || !body.to_account_id || body.account_id === body.to_account_id || !(amount > 0)) {
            return handleCORS(NextResponse.json({ error: 'Invalid transfer: pick two different accounts and a positive amount.' }, { status: 400 }))
          }
          const groupId = randomUUID()
          const nowStr = new Date().toTimeString().slice(0, 5)
          const base = { amount, type: 'transfer', description: body.description || 'Transfer', date: body.date, time: body.time || nowStr, notes: body.notes || null, transfer_group_id: groupId, user_id: user.id }
          const rows = [
            { ...base, account_id: body.account_id, transfer_direction: 'out' },
            { ...base, account_id: body.to_account_id, transfer_direction: 'in' },
          ]
          const result = await restRequest('transactions', 'POST', '', rows)
          return handleCORS(NextResponse.json(result.data, { status: result.response.status }))
        }
        const payload = { ...pickFields(table, body), user_id: user.id }
        if (table === 'accounts' && payload.opening_balance !== undefined) payload.current_balance = payload.opening_balance
        if (table === 'loans' && payload.principal !== undefined && payload.outstanding === undefined) payload.outstanding = payload.principal
        if (table === 'transactions' && !payload.time) payload.time = new Date().toTimeString().slice(0, 5)
        const result = await restRequest(table, 'POST', '', payload)
        const created = Array.isArray(result.data) ? result.data[0] : result.data

        // Side-effect: income linked to lend repayment → create lend_repayment record + update lend_borrow
        if (table === 'transactions' && created?.id && body.type === 'income' && body.linked_module === 'lend' && body.linked_module_id) {
          const lbId = body.linked_module_id
          const lbRes = await fetch(`${supabaseUrl()}/rest/v1/lend_borrow?id=eq.${lbId}&user_id=eq.${user.id}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
          const lb = (lbRes.ok ? await lbRes.json() : [])[0]
          if (lb) {
            await restRequest('lend_repayments', 'POST', '', { lend_borrow_id: lbId, user_id: user.id, amount: created.amount, date: created.date, account_id: created.account_id, linked_transaction_id: created.id, notes: created.notes || null })
            const newRepaid = Number(lb.amount_repaid || 0) + Number(created.amount)
            const newStatus = newRepaid >= Number(lb.amount) ? 'returned' : newRepaid > 0 ? 'partial' : 'pending'
            await restRequest('lend_borrow', 'PATCH', `?id=eq.${lbId}&user_id=eq.${user.id}`, { amount_repaid: newRepaid, status: newStatus })
          }
        }

        // Side-effect: creating a holding decrements portfolio cash_balance
        if (table === 'holdings' && created?.id && payload.portfolio_id) {
          const cost = Number(payload.qty || 0) * Number(payload.avg_buy_price || 0)
          const pr = await fetch(`${supabaseUrl()}/rest/v1/portfolios?id=eq.${payload.portfolio_id}&user_id=eq.${user.id}&select=cash_balance`, { headers: serviceHeaders(), cache: 'no-store' })
          const p = (pr.ok ? await pr.json() : [])[0]
          if (p) await restRequest('portfolios', 'PATCH', `?id=eq.${payload.portfolio_id}&user_id=eq.${user.id}`, { cash_balance: Number(p.cash_balance || 0) - cost })
        }

        // Side-effect: creating a lend_borrow of type 'lent' from an account → deduct via expense transaction
        if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'lent') {
          const amount = Number(body.amount)
          const nowStr = new Date().toTimeString().slice(0, 5)
          const txPayload = { user_id: user.id, account_id: body.from_account_id, amount, type: 'expense', description: `Lent to ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, linked_module: 'lend', linked_module_id: created.id, notes: body.notes || null }
          const txRes = await restRequest('transactions', 'POST', '', txPayload)
          const tx = Array.isArray(txRes.data) ? txRes.data[0] : txRes.data
          if (tx?.id) await restRequest('lend_borrow', 'PATCH', `?id=eq.${created.id}&user_id=eq.${user.id}`, { linked_transaction_id: tx.id })
        }
        // Side-effect: borrowed money → income into account
        if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'borrowed') {
          const amount = Number(body.amount)
          const nowStr = new Date().toTimeString().slice(0, 5)
          const txPayload = { user_id: user.id, account_id: body.from_account_id, amount, type: 'income', description: `Borrowed from ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, linked_module: 'lend', linked_module_id: created.id, notes: body.notes || null }
          const txRes = await restRequest('transactions', 'POST', '', txPayload)
          const tx = Array.isArray(txRes.data) ? txRes.data[0] : txRes.data
          if (tx?.id) await restRequest('lend_borrow', 'PATCH', `?id=eq.${created.id}&user_id=eq.${user.id}`, { linked_transaction_id: tx.id })
        }

        return handleCORS(NextResponse.json(created, { status: result.response.status }))
      }

      if ((method === 'PATCH' || method === 'PUT') && id) {
        const body = await request.json()
        const result = await restRequest(table, 'PATCH', `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`, pickFields(table, body))
        return handleCORS(NextResponse.json(Array.isArray(result.data) ? result.data[0] || result.data : result.data, { status: result.response.status }))
      }

      if (method === 'DELETE' && id) {
        // If deleting a transaction that is part of a transfer group, remove both sides
        if (table === 'transactions') {
          const lookup = await fetch(`${supabaseUrl()}/rest/v1/transactions?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,transfer_group_id`, { headers: serviceHeaders(), cache: 'no-store' })
          const rows = lookup.ok ? await lookup.json() : []
          const groupId = rows?.[0]?.transfer_group_id
          if (groupId) {
            const result = await restRequest('transactions', 'DELETE', `?transfer_group_id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(user.id)}`)
            return handleCORS(NextResponse.json({ ok: result.response.ok }, { status: result.response.status }))
          }
        }
        // Deleting a holding → refund cost back to portfolio cash
        if (table === 'holdings') {
          const lookup = await fetch(`${supabaseUrl()}/rest/v1/holdings?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: serviceHeaders(), cache: 'no-store' })
          const h = (lookup.ok ? await lookup.json() : [])[0]
          if (h) {
            const pr = await fetch(`${supabaseUrl()}/rest/v1/portfolios?id=eq.${h.portfolio_id}&user_id=eq.${user.id}&select=cash_balance`, { headers: serviceHeaders(), cache: 'no-store' })
            const p = (pr.ok ? await pr.json() : [])[0]
            if (p) await restRequest('portfolios', 'PATCH', `?id=eq.${h.portfolio_id}&user_id=eq.${user.id}`, { cash_balance: Number(p.cash_balance || 0) + Number(h.qty) * Number(h.avg_buy_price) })
          }
        }
        // Deleting a lend_borrow → remove linked transaction (balance restores automatically)
        if (table === 'lend_borrow') {
          const lookup = await fetch(`${supabaseUrl()}/rest/v1/lend_borrow?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=linked_transaction_id`, { headers: serviceHeaders(), cache: 'no-store' })
          const lb = (lookup.ok ? await lookup.json() : [])[0]
          if (lb?.linked_transaction_id) await restRequest('transactions', 'DELETE', `?id=eq.${lb.linked_transaction_id}&user_id=eq.${user.id}`)
        }
        const result = await restRequest(table, 'DELETE', `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`)
        return handleCORS(NextResponse.json({ ok: result.response.ok }, { status: result.response.status }))
      }
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
