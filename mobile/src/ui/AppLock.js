import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, AppState, Easing, Image, Modal, Pressable, StatusBar, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Fingerprint } from 'lucide-react-native'
import { useTheme } from '../state/ThemeProvider'
import { useAuth } from '../state/AuthProvider'
import { authenticate, biometricReady, isAppLockEnabled, setAppLockEnabled } from '../lib/biometric'
import { tw } from '../lib/tw'

// Fingerprint app lock. When it's on, the app opens behind this screen and locks again after it's
// been in the background for RELOCK_AFTER_MS — long enough that the photo picker, share sheet or
// Kite's login tab don't trigger it, short enough that a phone left unlocked on a table is covered.
const RELOCK_AFTER_MS = 60 * 1000
const AppLockContext = createContext({ locked: false, ready: false, enabled: false, setEnabled: async () => false })
export const useAppLock = () => useContext(AppLockContext)

export function AppLockProvider({ children }) {
  const [ready, setReady] = useState(false) // false until the saved setting has been read
  const [enabled, setEnabledState] = useState(false)
  const [locked, setLocked] = useState(false)
  const backgroundedAt = useRef(null)

  useEffect(() => {
    ;(async () => {
      const on = (await isAppLockEnabled()) && (await biometricReady())
      setEnabledState(on)
      setLocked(on)
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt.current = Date.now()
      else if (s === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0
        backgroundedAt.current = null
        if (enabled && away > RELOCK_AFTER_MS) setLocked(true)
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
    setEnabledState(on)
    return true
  }, [])

  return (
    <AppLockContext.Provider value={{ locked, ready, enabled, setEnabled }}>
      {children}
      <LockScreen visible={locked} onUnlocked={() => setLocked(false)} />
    </AppLockContext.Provider>
  )
}

function LockScreen({ visible, onUnlocked }) {
  const insets = useSafeAreaInsets()
  const { accentColor, theme } = useTheme()
  const { user, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [visible, pulse])

  const unlock = async () => {
    if (busy) return
    setBusy(true); setFailed(false)
    const ok = await authenticate('Unlock Personal Fin')
    setBusy(false)
    if (ok) onUnlocked()
    else setFailed(true)
  }
  // Ask straight away, like a banking app — the button is there for a retry after a cancel.
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(unlock, 350)
    return () => clearTimeout(t)
  }, [visible])

  const light = theme === 'light'
  const ring = accentColor(300)
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} />
      <View className={tw('flex-1 items-center justify-between bg-[#080b12] light:bg-slate-50 px-8')} style={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 32 }}>
        <View className="items-center">
          <Image source={require('../../assets/splash-icon.png')} style={{ width: 76, height: 76, borderRadius: 20 }} />
          <Text className={tw('mt-5 text-xl font-semibold text-white light:text-slate-900')}>Personal Fin is locked</Text>
          {user?.email ? <Text className={tw('mt-1 text-sm text-slate-400 light:text-slate-500')}>{user.email}</Text> : null}
        </View>

        <View className="items-center">
          <Pressable onPress={unlock} accessibilityLabel="Unlock with fingerprint" className="items-center justify-center" style={{ width: 132, height: 132 }}>
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: ring,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] }) }],
            }} />
            <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: accentColor(400, 0.13), borderWidth: 1.5, borderColor: accentColor(300, 0.55) }}>
              <Fingerprint size={50} color={ring} strokeWidth={1.6} />
            </View>
          </Pressable>
          <Text className={tw('mt-4 text-sm font-medium', failed ? 'text-rose-300 light:text-rose-700' : 'text-slate-300 light:text-slate-600')}>
            {busy ? 'Touch the fingerprint sensor' : failed ? "Didn't match — tap to try again" : 'Tap to unlock with your fingerprint'}
          </Text>
        </View>

        <Pressable onPress={signOut} hitSlop={10} className="active:opacity-60"><Text className="text-xs text-slate-500">Not you? Sign out</Text></Pressable>
      </View>
    </Modal>
  )
}
