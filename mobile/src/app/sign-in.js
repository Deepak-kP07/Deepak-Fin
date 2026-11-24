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
  const { signIn, signUp, resendConfirmation, signInWithGoogle, confirmWithCode, resetWithCode } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'error'|'info', message, unconfirmed? }

  const submit = async () => {
    if (mode === 'forgot') return sendReset()
    if (mode === 'reset' || mode === 'confirm') return submitCode()
    if (!email.trim() || password.length < 6) {
      setFeedback({ type: 'error', message: 'Enter your email and a password of at least 6 characters.' })
      return
    }
    setBusy(true); setFeedback(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        const { needsConfirmation, existing } = await signUp(name, email, password)
        if (existing) {
          setMode('login'); setPassword('')
          setFeedback({ type: 'error', message: `${email.trim()} already has an account. Sign in with its password, or tap “Forgot password?” to set a new one.` })
        } else if (needsConfirmation) {
          setMode('confirm'); setCode('')
          setFeedback({ type: 'info', message: `We've emailed a code to ${email.trim()}. Enter it here to finish — or tap the link in that email, then come back and sign in.` })
        }
      }
    } catch (e) {
      const msg = e.message || ''
      const unconfirmed = /not confirmed/i.test(msg)
      if (unconfirmed) { setMode('confirm'); setCode('') }
      const wrong = /invalid login credentials/i.test(msg)
      const limited = e.status === 429 || /rate limit|too many/i.test(msg)
      setFeedback({
        type: 'error', unconfirmed,
        message: unconfirmed ? 'Your email isn’t confirmed yet. Open the link we emailed you, then sign in.'
          : wrong ? 'That email and password don’t match. Tap the eye to check the password, or use “Forgot password?” to set a new one.'
          : limited ? 'Too many attempts or emails just now — wait a few minutes and try again.'
          : msg || 'Something went wrong',
      })
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
      setMode('reset'); setCode(''); setPassword('')
      setFeedback({ type: 'info', message: `If ${address} has an account, we've emailed it a code. Enter the code and your new password below.` })
    } catch (e) { setFeedback({ type: 'error', message: e.message || 'Could not send the reset email — try again shortly.' }) } finally { setBusy(false) }
  }

  // Finishes sign-up (confirm) or a password reset (reset) with the code from the email, in the app.
  const submitCode = async () => {
    const c = code.replace(/\s/g, '')
    if (!/^\d{6,10}$/.test(c)) { setFeedback({ type: 'error', message: 'Enter the code from the email — just the digits.' }); return }
    if (mode === 'reset' && password.length < 6) { setFeedback({ type: 'error', message: 'Choose a new password of at least 6 characters.' }); return }
    setBusy(true); setFeedback(null)
    try {
      if (mode === 'confirm') await confirmWithCode(email, c)
      else await resetWithCode(email, c, password)
    } catch (e) {
      const msg = e.message || ''
      setFeedback({ type: 'error', message: /expired|invalid|otp|token/i.test(msg) ? 'That code is wrong or has expired. Check the latest email, or send a new code.' : msg || 'Something went wrong' })
    } finally { setBusy(false) }
  }
  const resendCode = () => (mode === 'reset' ? sendReset() : resend())

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
        <Text style={styles.heading}>{TITLES[mode]}</Text>
        <Text style={styles.sub}>{mode === 'reset' || mode === 'confirm' ? `Code sent to ${email.trim()}` : SUBTITLES[mode]}</Text>

        {mode === 'signup' && <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />}
        {mode === 'reset' || mode === 'confirm' ? (
          <Field label="Code from the email" value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} autoFocus />
        ) : <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
        {mode !== 'forgot' && mode !== 'confirm' && <Field label={mode === 'reset' ? 'New password' : 'Password'} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />}
        {mode === 'login' && (
          <Pressable onPress={() => { setMode('forgot'); setFeedback(null) }} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: -4, marginBottom: 16 }}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        )}

        {feedback && (
          <View style={[styles.feedback, feedback.type === 'error' ? styles.feedbackError : styles.feedbackInfo]}>
            <Text style={{ color: feedback.type === 'error' ? '#fecdd3' : '#fde68a', fontSize: 13, lineHeight: 19 }}>{feedback.message}</Text>
            {feedback.unconfirmed && mode !== 'confirm' && <Pressable onPress={resend}><Text style={styles.link}>Resend confirmation email</Text></Pressable>}
          </View>
        )}

        <Button label={SUBMIT[mode]} onPress={submit} busy={busy} />
        {(mode === 'reset' || mode === 'confirm') && (
          <Pressable onPress={resendCode} disabled={busy} hitSlop={8} style={{ alignSelf: 'center', marginTop: 16 }}>
            <Text style={styles.forgot}>Didn't get it? Send a new code</Text>
          </Pressable>
        )}
        {(mode === 'login' || mode === 'signup') && (
          <>
            <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} /></View>
            {GOOGLE_WEB_CLIENT_ID
              ? <Button label="Continue with Google" icon="globe" variant="secondary" onPress={google} busy={googleBusy} />
              : <Text style={styles.googleOff}>Google sign-in isn't configured yet.</Text>}
          </>
        )}
        <Button label={mode === 'login' ? 'Create a new account' : mode === 'signup' ? 'I already have an account' : 'Back to sign in'} variant="secondary" onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setFeedback(null); setCode('') }} style={{ marginTop: 12 }} />

        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)} style={{ marginTop: 28 }}>
          <Text style={styles.footer}>{mode === 'signup' ? 'By creating an account you agree to our ' : ''}<Text style={{ textDecorationLine: 'underline' }}>Privacy policy</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const TITLES = { login: 'Welcome back', signup: 'Start your money journey', forgot: 'Reset your password', reset: 'Choose a new password', confirm: 'Confirm your email' }
const SUBTITLES = { login: 'Sign in to your private finance space.', signup: 'Create your secure personal finance space.', forgot: "Enter your account's email and we'll send you a code to choose a new password." }
const SUBMIT = { login: 'Sign in securely', signup: 'Create account', forgot: 'Send code', reset: 'Save password and sign in', confirm: 'Confirm and sign in' }

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
