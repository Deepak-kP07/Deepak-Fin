import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import { Bell, Fingerprint } from 'lucide-react-native'
import { AccentGradient } from './Gradient'
import { useTheme } from '../state/ThemeProvider'
import { useAppLock } from './AppLock'
import { enablePush, pushPermissionStatus } from '../lib/push'
import { biometricReady } from '../lib/biometric'
import { tw } from '../lib/tw'

// Shown once per phone, right after the first sign-in, before the tour: the only two things the
// app ever asks for up front — notifications and the fingerprint lock. Each is skipped when it's
// already on or the phone can't do it. (Photos/files are picked through Android's own pickers, which
// need no permission, so there's nothing else to ask.)
const DONE_KEY = 'perm_onboarding_v1'

export async function permissionsOnboardingSteps() {
  if ((await SecureStore.getItemAsync(DONE_KEY).catch(() => null)) === '1') return []
  const steps = []
  if ((await pushPermissionStatus().catch(() => 'undetermined')) !== 'on') steps.push('notifications')
  if (await biometricReady()) steps.push('fingerprint')
  if (!steps.length) await SecureStore.setItemAsync(DONE_KEY, '1').catch(() => {})
  return steps
}

const COPY = {
  notifications: {
    icon: Bell, title: 'Stay ahead of due dates',
    body: 'Get a reminder before a card bill, EMI or chit fund payment is due, and when a budget is close to its limit. Nothing else — no marketing.',
    allow: 'Allow notifications',
  },
  fingerprint: {
    icon: Fingerprint, title: 'Lock with your fingerprint',
    body: 'Ask for your fingerprint whenever Personal Fin opens, and before showing saved card details. You can change this later in Settings › Profile.',
    allow: 'Use fingerprint',
  },
}

export function PermissionsOnboarding({ steps, onDone }) {
  const insets = useSafeAreaInsets()
  const { accentColor } = useTheme()
  const { setEnabled } = useAppLock()
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const step = steps[i]
  useEffect(() => { setNote('') }, [i])

  const next = async () => {
    if (i + 1 < steps.length) { setI(i + 1); return }
    await SecureStore.setItemAsync(DONE_KEY, '1').catch(() => {})
    onDone()
  }
  const allow = async () => {
    setBusy(true)
    try {
      if (step === 'notifications') await enablePush().catch(() => false)
      else if (!(await setEnabled(true))) { setNote("Fingerprint wasn't confirmed — you can turn it on later in Settings."); setBusy(false); return }
    } finally { setBusy(false) }
    next()
  }
  if (!step) return null
  const c = COPY[step]
  const I = c.icon
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={next}>
      <View className={tw('flex-1 bg-[#080b12] light:bg-slate-50 px-7')} style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row justify-center gap-1.5">
          {steps.map((s, k) => <View key={s} className={tw('h-1.5 rounded-full', k === i ? 'w-6 bg-accent-300' : 'w-1.5 bg-white/20 light:bg-black/15')} />)}
        </View>
        <View className="flex-1 items-center justify-center">
          <View style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: accentColor(400, 0.13), borderWidth: 1.5, borderColor: accentColor(300, 0.45) }}>
            <I size={52} color={accentColor(300)} strokeWidth={1.6} />
          </View>
          <Text className={tw('mt-8 text-center text-2xl font-semibold text-white light:text-slate-900')}>{c.title}</Text>
          <Text className={tw('mt-3 text-center text-[15px] leading-6 text-slate-400 light:text-slate-500')}>{c.body}</Text>
          {note ? <Text className={tw('mt-4 text-center text-sm text-amber-300 light:text-amber-700')}>{note}</Text> : null}
        </View>
        <Pressable disabled={busy} onPress={allow} className="active:opacity-80">
          <AccentGradient dir="r" style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
            {busy ? <ActivityIndicator color="#07101c" /> : <Text className="text-[15px] font-semibold text-[#07101c]">{c.allow}</Text>}
          </AccentGradient>
        </Pressable>
        <Pressable disabled={busy} onPress={next} className="mt-2 items-center py-3.5 active:opacity-60">
          <Text className={tw('text-sm font-medium text-slate-400 light:text-slate-500')}>Not now</Text>
        </Pressable>
      </View>
    </Modal>
  )
}
