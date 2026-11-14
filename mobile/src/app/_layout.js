import '../../global.css'
import { LogBox } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../state/AuthProvider'
import { DataProvider } from '../state/DataProvider'
import { ThemeProvider } from '../state/ThemeProvider'
import { HiddenTxProvider } from '../state/HiddenTx'
import { Loading } from '../components/ui'
import { colors } from '../lib/theme'

// A library still uses RN's deprecated ImageBackground; dev-only warning, not actionable here.
LogBox.ignoreLogs(['ImageBackground is deprecated'])

function RootStack() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  const signedIn = !!user
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
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
          <ThemeProvider>
            <HiddenTxProvider>
              <RootStack />
            </HiddenTxProvider>
          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
