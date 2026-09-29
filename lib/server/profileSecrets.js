// Columns on `profiles` that must never reach the browser: a bearer-like live Kite token and an
// encrypted Kite secret (kite_api_key is fine — Zerodha puts it in login redirect URLs), plus the
// hidden-transactions PIN hash and its lockout counters. The client only needs to know whether a
// PIN is set.
export function stripProfileSecrets(row) {
  if (!row) return row
  const { kite_access_token, kite_api_secret_encrypted, hidden_pin_hash, hidden_pin_failed_attempts, hidden_pin_locked_until, ...rest } = row
  return { ...rest, has_hidden_pin: !!hidden_pin_hash }
}
