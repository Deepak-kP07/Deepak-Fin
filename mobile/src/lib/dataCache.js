import { File, Paths } from 'expo-file-system'

// The last /finance/summary, kept in the app's private storage so the app opens straight onto the
// user's data (and still shows it with no connection) while a fresh copy loads in the background.
// One file per user, deleted on sign-out. Vault secrets are never in the summary to begin with.
const fileFor = (userId) => new File(Paths.document, `summary-${userId}.json`)

export async function readCachedSummary(userId) {
  try {
    const f = fileFor(userId)
    if (!f.exists) return null
    const parsed = JSON.parse(await f.text())
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

export async function writeCachedSummary(userId, summary) {
  try {
    const f = fileFor(userId)
    if (!f.exists) f.create()
    await f.write(JSON.stringify({ ...summary, cached_at: new Date().toISOString() }))
  } catch { /* a missing cache only costs a slower next launch */ }
}

export function clearCachedSummary(userId) {
  try { const f = fileFor(userId); if (f.exists) f.delete() } catch {}
}
