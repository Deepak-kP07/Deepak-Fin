import { NextResponse } from 'next/server'

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_BASE_URL || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

async function supabaseAuth(path, body, key = anonKey()) {
  return fetch(`${supabaseUrl()}${path}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
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

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if (route === '/auth/signup' && method === 'POST') {
      const body = await request.json()
      const response = await supabaseAuth('/auth/v1/signup', { email: body.email, password: body.password, data: { full_name: body.name || '' } })
      const data = await response.json()
      return handleCORS(NextResponse.json(data, { status: response.status }))
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
      return handleCORS(NextResponse.json({ user }, { status: user ? 200 : 401 }))
    }
    if (route === '/auth/logout' && method === 'POST') {
      const result = NextResponse.json({ ok: true })
      result.cookies.delete('df_access_token'); result.cookies.delete('df_refresh_token')
      return handleCORS(result)
    }
    if (route === '/finance/summary' && method === 'GET') {
      const user = await currentUser(request)
      if (!user) return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const headers = { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}` }
      const read = async (table) => { const response = await fetch(`${supabaseUrl()}/rest/v1/${table}?user_id=eq.${user.id}&select=*`, { headers, cache: 'no-store' }); return response.ok ? response.json() : [] }
      const [accounts, transactions] = await Promise.all([read('accounts'), read('transactions')])
      return handleCORS(NextResponse.json({ accounts, transactions }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute