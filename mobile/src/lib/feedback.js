import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as SecureStore from 'expo-secure-store'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

// Touch feedback, the way native apps do it: a light tick on toggles/long-press/swipes, and when
// something is logged (a transaction, a payment, an entry) a short soft chime plus a "confirm"
// buzz — the little sense of "done". The chime can be switched off in Settings › Appearance; it
// mixes with whatever music is playing instead of pausing it, and never plays in silent mode.
const SOUND_KEY = 'logged_sound'
let soundOn = true
SecureStore.getItemAsync(SOUND_KEY).then((v) => { soundOn = v !== '0' }, () => {})
export const isLoggedSoundOn = () => soundOn
export const setLoggedSoundOn = async (on) => { soundOn = on; await SecureStore.setItemAsync(SOUND_KEY, on ? '1' : '0').catch(() => {}) }

const ANDROID = {
  light: Haptics.AndroidHaptics.Virtual_Key,
  medium: Haptics.AndroidHaptics.Context_Click,
  long: Haptics.AndroidHaptics.Long_Press,
  toggle: Haptics.AndroidHaptics.Toggle_On,
  success: Haptics.AndroidHaptics.Confirm,
  error: Haptics.AndroidHaptics.Reject,
}
export function haptic(kind = 'light') {
  try {
    if (Platform.OS === 'android') return Haptics.performAndroidHapticsAsync(ANDROID[kind] || ANDROID.light).catch(() => {})
    if (kind === 'success') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    if (kind === 'error') return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    return Haptics.impactAsync(kind === 'medium' || kind === 'long' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  } catch { return undefined }
}

let player = null
let modeSet = false
function chime() {
  try {
    if (!modeSet) { modeSet = true; setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => {}) }
    if (!player) { player = createAudioPlayer(require('../../assets/logged.wav')); player.volume = 0.55 }
    player.seekTo(0).catch?.(() => {})
    player.play()
  } catch { /* sound is a nicety — never block a save on it */ }
}

// Call right after something is successfully logged.
export function loggedFeedback() {
  haptic('success')
  if (soundOn) chime()
}
