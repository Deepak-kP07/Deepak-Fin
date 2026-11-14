import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { colors } from '../../lib/theme'
import { routeForUrl } from '../../lib/push'

// Everything behind sign-in. Forms open as modals; module screens push on top of the tabs.
const MODALS = ['transaction', 'forms/pay-card', 'forms/loan-payment', 'forms/lend-record', 'forms/lend-repayment', 'forms/chit-payment', 'forms/bucket-item']

// Tapping a push notification opens the screen it's about (the server sends a web-style
// "/?view=…" link, mapped to a native route).
function useNotificationTaps() {
  const router = useRouter()
  useEffect(() => {
    const open = (response) => {
      const route = routeForUrl(response?.notification?.request?.content?.data?.url)
      if (route && route !== '/') router.push(route)
    }
    Notifications.getLastNotificationResponseAsync().then((r) => { if (r) { open(r); Notifications.clearLastNotificationResponseAsync?.() } }).catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener(open)
    return () => sub.remove()
  }, [router])
}

export default function AppLayout() {
  useNotificationTaps()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      {MODALS.map((name) => <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />)}
    </Stack>
  )
}
