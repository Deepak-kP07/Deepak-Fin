import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

// Fingerprint (or face / device PIN as the system's own fallback) via Android's BiometricPrompt.
// The app lock is a per-device choice, so it lives in SecureStore rather than the user's profile.
const LOCK_KEY = 'app_lock_enabled'

// true when this phone has a sensor and at least one fingerprint/face enrolled.
export async function biometricReady() {
  try {
    const [hw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
    return hw && enrolled
  } catch { return false }
}

// Shows the system prompt. Resolves true on success; false on cancel/failure.
export async function authenticate(promptMessage = 'Unlock Personal Fin') {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel', disableDeviceFallback: false })
    return !!r.success
  } catch { return false }
}

// Gate for sensitive actions (e.g. revealing a vault card): asks for the fingerprint when the phone
// has one set up, otherwise lets the action through — the account login already protects it.
export async function confirmIdentity(promptMessage) {
  if (!(await biometricReady())) return true
  return authenticate(promptMessage)
}

export const isAppLockEnabled = async () => (await SecureStore.getItemAsync(LOCK_KEY).catch(() => null)) === '1'
export const setAppLockEnabled = (on) => (on ? SecureStore.setItemAsync(LOCK_KEY, '1') : SecureStore.deleteItemAsync(LOCK_KEY))
