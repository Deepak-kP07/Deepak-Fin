import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { api } from './api'

// Push via Firebase Cloud Messaging, sent by the web server (lib/server/services/pushFcm.js).
// The device's raw FCM token is stored in device_tokens with platform 'android_app', which tells
// the server to include a visible notification on the 'default' channel created here.
const PLATFORM = 'android_app'
const CHANNEL = 'default'
// Set when the user switches push off in the app, so app start doesn't quietly re-register.
const OPT_OUT_KEY = 'push_opt_out'

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
})

async function ensureChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.HIGH })
}

// 'on' | 'off' (user switched it off here) | 'denied' (blocked in Android settings) | 'undetermined'
export async function pushPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return status
  return (await SecureStore.getItemAsync(OPT_OUT_KEY)) === '1' ? 'off' : 'on'
}

async function currentToken() {
  const { data } = await Notifications.getDevicePushTokenAsync()
  return data
}

// Asks for permission (Android 13+ shows the system prompt only after a channel exists) and saves
// this device's token. Returns true when push is on.
export async function enablePush() {
  await ensureChannel()
  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync())
  if (status !== 'granted') return false
  await SecureStore.deleteItemAsync(OPT_OUT_KEY)
  const token = await currentToken()
  try {
    await api('/finance/device_tokens', { method: 'POST', body: { token, platform: PLATFORM } })
  } catch (e) {
    // 400 = unique(user_id, token): this exact token is already saved, which is the goal.
    if (e.status !== 400) throw e
  }
  return true
}

// Re-saves the token on app start if permission is already granted (tokens can rotate).
export async function syncPushToken() {
  if ((await pushPermissionStatus()) !== 'on') return
  await enablePush().catch(() => {})
}

// Removes this device's token so the server stops sending here. `optOut` remembers the choice
// (the in-app switch); sign-out doesn't, so the next person to sign in gets the usual behaviour.
export async function disablePush({ optOut = false } = {}) {
  if (optOut) await SecureStore.setItemAsync(OPT_OUT_KEY, '1')
  const token = await currentToken().catch(() => null)
  if (!token) return
  const rows = await api('/finance/device_tokens').catch(() => [])
  await Promise.all((rows || []).filter((r) => r.token === token).map((r) => api(`/finance/device_tokens/${r.id}`, { method: 'DELETE' }).catch(() => {})))
}

// Server notification links are web paths like "/?view=cards" — map them to native screens.
const VIEW_ROUTES = {
  dashboard: '/', transactions: '/transactions', accounts: '/accounts', cards: '/cards', credit_cards: '/cards',
  loans: '/loans', lend: '/lend', lend_borrow: '/lend', budgets: '/budgets', investments: '/investments',
  family_company: '/family', chitfunds: '/chits', chit_funds: '/chits', scholarships: '/scholarships', bucket: '/bucket', insights: '/insights',
}
export function routeForView(view) {
  return VIEW_ROUTES[view] || '/'
}
export function routeForUrl(url) {
  if (!url) return null
  const view = (String(url).match(/[?&]view=([a-z_]+)/) || [])[1]
  return view ? routeForView(view) : '/'
}
