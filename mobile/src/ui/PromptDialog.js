import { useRef, useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { tw } from '../lib/tw'

// Port of the PWA's prompt.ask(title, { defaultValue, placeholder }) — Android has no
// Alert.prompt. Resolves with the text, or null when cancelled.
export function usePrompt() {
  const [state, setState] = useState(null)
  const [text, setText] = useState('')
  const resolver = useRef(null)
  const ask = (title, { defaultValue = '', placeholder = '', message } = {}) => new Promise((resolve) => {
    resolver.current = resolve
    setText(defaultValue)
    setState({ title, placeholder, message })
  })
  const close = (value) => { setState(null); resolver.current?.(value); resolver.current = null }
  const node = (
    <Modal visible={!!state} transparent animationType="fade" onRequestClose={() => close(null)} statusBarTranslucent>
      <Pressable onPress={() => close(null)} className="flex-1 items-center justify-center bg-black/60 p-4">
        {state && (
          <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6')}>
            <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{state.title}</Text>
            {state.message ? <Text className={tw('mt-1 text-xs leading-5 text-slate-400 light:text-slate-500')}>{state.message}</Text> : null}
            <TextInput autoFocus value={text} onChangeText={setText} placeholder={state.placeholder} placeholderTextColor="#64748b" onSubmitEditing={() => close(text)}
              className={tw('mt-4 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900')} />
            <View className="mt-5 flex-row justify-end gap-2">
              <Pressable onPress={() => close(null)} className={tw('rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5')}><Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Cancel</Text></Pressable>
              <Pressable onPress={() => close(text)} className="rounded-xl bg-accent-300 px-4 py-2.5"><Text className="text-sm font-semibold text-[#07101c]">Save</Text></Pressable>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  )
  return { ask, node }
}
