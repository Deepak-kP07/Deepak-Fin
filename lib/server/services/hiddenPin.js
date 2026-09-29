import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

// The PIN that unlocks hidden transactions. Hashed with scrypt + a per-user random salt, stored as
// "salt:hash" in profiles.hidden_pin_hash. 5 wrong tries lock it for 15 minutes.
const scryptAsync = promisify(scrypt)
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15
const RESET_WINDOW_MINUTES = 10
const PIN_RE = /^\d{4,6}$/

async function hashPin(pin) {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(pin, salt, 32)).toString('hex')
  return `${salt}:${hash}`
}

async function pinMatches(pin, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const candidate = await scryptAsync(String(pin), salt, 32)
  const expected = Buffer.from(hash, 'hex')
  return expected.length === candidate.length && timingSafeEqual(expected, candidate)
}

async function loadPinState(supabase, userId) {
  const { data } = await supabase.from('profiles').select('hidden_pin_hash, hidden_pin_failed_attempts, hidden_pin_locked_until').eq('id', userId).maybeSingle()
  return data || {}
}

function lockedMinutesLeft(state) {
  const until = state.hidden_pin_locked_until ? new Date(state.hidden_pin_locked_until).getTime() : 0
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0
}

// Checks a PIN against the stored hash, counting wrong tries. Returns { ok } or { error }.
async function checkPin(supabase, userId, state, pin) {
  const minutes = lockedMinutesLeft(state)
  if (minutes) return { error: { message: `Too many wrong tries — try again in ${minutes} min.`, status: 429 } }
  if (await pinMatches(pin, state.hidden_pin_hash)) {
    if (state.hidden_pin_failed_attempts) await supabase.from('profiles').update({ hidden_pin_failed_attempts: 0, hidden_pin_locked_until: null }).eq('id', userId)
    return { ok: true }
  }
  const attempts = Number(state.hidden_pin_failed_attempts || 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    await supabase.from('profiles').update({ hidden_pin_failed_attempts: 0, hidden_pin_locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }).eq('id', userId)
    return { error: { message: `Too many wrong tries — try again in ${LOCK_MINUTES} min.`, status: 429 } }
  }
  await supabase.from('profiles').update({ hidden_pin_failed_attempts: attempts }).eq('id', userId)
  const left = MAX_ATTEMPTS - attempts
  return { error: { message: `Wrong PIN — ${left} ${left === 1 ? 'try' : 'tries'} left.`, status: 401 } }
}

export async function verifyHiddenPin(supabase, user, body) {
  const state = await loadPinState(supabase, user.id)
  if (!state.hidden_pin_hash) return { error: { message: 'No PIN set yet.', status: 400 } }
  return checkPin(supabase, user.id, state, body?.pin)
}

// Sets a first PIN or changes an existing one. A first PIN can only be set while the user has no
// hidden transactions — otherwise anyone holding the phone could set one and reveal them. After a
// "Forgot PIN" reset, hidden transactions can exist with no PIN, which is why reset is gated on a
// fresh sign-in instead.
export async function setHiddenPin(supabase, user, body) {
  const pin = String(body?.pin || '')
  if (!PIN_RE.test(pin)) return { error: { message: 'PIN must be 4 to 6 digits.', status: 400 } }
  const state = await loadPinState(supabase, user.id)
  if (state.hidden_pin_hash) {
    const check = await checkPin(supabase, user.id, state, body?.current_pin)
    if (check.error) return check
  } else if (!signedInRecently(user)) {
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_hidden', true)
    if (count > 0) return { error: { message: 'You have hidden transactions but no PIN. Sign out and back in, then set a new PIN.', status: 403 } }
  }
  const { error } = await supabase.from('profiles').update({ hidden_pin_hash: await hashPin(pin), hidden_pin_failed_attempts: 0, hidden_pin_locked_until: null }).eq('id', user.id)
  if (error) return { error }
  return { ok: true }
}

function signedInRecently(user) {
  const at = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0
  return Date.now() - at <= RESET_WINDOW_MINUTES * 60000
}

// "Forgot PIN" — clears the PIN, allowed only right after signing in again (password or Google),
// which someone who just picked up the unlocked phone can't do.
export async function resetHiddenPin(supabase, user) {
  if (!signedInRecently(user)) return { error: { message: `To reset your PIN, sign out and sign back in, then reset within ${RESET_WINDOW_MINUTES} minutes.`, status: 403 } }
  const { error } = await supabase.from('profiles').update({ hidden_pin_hash: null, hidden_pin_failed_attempts: 0, hidden_pin_locked_until: null }).eq('id', user.id)
  if (error) return { error }
  return { ok: true }
}
