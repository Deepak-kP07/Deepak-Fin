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
