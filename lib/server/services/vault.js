import { pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { encryptVaultPayload, decryptVaultPayload } from '@/lib/server/vaultCrypto'

// vault_items is deliberately NOT routed through the generic CRUD engine (genericCrud.js) — every
// other table there does a plain select('*')/insert(pickFields(...)), which is wrong here: reads
// must never leak encrypted_payload to the client, and writes must encrypt the caller's plaintext
// `secrets` before it ever reaches the database, not just whitelist which raw columns are settable.

const stripSecret = ({ encrypted_payload, ...rest }) => rest

export async function listVaultItems(supabase, user) {
  const { data } = await applyOrder(supabase.from('vault_items').select('*').eq('user_id', user.id), 'vault_items')
  return (data || []).map(stripSecret)
}

export async function getVaultItem(supabase, user, id) {
  const { data } = await supabase.from('vault_items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  return data ? stripSecret(data) : null
}

export async function createVaultItem(supabase, user, body) {
  const payload = { ...pickFields('vault_items', body), user_id: user.id, encrypted_payload: encryptVaultPayload(body.secrets || {}) }
  const { data: created, error } = await supabase.from('vault_items').insert(payload).select().single()
  if (error) return { error }
  return { created: stripSecret(created) }
}

export async function updateVaultItem(supabase, user, id, body) {
  const patch = pickFields('vault_items', body)
  // Only present when the caller actually changed a secret field (the edit form pre-fills via
  // reveal, so it always sends the complete object rather than a partial diff) — omitted, the
  // existing ciphertext is left untouched so editing just the label/color needs no re-entry.
  if (body.secrets) patch.encrypted_payload = encryptVaultPayload(body.secrets)
  const { data: updated, error } = await supabase.from('vault_items').update(patch).eq('id', id).eq('user_id', user.id).select().maybeSingle()
  if (error) return { error }
  return { updated: updated ? stripSecret(updated) : null }
}

export async function deleteVaultItem(supabase, user, id) {
  const { error } = await supabase.from('vault_items').delete().eq('id', id).eq('user_id', user.id)
  return { ok: !error }
}

export async function revealVaultItem(supabase, user, id) {
  const { data: row } = await supabase.from('vault_items').select('encrypted_payload').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!row) return null
  return decryptVaultPayload(row.encrypted_payload)
}
