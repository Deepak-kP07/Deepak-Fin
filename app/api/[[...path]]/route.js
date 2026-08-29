import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getRouteClient, applyCookies } from '@/lib/supabase/server'
import { calcEmi, projectSchedule, totalInterest, accrueInterest, daysBetween } from '@/lib/amortization'
import { handleCORS } from '@/lib/server/cors'
import { currentUser } from '@/lib/server/auth'
import { safeFields, pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { ensureDefaults, ensureCategory } from '@/lib/server/services/categories'
import { applyLendRepayment, reverseLendRepayment } from '@/lib/server/services/lendRepayment'
import { addInterval, generateDueRecurring } from '@/lib/server/services/recurring'
import { generateDueRecurringMoneyProfileEntries } from '@/lib/server/services/recurringMoneyProfileEntries'
import { syncProfileFromAuth } from '@/lib/server/services/profile'
import { syncPortfolioFromKite, syncMutualFundsFromKite, syncKiteOrders, isKiteTokenFresh } from '@/lib/server/services/kiteSync'
import { encryptVaultPayload, decryptVaultPayload } from '@/lib/server/vaultCrypto'
import { closeStaleBudgetMonths } from '@/lib/server/services/budgets'
import { randomUUID } from '@/lib/server/randomUUID'
import { listMoneyProfiles, listMoneyProfileEntries } from '@/lib/server/moneyProfileCrud'
import { listLendBorrow, listLendRepayments } from '@/lib/server/lendBorrowCrud'
import { sendWelcomeEmail } from '@/lib/email'

// Shared by /kite/login and /kite/callback — both are full-page browser navigations (Zerodha's
// redirect, or window.location from the app), so they render a small standalone page rather than
// JSON.
function kitePageHtml(title, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Kite login</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#080b12;color:#e2e8f0;font-family:system-ui;padding:40px;text-align:center;max-width:640px;margin:0 auto}code{background:#1e293b;padding:6px 10px;border-radius:6px;color:#67e8f9;word-break:break-all}h1{margin-bottom:4px}p{color:#94a3b8;font-size:14px;line-height:1.6}a{display:inline-block;margin-top:24px;background:linear-gradient(90deg,#67e8f9,#3b82f6);color:#07101c;padding:12px 24px;border-radius:12px;font-weight:600;text-decoration:none}</style></head><body><h1>${title}</h1><p>${bodyHtml}</p><a href="/">Back to Personal Fin</a></body></html>`
}

// A bearer-like live token and an encrypted secret respectively — neither has any reason to ever
// reach the browser, unlike kite_api_key (Zerodha puts that one straight in login redirect URLs).
function stripKiteSecrets(row) {
  if (!row) return row
  const { kite_access_token, kite_api_secret_encrypted, ...rest } = row
  return rest
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
      // Best-effort, same as every other non-critical side effect in this app (push
      // notifications, Kite syncs) — signUp() only ever succeeds once per email, so this never
      // re-sends on a later login without needing any "already welcomed" bookkeeping.
      if (data.user?.email) sendWelcomeEmail({ to: data.user.email, name: body.name }).catch(() => {})
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
        // Independent of each other (categories vs profiles) — run concurrently instead of
        // back-to-back, since each is its own network round trip to Supabase.
        await Promise.all([
          ensureDefaults(supabase, user.id).catch(() => {}),
          syncProfileFromAuth(supabase, user).catch(() => {}),
        ])
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
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) redirectUrl.searchParams.set('auth_error', error.message)
        // Google sign-in has no separate "signup" step to hook a welcome email into — this
        // callback fires on every login. created_at vs last_sign_in_at within a few seconds of
        // each other is the closest signal Supabase gives for "this is genuinely their first
        // sign-in", so that's what gates it instead of a new DB column just to track this.
        const user = data?.user
        if (user?.email && user.created_at && user.last_sign_in_at) {
          const isFirstSignIn = Math.abs(new Date(user.last_sign_in_at) - new Date(user.created_at)) < 15000
          if (isFirstSignIn) sendWelcomeEmail({ to: user.email, name: user.user_metadata?.full_name }).catch(() => {})
        }
      } else {
        const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')
        if (oauthError) redirectUrl.searchParams.set('auth_error', oauthError)
      }
      return applyCookies(NextResponse.redirect(redirectUrl), cookiesToSet)
    }
    // Google sign-in via client-side Google Identity Services + signInWithIdToken (see
    // AuthScreen.jsx) never hits /auth/oauth_callback above, so it needs its own hook for the
    // same "first sign-in" welcome email. Reads the email/first-sign-in signal from the caller's
    // own session rather than the request body, so this can't be used to spam an arbitrary address.
    if (route === '/auth/google_welcome' && method === 'POST') {
      const user = await currentUser(supabase)
      if (user?.email && user.created_at && user.last_sign_in_at) {
        const isFirstSignIn = Math.abs(new Date(user.last_sign_in_at) - new Date(user.created_at)) < 15000
        if (isFirstSignIn) sendWelcomeEmail({ to: user.email, name: user.user_metadata?.full_name }).catch(() => {})
      }
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- FINANCE SUMMARY ----
    if (route === '/finance/summary' && method === 'GET') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const readAll = async (table) => {
        const { data } = await applyOrder(supabase.from(table).select('*').eq('user_id', user.id), table)
        return data || []
      }
      // A single indexed UPDATE, no-op when nothing's stale — cheap enough to run unconditionally
      // on every load rather than gating it behind a staleness check like the Kite syncs below.
      await closeStaleBudgetMonths(supabase, user.id).catch(() => {})
      let [accounts, categories, transactions, budgets, portfolios, holdings, sips, other_investments, kite_orders, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, credit_cards, credit_card_transactions, scholarships, scholarship_payments, money_rules, recurring_transactions, money_profiles, money_profile_entries, recurring_money_profile_entries, budget_months, budget_month_categories, vault_items, profile] = await Promise.all([
        readAll('accounts'),
        readAll('categories'),
        readAll('transactions'),
        readAll('budgets'),
        readAll('portfolios'),
        readAll('holdings'),
        readAll('sips'),
        readAll('other_investments'),
        readAll('kite_orders'),
        readAll('loans'),
        readAll('loan_payments'),
        readAll('bucket_list'),
        // Owned-or-shared, with a my_role tag — readAll's plain owner-only filter can't express
        // that, same reasoning as money_profiles above (lib/server/lendBorrowCrud.js).
        listLendBorrow(supabase, user),
        listLendRepayments(supabase),
        readAll('credit_cards'),
        readAll('credit_card_transactions'),
        readAll('scholarships'),
        readAll('scholarship_payments'),
        readAll('money_rules'),
        readAll('recurring_transactions'),
        // Owned-or-shared, with a my_role tag — readAll's plain owner-only filter can't express
        // that, so these two go through the same role-aware functions the dedicated
        // money_profiles/money_profile_entries routes use (lib/server/moneyProfileCrud.js).
        listMoneyProfiles(supabase, user),
        listMoneyProfileEntries(supabase),
        readAll('recurring_money_profile_entries'),
        readAll('budget_months'),
        readAll('budget_month_categories'),
        readAll('vault_items'),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then((r) => r.data),
      ])
      // Both of these are rare-path side effects (first-ever use of the app; a recurring rule
      // that's genuinely due) checked against data already in hand, instead of two unconditional
      // extra round trips paid serially on *every* summary fetch — which is what made every
      // single save/edit/delete/toggle across the app feel sluggish, since every mutation calls
      // this same endpoint to refresh.
      if (categories.length === 0) {
        await ensureDefaults(supabase, user.id).catch(() => {})
        categories = await readAll('categories')
      }
      const today = new Date().toISOString().slice(0, 10)
      if (recurring_transactions.some((r) => r.is_active && r.next_due_date <= today)) {
        await generateDueRecurring(supabase, user.id).catch(() => {})
        ;[transactions, recurring_transactions] = await Promise.all([readAll('transactions'), readAll('recurring_transactions')])
      }
      if (recurring_money_profile_entries.some((r) => r.is_active && r.next_due_date <= today)) {
        await generateDueRecurringMoneyProfileEntries(supabase, user.id).catch(() => {})
        ;[money_profile_entries, recurring_money_profile_entries, transactions] = await Promise.all([listMoneyProfileEntries(supabase), readAll('recurring_money_profile_entries'), readAll('transactions')])
      }
      const kiteTokenFresh = isKiteTokenFresh(profile?.kite_access_token, profile?.kite_access_token_at)
      const staleSince = (iso) => !iso || Date.now() - new Date(iso).getTime() > 30 * 60 * 1000
      // Same "check on read, act if due" shape as the recurring-transactions block above — no
      // webhook, just opportunistically re-syncing whenever the user has the app open, which is
      // when they'd actually look at it. Each of the three tracks its own staleness clock and
      // runs independently — MF and orders are user-level (no portfolio to "link" the way
      // equities need one), so neither should depend on a stock portfolio being linked to Kite.
      const kiteLinkedPortfolio = portfolios.find((p) => p.kite_linked)
      const equityStale = kiteTokenFresh && kiteLinkedPortfolio && staleSince(kiteLinkedPortfolio.last_kite_sync_at)
      // MF/orders each stamp their own profiles.kite_*_synced_at on every attempt (even a
      // zero-result one), so staleness here never depends on row data existing — a user with
      // genuinely no MF holdings or no orders that day still only gets checked every 30 min.
      const mfStale = kiteTokenFresh && staleSince(profile?.kite_mf_synced_at)
      const ordersStale = kiteTokenFresh && staleSince(profile?.kite_orders_synced_at)
      if (equityStale || mfStale || ordersStale) {
        // Each call is independently best-effort so one failing (e.g. no MF holdings, a
        // transient Kite hiccup) never blocks the others.
        await Promise.all([
          equityStale ? syncPortfolioFromKite(supabase, user.id, kiteLinkedPortfolio.id).catch(() => {}) : null,
          mfStale ? syncMutualFundsFromKite(supabase, user.id).catch(() => {}) : null,
          ordersStale ? syncKiteOrders(supabase, user.id).catch(() => {}) : null,
        ])
        ;[portfolios, holdings, sips, kite_orders] = await Promise.all([readAll('portfolios'), readAll('holdings'), readAll('sips'), readAll('kite_orders')])
        // mfStale/ordersStale update profiles.kite_*_synced_at directly — re-read so the
        // response (and the "last synced" banner it feeds) reflects what just happened rather
        // than the pre-sync snapshot from the very top of this handler.
        profile = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then((r) => r.data)
      }
      // The raw Kite bearer token never needs to reach the browser — the client only ever
      // checks whether it's present and still fresh, which is exactly what kite_connected is.
      let profileSafe = profile
      if (profile) {
        const { kite_access_token, kite_api_secret_encrypted, ...rest } = profile
        // kite_connected only proves a token exists and is recent; kite_broken is the real
        // "did the last actual API call work" signal, set by the sync services themselves.
        profileSafe = { ...rest, kite_connected: !!kiteTokenFresh, kite_broken: !!profile.kite_last_error }
      }
      // Ciphertext never needs to reach the browser on a bulk load — only the dedicated reveal
      // route decrypts a single item, on demand, when its card is actually flipped.
      const vaultItemsSafe = vault_items.map(({ encrypted_payload, ...rest }) => rest)
      return cors(NextResponse.json({ accounts, categories, transactions, budgets, portfolios, holdings, sips, other_investments, kite_orders, loans, loan_payments, bucket_list, lend_borrow, lend_repayments, credit_cards, credit_card_transactions, scholarships, scholarship_payments, money_rules, recurring_transactions, money_profiles, money_profile_entries, recurring_money_profile_entries, budget_months, budget_month_categories, vault_items: vaultItemsSafe, profile: profileSafe }))
    }

    // ---- PRICES: Yahoo Finance fallback (public); Kite when creds set ----
    if (route === '/finance/prices' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const { symbols = [] } = await request.json()
      const { data: profile } = await supabase.from('profiles').select('kite_access_token,kite_access_token_at,kite_api_key').eq('id', user.id).maybeSingle()
      // Falls back to the app owner's own Kite app (KITE_API_KEY) when this user hasn't set up
      // their own — see /kite/login for the same fallback on the OAuth side. A saved personal
      // key always takes precedence once set.
      const kiteKey = profile?.kite_api_key || process.env.KITE_API_KEY
      const kiteToken = isKiteTokenFresh(profile?.kite_access_token, profile?.kite_access_token_at) ? profile.kite_access_token : null
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
      return cors(NextResponse.json({ prices: out, updated_at: nowIso, kite_active: usedKite, kite_source: usedKite ? 'user' : null }))
    }

    // ---- KITE OAuth: login redirect ----
    if (route === '/kite/login' && method === 'GET') {
      const user = await currentUser(supabase)
      const { data: loginProfile } = user ? await supabase.from('profiles').select('kite_api_key').eq('id', user.id).maybeSingle() : { data: null }
      // Defaults to the app owner's own Kite app (KITE_API_KEY in .env) so nobody has to set up
      // their own before their very first connect — Zerodha's own login page still asks for
      // *their* username/password, so the resulting access_token comes back scoped to whoever
      // actually logs in, not to the app owner. Settings > Kite Connect lets anyone save their
      // own key instead, which then always wins over this default from that point on.
      const kiteKey = loginProfile?.kite_api_key || process.env.KITE_API_KEY
      if (!user || !kiteKey) {
        const html = kitePageHtml(
          !user ? '⚠️ Sign in first' : '⚠️ Kite isn’t set up',
          !user ? 'Please sign in to Personal Fin, then click <b>Connect Kite</b> from Investments and try again.' : 'No Kite Connect app is configured yet. Add one in <b>Settings &gt; Kite Connect</b>, or ask the app owner to set KITE_API_KEY.'
        )
        return cors(new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
      }
      return NextResponse.redirect(`https://kite.zerodha.com/connect/login?api_key=${kiteKey}&v=3`, 302)
    }

    // ---- KITE OAuth: callback (exchanges request_token for access_token) ----
    if (route === '/kite/callback' && method === 'GET') {
      const url = new URL(request.url)
      const requestToken = url.searchParams.get('request_token')
      const status = url.searchParams.get('status')
      let accessToken = null, exchangeError = null, user_id = null
      const user = await currentUser(supabase)
      user_id = user?.id
      let kiteKey = null, kiteSecret = null
      if (user_id) {
        const { data: credsProfile } = await supabase.from('profiles').select('kite_api_key,kite_api_secret_encrypted').eq('id', user_id).maybeSingle()
        // Same default-to-owner's-app fallback as /kite/login — must match whichever key/secret
        // pair actually initiated this login there, or the checksum below won't verify.
        kiteKey = credsProfile?.kite_api_key || process.env.KITE_API_KEY || null
        kiteSecret = (credsProfile?.kite_api_secret_encrypted ? decryptVaultPayload(credsProfile.kite_api_secret_encrypted)?.secret : null) || process.env.KITE_API_SECRET || null
      }
      if (requestToken && kiteKey && kiteSecret) {
        try {
          const checksum = crypto.createHash('sha256').update(kiteKey + requestToken + kiteSecret).digest('hex')
          const body = new URLSearchParams({ api_key: kiteKey, request_token: requestToken, checksum }).toString()
          const kr = await fetch('https://api.kite.trade/session/token', { method: 'POST', headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' })
          const kd = await kr.json()
          if (kr.ok && kd?.data?.access_token) {
            accessToken = kd.data.access_token
            if (user_id) {
              // Optimistically cleared on a clean login — if something's still actually wrong,
              // the sync calls right below will re-set it immediately.
              await supabase.from('profiles').update({ kite_access_token: accessToken, kite_access_token_at: new Date().toISOString(), kite_last_error: null }).eq('id', user_id)
              // Best-effort — a stale-token banner on next load is fine if this hiccups, but a
              // successful connect shouldn't need a manual "Sync now" click to feel finished.
              // MF/orders fire regardless of whether a stock portfolio is linked — they're
              // user-level, not tied to one — equity only fires if there's actually a linked
              // portfolio to sync into.
              const { data: linked } = await supabase.from('portfolios').select('id').eq('user_id', user_id).eq('kite_linked', true).maybeSingle()
              await Promise.all([
                linked ? syncPortfolioFromKite(supabase, user_id, linked.id).catch(() => {}) : null,
                syncMutualFundsFromKite(supabase, user_id).catch(() => {}),
                syncKiteOrders(supabase, user_id).catch(() => {}),
              ])
            }
          } else {
            exchangeError = kd?.message || JSON.stringify(kd)
          }
        } catch (e) { exchangeError = String(e) }
      }
      const ok = !!accessToken
      const notConfigured = !!user_id && (!kiteKey || !kiteSecret)
      const title = ok ? '✅ Kite connected' : status === 'success' && !user_id ? '⚠️ Sign in first' : notConfigured ? '⚠️ Kite isn’t set up' : '⚠️ Kite connection failed'
      const body = ok
        ? `Live NSE/BSE prices are now active for your account. You&#39;ll need to reconnect tomorrow after 6 AM IST when Zerodha rotates the token.`
        : !user_id
        ? `Please sign in to Personal Fin, then click <b>Connect Kite</b> from Investments and try again.`
        : notConfigured
        ? `No Kite Connect app is configured yet. Add one in <b>Settings &gt; Kite Connect</b>, or ask the app owner to set KITE_API_KEY/KITE_API_SECRET.`
        : `${exchangeError ? 'Kite said: <code>' + exchangeError.slice(0, 300) + '</code>' : 'No request_token received.'}`
      const html = kitePageHtml(title, body)
      return applyCookies(new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }), cookiesToSet)
    }
    if (route === '/kite/postback' && (method === 'POST' || method === 'GET')) {
      // Unauthenticated by nature (Zerodha calls this, not a logged-in user) — nothing is
      // persisted, so there's nothing to validate. Previously logged the raw body to server
      // logs on every hit; dropped since that's unauthenticated-input logging of order data.
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- KITE app credentials: each user's own Kite Connect app (Settings > Kite Connect) ----
    if (route === '/kite/credentials' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const apiKey = String(body.api_key || '').trim()
      const apiSecret = String(body.api_secret || '').trim()
      if (!apiKey || !apiSecret) return cors(NextResponse.json({ error: 'Both API key and API secret are required.' }, { status: 400 }))
      await supabase.from('profiles').update({ kite_api_key: apiKey, kite_api_secret_encrypted: encryptVaultPayload({ secret: apiSecret }) }).eq('id', user.id)
      return cors(NextResponse.json({ ok: true, kite_api_key: apiKey }))
    }
    if (route === '/kite/credentials' && method === 'DELETE') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      // A full disconnect — an access token is meaningless once the key/secret pair that issued
      // it is gone, so it's cleared alongside rather than left behind as an orphaned row.
      await supabase.from('profiles').update({ kite_api_key: null, kite_api_secret_encrypted: null, kite_access_token: null, kite_access_token_at: null, kite_last_error: null }).eq('id', user.id)
      return cors(NextResponse.json({ ok: true }))
    }

    // ---- CREDIT CARD spend ----
    if (route === '/finance/credit_card_transactions' && method === 'POST') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const body = await request.json()
      const cardId = body.credit_card_id, amount = Number(body.amount)
      if (!cardId || !(amount > 0)) return cors(NextResponse.json({ error: 'credit_card_id and amount required' }, { status: 400 }))
      const { data: card } = await supabase.from('credit_cards').select('id').eq('id', cardId).eq('user_id', user.id).maybeSingle()
      if (!card) return cors(NextResponse.json({ error: 'Card not found' }, { status: 404 }))
      const payload = { ...pickFields('credit_card_transactions', body), user_id: user.id }
      if (!payload.time) payload.time = new Date().toTimeString().slice(0, 5)
      if (!payload.date) payload.date = new Date().toISOString().slice(0, 10)
      const { data: created, error } = await supabase.from('credit_card_transactions').insert(payload).select().single()
      if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
      // Atomic UPDATE (drizzle/0043_credit_card_outstanding_atomic.sql) instead of a read-then-
      // write — a concurrent update to this card can no longer silently overwrite this one.
      await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: cardId, p_delta: amount })
      return cors(NextResponse.json(created))
    }
    if (route.startsWith('/finance/credit_card_transactions/') && method === 'DELETE') {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const id = route.split('/').pop()
      const { data: cct } = await supabase.from('credit_card_transactions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (cct && cct.status !== 'paid') {
        await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: cct.credit_card_id, p_delta: -Number(cct.amount) })
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

    // ---- SCHOLARSHIP / SCHOLARSHIP PAYMENT attachment: signed URL for viewing, and delete ----
    // Same shape as the transaction attachment route above, just parameterized by table.
    const scholarshipAttachmentMatch = route.match(/^\/finance\/(scholarships|scholarship_payments)\/([^/]+)\/attachment$/)
    if (scholarshipAttachmentMatch && (method === 'GET' || method === 'DELETE')) {
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
      const [, table, recordId] = scholarshipAttachmentMatch
      const { data: row } = await supabase.from(table).select('attachment_path').eq('id', recordId).eq('user_id', user.id).maybeSingle()
      if (!row?.attachment_path) return cors(NextResponse.json({ error: 'No attachment' }, { status: 404 }))

      if (method === 'GET') {
        const { data: signed, error } = await supabase.storage.from('attachments').createSignedUrl(row.attachment_path, 300)
        if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
        return cors(NextResponse.json({ url: signed.signedUrl }))
      }

      await supabase.storage.from('attachments').remove([row.attachment_path])
      await supabase.from(table).update({ attachment_path: null, attachment_name: null }).eq('id', recordId).eq('user_id', user.id)
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
      const { data: card } = await supabase.from('credit_cards').select('name').eq('id', cardId).eq('user_id', user.id).maybeSingle()
      if (!card) return cors(NextResponse.json({ error: 'Card not found' }, { status: 404 }))
      const now = new Date()
      const billCategoryId = await ensureCategory(supabase, user.id, 'Credit card bill', 'expense')
      const txPayload = { user_id: user.id, account_id: body.account_id, amount, type: 'expense', description: `Credit card bill · ${card.name}`, category_id: billCategoryId, date: body.date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), notes: body.notes || null }
      const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
      // Atomic UPDATE (drizzle/0043_credit_card_outstanding_atomic.sql) — new_outstanding below
      // is the DB's own post-update value, not a locally-recomputed guess.
      const { data: newOutstanding } = await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: cardId, p_delta: -amount })
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
          return cors(NextResponse.json(stripKiteSecrets(created)))
        }
        return cors(NextResponse.json(stripKiteSecrets(row)))
      }
      const body = await request.json()
      const payload = pickFields('profiles', body)
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!existing) {
        const { data: created } = await supabase.from('profiles').insert({ id: user.id, ...payload }).select().single()
        return cors(NextResponse.json(stripKiteSecrets(created)))
      }
      const { data: updated } = await supabase.from('profiles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', user.id).select().maybeSingle()
      return cors(NextResponse.json(stripKiteSecrets(updated)))
    }

    // ---- PORTFOLIO: add_funds / withdraw_funds now live at
    // app/api/finance/portfolios/[id]/add_funds/route.js and .../withdraw_funds/route.js —
    // real per-resource route files take precedence over this catch-all automatically.

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
          await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: payingCardId, p_delta: amount })
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
          await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: linkedTx.linked_module_id, p_delta: -Number(linkedTx.amount) })
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
    // Only tables with bespoke logic living at this same base path (or, for transactions, the
    // central cross-domain hub) still route through here — every other table has a real,
    // dedicated route file under app/api/finance/<table>/ now (see lib/server/genericCrud.js).
    const collectionMatch = route.match(/^\/finance\/(transactions|loan_payments|credit_card_transactions|scholarship_payments)(?:\/([^/]+))?$/)
    if (collectionMatch) {
      const [, table, id] = collectionMatch
      const user = await currentUser(supabase)
      if (!user) return cors(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))

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
        if (table === 'transactions' && !payload.time) payload.time = new Date().toTimeString().slice(0, 5)
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
          const delta = body.type === 'income' ? -Number(created.amount) : Number(created.amount)
          await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: body.linked_module_id, p_delta: delta })
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
            const delta = oldRow.type === 'income' ? Number(oldRow.amount) : -Number(oldRow.amount)
            await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: oldRow.linked_module_id, p_delta: delta })
          }
          if (updated.linked_module === 'credit_card' && updated.linked_module_id) {
            const delta = updated.type === 'income' ? -Number(updated.amount) : Number(updated.amount)
            await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: updated.linked_module_id, p_delta: delta })
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
            const delta = row.type === 'income' ? Number(row.amount) : -Number(row.amount)
            await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: row.linked_module_id, p_delta: delta })
          }
          // Reverse the lend/borrow repayment this transaction had recorded
          if (row?.linked_module === 'lend' && row.linked_module_id) {
            await reverseLendRepayment(supabase, user.id, id, row.linked_module_id, row.amount)
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
