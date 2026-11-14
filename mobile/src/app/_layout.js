import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../state/AuthProvider'
import { DataProvider } from '../state/DataProvider'
import { Loading } from '../components/ui'
import { colors } from '../lib/theme'

function RootStack() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  const signedIn = !!user
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="light" />
          <RootStack />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
