import crypto from 'crypto'

// AES-256-GCM, one ciphertext blob per vault item holding a JSON object of that item's secret
// fields (rather than one encrypted column per field) — GCM needs a fresh IV per encryption
// anyway, so an edit that changes any secret just means "decrypt, merge, re-encrypt whole
// object" server-side. Encoded as `iv:tag:ciphertext`, each base64, so it round-trips through a
// single `text` column.
const ALGO = 'aes-256-gcm'

function getKey() {
  const key = Buffer.from(process.env.VAULT_ENCRYPTION_KEY || '', 'base64')
  if (key.length !== 32) throw new Error('VAULT_ENCRYPTION_KEY is missing or must decode to 32 bytes (generate with: openssl rand -base64 32)')
  return key
}

export function encryptVaultPayload(plainObj) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(plainObj), 'utf8'), cipher.final()])
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptVaultPayload(encoded) {
  const [ivB64, tagB64, dataB64] = String(encoded || '').split(':')
  if (!ivB64 || !tagB64 || !dataB64) return null
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return JSON.parse(plaintext.toString('utf8'))
}
