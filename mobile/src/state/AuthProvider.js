import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { WEB_URL, api } from '../lib/api'
import { signInWithGoogle, signOutOfGoogle } from '../lib/googleAuth'
import { disablePush, syncPushToken } from '../lib/push'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still reading secure storage

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  // First call after sign-in: the server seeds default categories and the profile row, exactly
  // as it does for the web app's /auth/me.
  useEffect(() => {
    if (!session?.access_token) return
    api('/auth/me').catch(() => {})
    syncPushToken()
  }, [session?.user?.id])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    },
    // Confirmation email links land on the web app's callback, which signs the user in there;
    // they then sign in here with the same email and password.
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${WEB_URL}/api/auth/oauth_callback` },
      })
      if (error) throw error
      return { needsConfirmation: !data.session }
    },
    resendConfirmation: async (email) => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${WEB_URL}/api/auth/oauth_callback` } })
      if (error) throw error
    },
    signInWithGoogle,
    // Stop pushes to this phone first (needs the session), then end the session everywhere local.
    signOut: async () => {
      await disablePush().catch(() => {})
      await signOutOfGoogle()
      await supabase.auth.signOut()
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
