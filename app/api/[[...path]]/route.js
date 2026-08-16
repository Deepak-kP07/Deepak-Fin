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
  transactions: ['account_id', 'category_id', 'amount', 'type', 'description', 'date', 'notes', 'linked_module', 'linked_module_id', 'transfer_group_id', 'transfer_direction'],
  budgets: ['category_id', 'amount', 'period', 'start_date'],
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
      const [accounts, categories, transactions, budgets] = await Promise.all([
        read('accounts', '&order=created_at.asc'),
        read('categories', '&order=type.asc,name.asc'),
        read('transactions', '&order=date.desc,created_at.desc'),
        read('budgets', '&order=created_at.desc'),
      ])
      return handleCORS(NextResponse.json({ accounts, categories, transactions, budgets }))
    }

    // ---- FINANCE CRUD (accounts, categories, transactions, budgets) ----
    const collectionMatch = route.match(/^\/finance\/(accounts|categories|transactions|budgets)(?:\/([^/]+))?$/)
    if (collectionMatch) {
      const [, table, id] = collectionMatch
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      if (table === 'categories') await ensureDefaults(user.id).catch(() => {})

      if (method === 'GET') {
        const query = id
          ? `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`
          : `?user_id=eq.${encodeURIComponent(user.id)}&select=*&order=${table === 'transactions' ? 'date.desc,created_at.desc' : 'created_at.desc'}`
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
          const base = { amount, type: 'transfer', description: body.description || 'Transfer', date: body.date, notes: body.notes || null, transfer_group_id: groupId, user_id: user.id }
          const rows = [
            { ...base, account_id: body.account_id, transfer_direction: 'out' },
            { ...base, account_id: body.to_account_id, transfer_direction: 'in' },
          ]
          const result = await restRequest('transactions', 'POST', '', rows)
          return handleCORS(NextResponse.json(result.data, { status: result.response.status }))
        }
        const payload = { ...pickFields(table, body), user_id: user.id }
        if (table === 'accounts' && payload.opening_balance !== undefined) payload.current_balance = payload.opening_balance
        const result = await restRequest(table, 'POST', '', payload)
        return handleCORS(NextResponse.json(Array.isArray(result.data) ? result.data[0] || result.data : result.data, { status: result.response.status }))
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
