// One-time cleanup: removes `cvv` and `pin` from every existing vault item's encrypted payload.
// New saves already strip them (lib/server/services/vault.js), and a reveal cleans up the item it
// opens, but items nobody opens again would otherwise keep them forever.
//
// Run once from the project root:   node scripts/purge-vault-cvv-pin.mjs
// Add --dry-run to only report how many items would change.
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VAULT_ENCRYPTION_KEY in .env.
// The encrypt/decrypt below must stay identical to lib/server/vaultCrypto.js.
import 'dotenv/config'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')
const key = Buffer.from(process.env.VAULT_ENCRYPTION_KEY || '', 'base64')
if (key.length !== 32) throw new Error('VAULT_ENCRYPTION_KEY is missing or must decode to 32 bytes')

function decrypt(encoded) {
  const [iv, tag, data] = String(encoded || '').split(':')
  if (!iv || !tag || !data) return null
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return JSON.parse(Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8'))
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()])
  return `${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), { auth: { persistSession: false } })
const { data: rows, error } = await supabase.from('vault_items').select('id, encrypted_payload')
if (error) throw error

let changed = 0
for (const row of rows) {
  const secrets = decrypt(row.encrypted_payload)
  if (!secrets || !('cvv' in secrets || 'pin' in secrets)) continue
  delete secrets.cvv
  delete secrets.pin
  changed++
  if (dryRun) continue
  const { error: updateError } = await supabase.from('vault_items').update({ encrypted_payload: encrypt(secrets) }).eq('id', row.id)
  if (updateError) throw updateError
}
console.log(`${rows.length} vault items checked, ${changed} ${dryRun ? 'would be ' : ''}cleaned.`)
