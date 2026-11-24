import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})

// Refresh tokens only while the app is in the foreground (Supabase's recommended React Native setup).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

// A throwaway client that keeps its session in memory only — for the in-app password reset, which
// signs in with the emailed code just long enough to set the new password, without that
// half-finished session reaching the app (the main client would route straight into the app).
export function oneOffClient() {
  return createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
