import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { Button, Field } from '../components/ui'
import { useAuth } from '../state/AuthProvider'
import { WEB_URL, api } from '../lib/api'
import { GOOGLE_WEB_CLIENT_ID } from '../lib/googleAuth'
import { colors } from '../lib/theme'

export default function SignIn() {
  const insets = useSafeAreaInsets()
  const { signIn, signUp, resendConfirmation, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'error'|'info', message, unconfirmed? }

  const submit = async () => {
    if (mode === 'forgot') return sendReset()
    if (!email.trim() || password.length < 6) {
      setFeedback({ type: 'error', message: 'Enter your email and a password of at least 6 characters.' })
      return
    }
    setBusy(true); setFeedback(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { needsConfirmation } = await signUp(name, email, password)
        if (needsConfirmation) {
          setMode('login')
          setFeedback({ type: 'info', message: `We've sent a confirmation link to ${email.trim()}. Open it, then sign in here.` })
        }
      }
    } catch (e) {
      const unconfirmed = /not confirmed/i.test(e.message || '')
      setFeedback({ type: 'error', message: unconfirmed ? 'Your email isn’t confirmed yet. Open the link we emailed you, then sign in.' : e.message || 'Something went wrong', unconfirmed })
    } finally { setBusy(false) }
  }

  // Same flow as the web's "Forgot password?": the server emails a link to the website's
  // /reset-password page, which works whichever device opens it.
  const sendReset = async () => {
    const address = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setFeedback({ type: 'error', message: 'Enter the email address you signed up with.' }); return }
    setBusy(true); setFeedback(null)
    try {
      await api('/auth/forgot_password', { method: 'POST', body: { email: address } })
      setFeedback({ type: 'info', message: `If ${address} has an account, a password reset link is on its way. Open it, choose a new password, then sign in here.` })
    } catch (e) { setFeedback({ type: 'error', message: e.message || 'Could not send the reset email — try again shortly.' }) } finally { setBusy(false) }
  }

  const google = async () => {
    setGoogleBusy(true); setFeedback(null)
    try { await signInWithGoogle() } catch (e) { setFeedback({ type: 'error', message: e.message || 'Google sign-in failed' }) } finally { setGoogleBusy(false) }
  }

  const resend = async () => {
    try { await resendConfirmation(email); setFeedback({ type: 'info', message: 'Confirmation email sent again.' }) }
    catch (e) { setFeedback({ type: 'error', message: e.message }) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Personal Fin</Text>
        <Text style={styles.heading}>{mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : 'Start your money journey'}</Text>
        <Text style={styles.sub}>{mode === 'login' ? 'Sign in to your private finance space.' : mode === 'forgot' ? "Enter your account's email and we'll send you a link to choose a new password." : 'Create your secure personal finance space.'}</Text>

        {mode === 'signup' && <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {mode !== 'forgot' && <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />}
        {mode === 'login' && (
          <Pressable onPress={() => { setMode('forgot'); setFeedback(null) }} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: -4, marginBottom: 16 }}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        )}

        {feedback && (
          <View style={[styles.feedback, feedback.type === 'error' ? styles.feedbackError : styles.feedbackInfo]}>
            <Text style={{ color: feedback.type === 'error' ? '#fecdd3' : '#fde68a', fontSize: 13, lineHeight: 19 }}>{feedback.message}</Text>
            {feedback.unconfirmed && <Pressable onPress={resend}><Text style={styles.link}>Resend confirmation email</Text></Pressable>}
          </View>
        )}

        <Button label={mode === 'login' ? 'Sign in securely' : mode === 'forgot' ? 'Send reset link' : 'Create account'} onPress={submit} busy={busy} />
        {mode !== 'forgot' && (
          <>
            <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} /></View>
            {GOOGLE_WEB_CLIENT_ID
              ? <Button label="Continue with Google" icon="globe" variant="secondary" onPress={google} busy={googleBusy} />
              : <Text style={styles.googleOff}>Google sign-in isn't configured yet.</Text>}
          </>
        )}
        <Button label={mode === 'login' ? 'Create a new account' : mode === 'forgot' ? 'Back to sign in' : 'I already have an account'} variant="secondary" onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setFeedback(null) }} style={{ marginTop: 12 }} />

        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)} style={{ marginTop: 28 }}>
          <Text style={styles.footer}>{mode === 'signup' ? 'By creating an account you agree to our ' : ''}<Text style={{ textDecorationLine: 'underline' }}>Privacy policy</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20 },
  brand: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  heading: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 16, letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 8, marginBottom: 28 },
  feedback: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  feedbackError: { borderColor: 'rgba(253,164,175,0.25)', backgroundColor: 'rgba(253,164,175,0.1)' },
  feedbackInfo: { borderColor: 'rgba(253,230,138,0.25)', backgroundColor: 'rgba(253,230,138,0.1)' },
  link: { color: '#ffe4e6', fontWeight: '600', textDecorationLine: 'underline', marginTop: 8 },
  footer: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  forgot: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  googleOff: { color: '#fda4af', fontSize: 12, textAlign: 'center' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  orText: { color: colors.textFaint, fontSize: 12 },
})
