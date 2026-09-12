import { db } from './db'

// For each table that can be created offline, which other tables' rows might reference its id
// (and in which fields) before it has a real server id — checked and rewritten once that id
// comes back. Deliberately not a general FK graph, just the specific pairs Phase 3/5's offline
// scope actually creates: an offline transaction can reference an offline account/category, an
// offline holding/SIP/other-investment can reference an offline portfolio.
const REFERENCING_FIELDS = {
  accounts: { transactions: ['account_id', 'to_account_id'] },
  categories: { transactions: ['category_id'] },
  portfolios: { holdings: ['portfolio_id'], sips: ['portfolio_id'], other_investments: ['portfolio_id'] },
}

const endpointFor = (table, id) => (id ? `/api/finance/${table}/${id}` : `/api/finance/${table}`)

// Mirrors the couple of trivial, deterministic defaults the server sets on create
// (genericCrud.js) that the optimistic record needs too, or it's missing a field the rest of the
// UI reads (e.g. current_balance) — not derived/computed math (that's deliberately never
// guessed, see Phase 3's design notes), just the same starting value already in the payload.
function applyCreateDefaults(table, body) {
  if (table === 'accounts' && body.opening_balance !== undefined && body.current_balance === undefined) {
    return { ...body, current_balance: body.opening_balance }
  }
  if (table === 'credit_cards' && body.current_outstanding === undefined) {
    return { ...body, current_outstanding: 0 }
  }
  if (table === 'money_profiles' && body.status === undefined) {
    return { ...body, status: 'active' }
  }
  // Not derived math — just standing in for the server's own now() default so the optimistic
  // record has a `created_at` to compute its 30-day wait from immediately; the real timestamp
  // (which will differ by a negligible amount) overwrites this once the create flushes.
  if (table === 'bucket_list' && body.created_at === undefined) {
    return { ...body, created_at: new Date().toISOString() }
  }
  return body
}

function applyOptimistic(list, method, id, record) {
  if (method === 'DELETE') return list.filter((r) => r.id !== id)
  if (method === 'POST') return [...list, record]
  return list.map((r) => (r.id === id ? { ...r, ...record } : r))
}

export function getPendingCount() {
  return db.table('outbox').count()
}

async function syncPendingCount(setPendingCount) {
  if (setPendingCount) setPendingCount(await getPendingCount())
}

// Rewrites every place a just-reconciled temp id was referenced — the record's own id, any
// transaction rows holding it as a foreign key (in both `data` and Dexie), any still-queued
// outbox entries for OTHER tables whose body hasn't been sent yet, and — just as importantly —
// any still-queued outbox entries for THIS SAME table targeting that temp id directly (e.g. an
// edit or delete queued against a record created earlier in the same offline session) — without
// this, such an entry would flush against a recordId that never existed on the server, silently
// never taking effect.
async function reconcileTempId(table, tempId, realId, setData) {
  const record = await db.table(table).get(tempId)
  if (record) {
    await db.table(table).delete(tempId)
    await db.table(table).put({ ...record, id: realId })
  }
  setData((d) => ({ ...d, [table]: (d[table] || []).map((r) => (r.id === tempId ? { ...r, id: realId } : r)) }))

  const pending = await db.table('outbox').toArray()
  await Promise.all(pending.map((entry) => (
    entry.table === table && entry.recordId === tempId
      ? db.table('outbox').update(entry.localId, { recordId: realId })
      : null
  )).filter(Boolean))

  const referencingTables = REFERENCING_FIELDS[table]
  if (!referencingTables) return
  for (const [targetTable, fields] of Object.entries(referencingTables)) {
    const patch = (row) => {
      let changed = false
      const next = { ...row }
      for (const f of fields) if (next[f] === tempId) { next[f] = realId; changed = true }
      return changed ? next : row
    }
    setData((d) => ({ ...d, [targetTable]: (d[targetTable] || []).map(patch) }))
    const rows = await db.table(targetTable).toArray()
    await Promise.all(rows.map((r) => { const p = patch(r); return p !== r ? db.table(targetTable).put(p) : null }).filter(Boolean))
    await Promise.all(pending.map((entry) => {
      if (entry.table !== targetTable || !entry.body) return null
      const p = patch(entry.body)
      return p !== entry.body ? db.table('outbox').update(entry.localId, { body: p }) : null
    }).filter(Boolean))
  }
}

// Replays one already-queued outbox entry. Used for whatever's left over from a previous
// offline session — the common online case never reaches this, since createMutate below tries
// the real request directly first and only queues on genuine failure.
async function flushOne(entry, setData) {
  const { localId, table, method, recordId, tempId, body } = entry
  try {
    const endpoint = method === 'POST' ? endpointFor(table) : endpointFor(table, recordId)
    const response = await fetch(endpoint, {
      method,
      headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      // A real rejection (bad data, the row was deleted server-side, etc.) once we're actually
      // online — vs. a network failure, handled below — should stop retrying and say so, not
      // spin forever on something that will never succeed.
      if (response.status >= 400 && response.status < 500) {
        window.dispatchEvent(new CustomEvent('outbox:sync-issue', { detail: { table, method } }))
        await db.table('outbox').delete(localId)
        return false
      }
      return false
    }
    if (method !== 'DELETE') {
      const result = await response.json()
      if (tempId && result?.id && result.id !== tempId) await reconcileTempId(table, tempId, result.id, setData)
    }
    await db.table('outbox').delete(localId)
    return true
  } catch (e) {
    return false // offline (or a transient network error) — leave it queued, try again later
  }
}

let flushing = false
export async function flushOutbox(setData, setPendingCount) {
  if (flushing) return
  flushing = true
  try {
    for (;;) {
      const entry = await db.table('outbox').orderBy('localId').first()
      if (!entry) break
      const ok = await flushOne(entry, setData)
      await syncPendingCount(setPendingCount)
      if (!ok) break // preserve FIFO order — don't skip ahead to a later entry
    }
  } finally {
    flushing = false
  }
}

export function createMutate(setData, setPendingCount) {
  return async function mutate({ table, method, id, body }) {
    // Online: try the real request directly first, same as before Phase 3 existed. If it
    // succeeds, the caller gets the real server record straight back (some callers — e.g. an
    // attachment upload right after a transaction save — need a real, already-persisted id and
    // can't work against a temp one). Only a genuine network failure (or being offline to begin
    // with) falls through to the optimistic-queue path below.
    if (typeof navigator === 'undefined' || navigator.onLine) {
      let response = null
      try {
        response = await fetch(method === 'POST' ? endpointFor(table) : endpointFor(table, id), {
          method,
          headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
          body: method === 'DELETE' ? undefined : JSON.stringify(body),
        })
      } catch (e) { response = null } // network failure even though navigator.onLine said true

      if (response) {
        if (response.ok) {
          const result = method === 'DELETE' ? null : await response.json()
          // A transfer create returns TWO rows (createTransaction, lib/server/services/transactions.js)
          // — every other create/update here returns one. Treating that array like a single record
          // (result.id undefined, db.table(table).put(an array)) is exactly what used to throw
          // Dexie's "Evaluating the object store's key path did not yield a value": the request had
          // already succeeded server-side by that point, so retrying after seeing the error created
          // a second real transfer — this branch is what actually fixes that, not just silences it.
          // The local IndexedDB write below is a cache mirror only, kept in sync for offline
          // reads — it's never awaited before returning. The server already confirmed the
          // write (this is the online-success branch) and setData() above already applied it
          // to the UI, so there's nothing left for the caller to correctly wait on. Awaiting it
          // used to mean a save()/deleteTx() call — and the form-close/toast/busy-flag that
          // waits on it — could sit blocked for however long saveSnapshot()'s much bigger
          // background rewrite (triggered by a *previous* save's refresh(), see app/page.js's
          // onTxSaved) was still holding that table's IndexedDB transaction open, since Dexie
          // queues a table's writes in submission order. Same silent-failure handling as
          // saveSnapshot's own call site already uses (`saveSnapshot(snapshot).catch(() => {})`
          // in refresh()) — a local cache write failing here was never grounds to tell the user
          // their already-server-confirmed save/delete failed.
          if (Array.isArray(result)) {
            setData((d) => ({ ...d, [table]: [...(d[table] || []), ...result] }))
            db.table(table).bulkPut(result).catch(() => {})
            return { record: result[0], queued: false }
          }
          const finalId = method === 'DELETE' ? id : result.id
          setData((d) => ({ ...d, [table]: applyOptimistic(d[table] || [], method, finalId, result) }))
          ;(method === 'DELETE' ? db.table(table).delete(id) : db.table(table).put(result)).catch(() => {})
          return { record: result, queued: false }
        }
        if (response.status >= 400 && response.status < 500) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(errBody.error || errBody.message || 'Could not save')
        }
        // 5xx — treat like a network failure and fall through to the queue below.
      }
    }

    // Offline (or the direct attempt above failed to even reach the server) — apply optimistically
    // and queue for later. Client-generated temp id for creates, so something created against it
    // moments later (e.g. a transaction against an offline-created account) can reference it
    // before either has a real server id.
    const isCreate = method === 'POST' && !id
    const recordId = isCreate ? crypto.randomUUID() : id
    const record = method === 'DELETE' ? null : { ...(isCreate ? applyCreateDefaults(table, body) : body), id: recordId }
    setData((d) => ({ ...d, [table]: applyOptimistic(d[table] || [], method, recordId, record) }))
    if (method === 'DELETE') await db.table(table).delete(recordId)
    else await db.table(table).put(record)

    await db.table('outbox').add({ table, method, recordId, tempId: isCreate ? recordId : null, body, createdAt: Date.now() })
    await syncPendingCount(setPendingCount)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => reg.sync?.register('outbox-flush')).catch(() => {})
    }
    return { record, queued: true }
  }
}

// One place for the online/visibility/service-worker triggers that re-attempt a flush — called
// once from Shell's mount effect. Returns a cleanup function for the effect's teardown.
export function registerAutoFlush(setData, setPendingCount) {
  const attempt = () => { if (navigator.onLine) flushOutbox(setData, setPendingCount).catch(() => {}) }
  window.addEventListener('online', attempt)
  document.addEventListener('visibilitychange', attempt)
  let onMessage
  if ('serviceWorker' in navigator) {
    onMessage = (event) => { if (event.data?.type === 'FLUSH_OUTBOX') attempt() }
    navigator.serviceWorker.addEventListener('message', onMessage)
  }
  return () => {
    window.removeEventListener('online', attempt)
    document.removeEventListener('visibilitychange', attempt)
    if (onMessage) navigator.serviceWorker.removeEventListener('message', onMessage)
  }
}
