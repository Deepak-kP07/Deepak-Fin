import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

// Native Google sign-in: Google returns an ID token for the web OAuth client, and Supabase turns
// it into a session (signInWithIdToken). Needs an Android OAuth client for com.personalfin.app with
// the app's SHA-1 fingerprints in Google Cloud — see mobile/README.md.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
let configured = false

export async function signInWithGoogle() {
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error('Google sign-in is not configured.')
  if (!configured) { GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID }); configured = true }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return { cancelled: true }
    const idToken = response.data.idToken
    if (!idToken) throw new Error('Google did not return an ID token.')
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (error) throw error
    return { cancelled: false }
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return { cancelled: true }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services is not available on this device.')
    }
    throw e
  }
}

export async function signOutOfGoogle() {
  if (!configured) return
  await GoogleSignin.signOut().catch(() => {})
}
