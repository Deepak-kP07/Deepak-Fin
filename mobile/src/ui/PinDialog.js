import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Lock } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/PinDialog.jsx: `const pin = usePinDialog()` → `pin.ask({...})` returns a
// promise of true/false; render `pin.view` once.
export function usePinDialog() {
  const [state, setState] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ask = ({ title, message, confirmLabel = 'Unlock', submit }) => new Promise((resolve) => { setPin(''); setError(''); setBusy(false); setState({ title, message, confirmLabel, submit, resolve }) })
  const close = (r) => { state?.resolve(r); setState(null) }
  const onSubmit = async () => {
    if (!/^\d{4,6}$/.test(pin)) { setError('Enter 4 to 6 digits.'); return }
    setBusy(true); setError('')
    const result = await state.submit(pin)
    setBusy(false)
    if (result?.ok) close(true); else { setError(result?.error || 'Something went wrong'); setPin('') }
  }
  const view = (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
      <Pressable onPress={() => close(false)} className="flex-1 items-center justify-center bg-black/60 p-4">
        {state && (
          <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 glassy:glass-card')}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-400/15"><Icon as={Lock} size={18} className="text-accent-200 light:text-accent-700" /></View>
            <Text className={tw('mt-4 text-sm font-semibold text-white light:text-slate-900')}>{state.title}</Text>
            {state.message ? <Text className={tw('mt-1 text-xs text-slate-400 light:text-slate-500')}>{state.message}</Text> : null}
            <TextInput autoFocus secureTextEntry keyboardType="number-pad" maxLength={6} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} placeholder="••••" placeholderTextColor="#64748b" onSubmitEditing={onSubmit}
              className={tw('mt-4 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-center text-lg tracking-[6px] text-white light:text-slate-900')} />
            {error ? <Text className={tw('mt-2 text-xs text-rose-300 light:text-rose-700')}>{error}</Text> : null}
            <View className="mt-5 flex-row justify-end gap-2">
              <Pressable onPress={() => close(false)} className={tw('rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5')}><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Cancel</Text></Pressable>
              <Pressable disabled={busy} onPress={onSubmit} className="rounded-xl bg-accent-300 px-4 py-2.5">{busy ? <ActivityIndicator color="#07101c" /> : <Text className="text-sm font-semibold text-[#07101c]">{state.confirmLabel}</Text>}</Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  )
  return { ask, view }
}
