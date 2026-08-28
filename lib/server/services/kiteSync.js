// Real Zerodha holdings + cash sync — distinct from the LTP-only quote fetch in
// POST /finance/prices, which never reads a user's actual broker positions. Holdings/cash
// synced from here are tagged source: 'kite' so the holdings_sync_portfolio_cash DB trigger
// (drizzle/0007_portfolio_cash_trigger.sql, extended in 0008_kite_sync_trigger.sql) leaves
// cash_balance alone for them — that balance comes from Kite's own margins instead.

import { detectAssetType } from '@/lib/investmentAssetType'

// Zerodha invalidates every Kite Connect access token at a fixed daily cutoff (~6 AM IST) —
// not a rolling duration from login. A flat "N hours since issued" check gets this wrong in
// both directions: a token issued at 2 PM actually only lasts ~16 hours (well under any generous
// rolling window, so it reads "fresh" long after Zerodha has already killed it — causing the
// next sync/quote call to fail instead of proactively prompting reconnect), while one issued at
// 5 AM lasts under an hour. This computes the real cutoff instead of approximating it.
const KITE_DAILY_CUTOFF_IST_HOUR = 6
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function isKiteTokenFresh(accessToken, accessTokenAt) {
  if (!accessToken || !accessTokenAt) return false
  const issuedIst = new Date(new Date(accessTokenAt).getTime() + IST_OFFSET_MS)
  const cutoffIst = new Date(Date.UTC(issuedIst.getUTCFullYear(), issuedIst.getUTCMonth(), issuedIst.getUTCDate(), KITE_DAILY_CUTOFF_IST_HOUR, 0, 0, 0))
  if (issuedIst.getTime() >= cutoffIst.getTime()) cutoffIst.setUTCDate(cutoffIst.getUTCDate() + 1)
  return Date.now() < cutoffIst.getTime() - IST_OFFSET_MS
}

function kiteHeaders(apiKey, accessToken) {
  return { 'X-Kite-Version': '3', Authorization: `token ${apiKey}:${accessToken}` }
}

export async function fetchKiteHoldings(apiKey, accessToken) {
  const res = await fetch('https://api.kite.trade/portfolio/holdings', { headers: kiteHeaders(apiKey, accessToken), cache: 'no-store' })
  if (!res.ok) throw new Error(`Kite holdings fetch failed (${res.status})`)
  const body = await res.json()
  return Array.isArray(body?.data) ? body.data : []
}

export async function fetchKiteMargins(apiKey, accessToken) {
  const res = await fetch('https://api.kite.trade/user/margins/equity', { headers: kiteHeaders(apiKey, accessToken), cache: 'no-store' })
  if (!res.ok) throw new Error(`Kite margins fetch failed (${res.status})`)
  const body = await res.json()
  return body?.data || null
}

async function kiteGet(apiKey, accessToken, path) {
  const res = await fetch(`https://api.kite.trade${path}`, { headers: kiteHeaders(apiKey, accessToken), cache: 'no-store' })
  if (!res.ok) throw new Error(`Kite request failed: ${path} (${res.status})`)
  const body = await res.json()
  return Array.isArray(body?.data) ? body.data : (body?.data ?? [])
}

export const fetchKiteMfHoldings = (apiKey, accessToken) => kiteGet(apiKey, accessToken, '/mf/holdings')
// The list of active/paused SIP mandates — merged into synced MF holdings to fill in
// monthly_amount/start_date, which /mf/holdings alone doesn't carry.
export const fetchKiteMfSips = (apiKey, accessToken) => kiteGet(apiKey, accessToken, '/mf/sips')
// Equity order book is transient — Kite's own docs: "only lives for a day in the system."
export const fetchKiteOrders = (apiKey, accessToken) => kiteGet(apiKey, accessToken, '/orders')
export const fetchKiteTrades = (apiKey, accessToken) => kiteGet(apiKey, accessToken, '/trades')
// Mutual fund orders retain a 7-day window (per Kite's docs), better than equity's one day.
export const fetchKiteMfOrders = (apiKey, accessToken) => kiteGet(apiKey, accessToken, '/mf/orders')

// Pure — no I/O — so it can be exercised with fabricated Kite-shaped fixtures without a live
// call. `existingKiteRows` is this portfolio's current source:'kite' holdings; `kiteHoldings`
// is the fresh array straight from fetchKiteHoldings.
export function reconcileHoldings(existingKiteRows, kiteHoldings) {
  const key = (exchange, symbol) => `${exchange}:${symbol}`
  const existingByKey = new Map(existingKiteRows.map((h) => [key(h.exchange, h.symbol), h]))
  const freshKeys = new Set()
  const toInsert = []
  const toUpdate = []

  for (const row of kiteHoldings) {
    const exchange = row.exchange
    const symbol = row.tradingsymbol
    const qty = Number(row.quantity || 0) + Number(row.t1_quantity || 0)
    if (qty <= 0) continue // fully sold, nothing to show
    const k = key(exchange, symbol)
    freshKeys.add(k)
    const shape = {
      symbol, exchange, company_name: null, qty,
      avg_buy_price: Number(row.average_price || 0), current_price: Number(row.last_price || row.average_price || 0),
      last_price_updated_at: new Date().toISOString(), source: 'kite',
      kite_instrument_token: row.instrument_token != null ? String(row.instrument_token) : null,
    }
    const existing = existingByKey.get(k)
    // asset_type is only stamped on a brand-new row — an existing row keeps whatever it already
    // has (auto-detected before, or manually corrected via Edit), so a routine sync can never
    // silently overwrite a user's own classification.
    if (existing) toUpdate.push({ id: existing.id, ...shape })
    else toInsert.push({ ...shape, asset_type: detectAssetType(symbol) })
  }

  const toDelete = existingKiteRows.filter((h) => !freshKeys.has(key(h.exchange, h.symbol))).map((h) => h.id)
  return { toInsert, toUpdate, toDelete }
}

// Same shape as reconcileHoldings, matched on Kite's own folio number instead of
// exchange+symbol (a mutual fund holding doesn't have an "exchange" the way equities do).
// `mfSips` is only used to fill in monthly_amount/start_date for a folio that has an active
// SIP mandate behind it — a pure lumpsum holding just won't have those fields.
export function reconcileMfHoldings(existingKiteRows, mfHoldings, mfSips = [], portfolioId = null) {
  const existingByFolio = new Map(existingKiteRows.map((h) => [h.folio_number, h]))
  const freshFolios = new Set()
  const toInsert = []
  const toUpdate = []

  for (const row of mfHoldings) {
    const qty = Number(row.quantity || 0)
    if (qty <= 0) continue // fully redeemed
    const folio = row.folio
    freshFolios.add(folio)
    const activeSip = mfSips.find((s) => s.tradingsymbol === row.tradingsymbol && String(s.status || '').toUpperCase() === 'ACTIVE')
    const shape = {
      fund_name: row.fund, folio_number: folio, units_held: qty,
      nav: Number(row.last_price || 0), average_price: Number(row.average_price || 0),
      current_value: qty * Number(row.last_price || 0),
      monthly_amount: activeSip ? Number(activeSip.instalment_amount || 0) : 0,
      start_date: activeSip?.created ? activeSip.created.slice(0, 10) : undefined,
      source: 'kite', last_synced_at: new Date().toISOString(),
      // Same Zerodha account the linked equity portfolio mirrors — stamped fresh on every sync
      // so it self-heals if the linked portfolio ever changes (or becomes unlinked, in which
      // case this is null and existing rows fall back to unassociated on their next sync).
      portfolio_id: portfolioId,
    }
    const existing = existingByFolio.get(folio)
    if (existing) toUpdate.push({ id: existing.id, ...shape })
    else toInsert.push({ ...shape, start_date: shape.start_date || new Date().toISOString().slice(0, 10) })
  }

  const toDelete = existingKiteRows.filter((h) => !freshFolios.has(h.folio_number)).map((h) => h.id)
  return { toInsert, toUpdate, toDelete }
}

// Shared by every sync function below — a stale/missing token means "nothing to do," not an
// exception, so callers get back a plain access_token or null rather than a thrown error.
// apiKey comes back alongside it since it's each user's own Kite Connect app when they've set
// one, falling back to the app owner's KITE_API_KEY otherwise — a fresh token is worthless
// without the key it was issued to, and this must match whichever key actually issued it.
async function freshKiteToken(supabase, userId) {
  const { data: profile } = await supabase.from('profiles').select('kite_access_token,kite_access_token_at,kite_api_key').eq('id', userId).maybeSingle()
  const accessToken = isKiteTokenFresh(profile?.kite_access_token, profile?.kite_access_token_at) ? profile.kite_access_token : null
  return { accessToken, apiKey: profile?.kite_api_key || process.env.KITE_API_KEY || null, rawTokenAt: profile?.kite_access_token_at || null, hasSavedToken: !!profile?.kite_access_token }
}

// Spells out WHY a token reads as stale/missing — "no token was ever saved" vs. "one exists,
// issued at X, but that's past its cutoff" are different bugs to chase, and the generic message
// alone can't tell them apart from the outside.
function staleTokenMessage(rawTokenAt, hasSavedToken) {
  const base = 'Kite isn’t connected (or the token has gone stale) — reconnect from Investments first.'
  if (!hasSavedToken) return `${base} (debug: no token saved on this profile)`
  return `${base} (debug: token saved at ${rawTokenAt}, read as stale against now = ${new Date().toISOString()})`
}

export async function syncPortfolioFromKite(supabase, userId, portfolioId) {
  const { accessToken, apiKey, rawTokenAt, hasSavedToken } = await freshKiteToken(supabase, userId)
  if (!accessToken) return { error: { message: staleTokenMessage(rawTokenAt, hasSavedToken) } }

  const { data: portfolio } = await supabase.from('portfolios').select('*').eq('id', portfolioId).eq('user_id', userId).maybeSingle()
  if (!portfolio) return { error: { message: 'Portfolio not found', status: 404 } }
  if (!portfolio.kite_linked) return { error: { message: 'This portfolio isn’t linked to Kite.' } }

  let kiteHoldings, margins
  try {
    ;[kiteHoldings, margins] = await Promise.all([
      fetchKiteHoldings(apiKey, accessToken),
      fetchKiteMargins(apiKey, accessToken).catch(() => null), // cash sync is best-effort, holdings sync isn't
    ])
  } catch (e) {
    // A failed fetch must be a no-op, never a data-loss event — nothing gets inserted, updated,
    // or (critically) deleted just because Kite's API hiccuped. It DOES mean the connection is
    // genuinely broken though (bad/mismatched token, most likely) — flagged so the UI can show
    // "Reconnect" instead of pretending everything's fine.
    await supabase.from('profiles').update({ kite_last_error: e.message }).eq('id', userId)
    return { error: { message: `Couldn't reach Kite: ${e.message}` } }
  }
  await supabase.from('profiles').update({ kite_last_error: null }).eq('id', userId)

  const { data: existingKiteRows } = await supabase.from('holdings').select('*').eq('portfolio_id', portfolioId).eq('user_id', userId).eq('source', 'kite')
  const { toInsert, toUpdate, toDelete } = reconcileHoldings(existingKiteRows || [], kiteHoldings)

  if (toInsert.length) await supabase.from('holdings').insert(toInsert.map((h) => ({ ...h, portfolio_id: portfolioId, user_id: userId })))
  // One upsert instead of one round trip per changed holding — every update row already carries
  // its own id, so this always hits the ON CONFLICT branch, never a fresh insert.
  if (toUpdate.length) await supabase.from('holdings').upsert(toUpdate.map((h) => ({ ...h, portfolio_id: portfolioId, user_id: userId })), { onConflict: 'id' })
  if (toDelete.length) await supabase.from('holdings').delete().in('id', toDelete).eq('user_id', userId)

  const cashUpdate = { last_kite_sync_at: new Date().toISOString() }
  if (margins?.available?.cash != null) cashUpdate.cash_balance = Number(margins.available.cash)
  await supabase.from('portfolios').update(cashUpdate).eq('id', portfolioId).eq('user_id', userId)

  return { added: toInsert.length, updated: toUpdate.length, removed: toDelete.length, cash_balance: cashUpdate.cash_balance ?? Number(portfolio.cash_balance || 0) }
}

// User-level, not portfolio-scoped by table design (sips has no NOT NULL portfolio_id — plenty
// of SIPs won't belong to one), but a Kite-sourced row gets tagged with whichever portfolio is
// currently kite_linked, since that's literally the same Zerodha account.
export async function syncMutualFundsFromKite(supabase, userId) {
  const { accessToken, apiKey, rawTokenAt, hasSavedToken } = await freshKiteToken(supabase, userId)
  if (!accessToken) return { error: { message: staleTokenMessage(rawTokenAt, hasSavedToken) } }

  try {
    const mfHoldings = await fetchKiteMfHoldings(apiKey, accessToken)
    const mfSips = await fetchKiteMfSips(apiKey, accessToken).catch(() => []) // best-effort — only enriches monthly_amount/start_date

    const { data: linkedPortfolio } = await supabase.from('portfolios').select('id').eq('user_id', userId).eq('kite_linked', true).maybeSingle()
    const { data: existingKiteRows } = await supabase.from('sips').select('*').eq('user_id', userId).eq('source', 'kite')
    const { toInsert, toUpdate, toDelete } = reconcileMfHoldings(existingKiteRows || [], mfHoldings, mfSips, linkedPortfolio?.id || null)

    if (toInsert.length) await supabase.from('sips').insert(toInsert.map((s) => ({ ...s, user_id: userId })))
    if (toUpdate.length) await supabase.from('sips').upsert(toUpdate.map((s) => ({ ...s, user_id: userId })), { onConflict: 'id' })
    if (toDelete.length) await supabase.from('sips').delete().in('id', toDelete).eq('user_id', userId)

    await supabase.from('profiles').update({ kite_last_error: null }).eq('id', userId)
    return { added: toInsert.length, updated: toUpdate.length, removed: toDelete.length }
  } catch (e) {
    await supabase.from('profiles').update({ kite_last_error: e.message }).eq('id', userId)
    return { error: { message: `Couldn't reach Kite: ${e.message}` } }
  } finally {
    // Stamped on every attempt — success or failure alike — so a broken/expired token doesn't
    // cause a re-attempt on every single app action; it just waits out the same 30-min window
    // as a successful sync would. Never skipped, unlike the data writes above.
    await supabase.from('profiles').update({ kite_mf_synced_at: new Date().toISOString() }).eq('id', userId)
  }
}

// Purely additive — nothing is ever deleted from kite_orders, so unlike holdings/MF sync a
// partial fetch failure (one segment down, another up) is harmless: whatever succeeded still
// gets recorded, upserted idempotently by Kite's own order id so repeat polling can't duplicate.
export async function syncKiteOrders(supabase, userId) {
  const { accessToken, apiKey, rawTokenAt, hasSavedToken } = await freshKiteToken(supabase, userId)
  if (!accessToken) return { error: { message: staleTokenMessage(rawTokenAt, hasSavedToken) } }

  const [orders, mfOrders] = await Promise.all([
    fetchKiteOrders(apiKey, accessToken).catch(() => []),
    fetchKiteMfOrders(apiKey, accessToken).catch(() => []),
  ])

  const rows = [
    ...orders.map((o) => ({
      user_id: userId, kite_order_id: o.order_id, segment: 'equity', tradingsymbol: o.tradingsymbol, exchange: o.exchange,
      transaction_type: o.transaction_type, quantity: Number(o.quantity || 0), price: Number(o.price || 0),
      average_price: Number(o.average_price || 0), status: o.status, order_timestamp: o.order_timestamp || null,
      fund: null, folio: null,
    })),
    ...mfOrders.map((o) => ({
      user_id: userId, kite_order_id: o.order_id, segment: 'mf', tradingsymbol: o.tradingsymbol, exchange: null,
      transaction_type: o.transaction_type, quantity: Number(o.quantity || 0), price: Number(o.price || 0),
      average_price: Number(o.average_price || 0), status: o.status, order_timestamp: o.order_timestamp || null,
      fund: o.fund || null, folio: o.folio || null,
    })),
  ]

  if (rows.length) await supabase.from('kite_orders').upsert(rows, { onConflict: 'user_id,kite_order_id' })
  // Same reasoning as syncMutualFundsFromKite — stamped on every attempt, not derived from
  // kite_orders row data, so a day with zero orders doesn't get re-polled on every app action.
  await supabase.from('profiles').update({ kite_orders_synced_at: new Date().toISOString() }).eq('id', userId)
  return { synced: rows.length }
}
