import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL, api } from '../lib/api'

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
    if (session?.access_token) api('/auth/me').catch(() => {})
  }, [session?.access_token])

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
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${API_URL}/api/auth/oauth_callback` },
      })
      if (error) throw error
      return { needsConfirmation: !data.session }
    },
    resendConfirmation: async (email) => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${API_URL}/api/auth/oauth_callback` } })
      if (error) throw error
    },
    signOut: () => supabase.auth.signOut(),
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
