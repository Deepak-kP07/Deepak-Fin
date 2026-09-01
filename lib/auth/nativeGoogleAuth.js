'use client'

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { createClient } from '@/lib/supabase/browser'

// Must match the intent-filter in android/app/src/main/AndroidManifest.xml, and be added to
// Supabase's Authentication > URL Configuration > Redirect URLs allowlist.
const REDIRECT_URL = 'com.personalfin.app://login-callback'

export function isNativePlatform() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

// Google Identity Services (the web flow's signInWithIdToken — see AuthScreen.jsx) doesn't work
// reliably inside an embedded Android WebView: Google's own security policy routes it out to a
// real, separate system browser process with no way back to the page that opened it — the exact
// "opens Chrome, never returns" symptom this exists to fix. This uses Supabase's redirect-based
// OAuth instead, but keeps it feeling native: Google's consent screen opens in a Chrome Custom
// Tab (Browser.open — still visually an overlay on the app, not a separate app switch), and
// App.addListener('appUrlOpen', ...) (registered by listenForNativeGoogleCallback below) catches
// the OS handing the custom-scheme redirect back to this app to actually complete the sign-in.
export async function startNativeGoogleSignIn() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
  })
  if (error) throw error
  await Browser.open({ url: data.url, presentationStyle: 'popover' })
}

// Call once while the native sign-in screen is mounted; returns an unsubscribe function.
// onSignedIn receives the signed-in user, same shape as the web flow's onAuth callback.
export function listenForNativeGoogleCallback(onSignedIn, onError) {
  if (!isNativePlatform()) return () => {}
  const listenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(REDIRECT_URL)) return
    try {
      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')
      if (!code) throw new Error(parsed.searchParams.get('error_description') || 'Sign-in was cancelled or failed.')
      // exchangeCodeForSession needs the PKCE code_verifier signInWithOAuth stashed in this same
      // WebView's local storage when it built the authorize URL above — the Custom Tab used for
      // Google's own screens never touches that storage, so this works even though the code
      // itself was minted by a separate browser process.
      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
      await Browser.close().catch(() => {})
      onSignedIn(data.user)
    } catch (err) {
      await Browser.close().catch(() => {})
      onError?.(err)
    }
  })
  return () => { listenerPromise.then((handle) => handle.remove()) }
}
