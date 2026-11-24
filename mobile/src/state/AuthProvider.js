import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { oneOffClient, supabase } from '../lib/supabase'
import { WEB_URL, api } from '../lib/api'
import { signInWithGoogle, signOutOfGoogle } from '../lib/googleAuth'
import { disablePush, syncPushToken } from '../lib/push'

const AuthContext = createContext(null)
const CONFIRMED_URL = `${WEB_URL}/email-confirmed`

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
    // Then the welcome email: the server sends it once, only for a new confirmed account (sign-ups
    // from the app never pass through the web callbacks that welcome web sign-ups).
    api('/auth/me').catch(() => {}).finally(() => api('/auth/welcome', { method: 'POST' }).catch(() => {}))
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
    // The confirmation link lands on the website's /email-confirmed page, which just says "go back
    // to the app and sign in" (with an Open-the-app button) rather than signing in on the web.
    // Supabase answers a sign-up for an email that already has an account with a stand-in user
    // with no identities, no email sent and the password unchanged — reported as `existing`.
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: CONFIRMED_URL },
      })
      if (error) throw error
      if (data.user && !data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { existing: true }
      return { needsConfirmation: !data.session }
    },
    // The 6-digit code from the confirmation email — confirms the address and signs in, all in the
    // app (the emailed link still works too, and lands on the website's "go back to the app" page).
    confirmWithCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
      if (error) throw error
    },
    // Password reset without leaving the app: the code from the reset email proves it's them, the
    // new password is set on a throwaway session, then they're signed in with it normally.
    resetWithCode: async (email, code, password) => {
      const tmp = oneOffClient()
      const { error } = await tmp.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
      if (error) throw error
      const { error: upd } = await tmp.auth.updateUser({ password })
      await tmp.auth.signOut({ scope: 'local' }).catch(() => {})
      if (upd) throw upd
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError
    },
    resendConfirmation: async (email) => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: CONFIRMED_URL } })
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
