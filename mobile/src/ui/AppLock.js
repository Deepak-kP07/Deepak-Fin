import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState, Image, Modal, Pressable, StatusBar, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AccentGradient } from './Gradient'
import { useTheme } from '../state/ThemeProvider'
import { useAuth } from '../state/AuthProvider'
import { authenticate, biometricReady, isAppLockEnabled, setAppLockEnabled } from '../lib/biometric'
import { tw } from '../lib/tw'
import { haptic } from '../lib/feedback'

// Fingerprint app lock. When it's on, the app opens behind this screen and locks again after it's
// been in the background for RELOCK_AFTER_MS — long enough that the photo picker, share sheet or
// Kite's login tab don't trigger it, short enough that a phone left unlocked on a table is covered.
const RELOCK_AFTER_MS = 60 * 1000
const AppLockContext = createContext({ locked: false, ready: false, enabled: false, setEnabled: async () => false })
export const useAppLock = () => useContext(AppLockContext)

// Kept outside the provider on purpose: changing the theme remounts everything below the theme
// provider, this included, and a fresh mount used to start locked again — asking for the
// fingerprint on every theme tap. Whether this run of the app is unlocked, and when it went to
// the background, belong to the app process, not to one mount.
let unlockedThisRun = false
let backgroundedAt = null

export function AppLockProvider({ children }) {
  const [ready, setReady] = useState(false) // false until the saved setting has been read
  const [enabled, setEnabledState] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    ;(async () => {
      const on = (await isAppLockEnabled()) && (await biometricReady())
      setEnabledState(on)
      setLocked(on && !unlockedThisRun)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt = Date.now()
      else if (s === 'active') {
        const away = backgroundedAt ? Date.now() - backgroundedAt : 0
        backgroundedAt = null
        if (enabled && away > RELOCK_AFTER_MS) { unlockedThisRun = false; setLocked(true) }
      }
    })
    return () => sub.remove()
  }, [enabled])

  // Turning it on asks for the fingerprint first, so nobody locks themselves out by accident.
  const setEnabled = useCallback(async (on) => {
    if (on) {
      if (!(await biometricReady())) return false
      if (!(await authenticate('Confirm your fingerprint'))) return false
    }
    await setAppLockEnabled(on)
    if (on) unlockedThisRun = true // they just proved it's them
    setEnabledState(on)
    return true
  }, [])

  return (
    <AppLockContext.Provider value={{ locked, ready, enabled, setEnabled }}>
      {children}
      <LockScreen visible={locked} onUnlocked={() => { unlockedThisRun = true; setLocked(false) }} />
    </AppLockContext.Provider>
  )
}

// A plain cover (logo + who's signed in) behind Android's own fingerprint sheet — the system sheet
// is the fingerprint UI, so there's no second fingerprint drawn here. It asks once on show; the
// button is only for a retry after a cancel.
function LockScreen({ visible, onUnlocked }) {
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false) // one system prompt at a time, however many triggers fire

  const unlock = async (usePin = false) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true); setFailed(false)
    const ok = await authenticate('Unlock Personal Fin', { usePin })
    inFlight.current = false
    setBusy(false)
    if (ok) { haptic('success'); onUnlocked() }
    else setFailed(true)
  }
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => unlock(), 300)
    return () => clearTimeout(t)
  }, [visible])

  const light = theme === 'light'
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} />
      <View className={tw('flex-1 items-center justify-between bg-[#080b12] light:bg-slate-50 px-8')} style={{ paddingTop: insets.top + 96, paddingBottom: insets.bottom + 32 }}>
        <View className="items-center">
          <Image source={require('../../assets/splash-icon.png')} style={{ width: 76, height: 76, borderRadius: 20 }} />
          <Text className={tw('mt-5 text-xl font-semibold text-white light:text-slate-900')}>Personal Fin is locked</Text>
          {user?.email ? <Text className={tw('mt-1 text-sm text-slate-400 light:text-slate-500')}>{user.email}</Text> : null}
        </View>

        <View className="w-full items-center gap-3">
          {!busy ? (
            <Pressable onPress={() => unlock()} className="w-full active:opacity-80">
              <AccentGradient dir="r" style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}><Text className="text-[15px] font-semibold text-[#07101c]">Unlock</Text></AccentGradient>
            </Pressable>
          ) : null}
          {failed ? (
            <Pressable onPress={() => unlock(true)} hitSlop={8} className="py-2 active:opacity-60">
              <Text className={tw('text-sm font-medium text-slate-300 light:text-slate-600')}>Use phone PIN instead</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={signOut} hitSlop={10} className="mt-2 active:opacity-60"><Text className="text-xs text-slate-500">Not you? Sign out</Text></Pressable>
        </View>
      </View>
    </Modal>
  )
}
