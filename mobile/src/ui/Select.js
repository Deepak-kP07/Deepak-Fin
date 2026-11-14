import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/Select.jsx: the same trigger styling; on a phone the option list opens
// as a bottom sheet, with type-to-filter once there are more than 8 options (as on the web).
const BASE = 'w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 glassy:glass-pill'
export function Select({ value, onChange, options, placeholder = '', className, textClassName = 'text-white light:text-slate-900', disabled, title }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()
  const selected = options.find((o) => String(o.value) === String(value ?? ''))
  const q = query.trim().toLowerCase()
  const shown = options.length > 8 && q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options
  return (
    <>
      <Pressable disabled={disabled} onPress={() => { setQuery(''); setOpen(true) }} className={tw(className || BASE, 'flex-row items-center justify-between gap-2', disabled && 'opacity-50')}>
        <Text numberOfLines={1} className={tw('flex-1 text-sm', selected && selected.value !== '' ? textClassName : 'text-slate-500')}>{selected ? selected.label : placeholder}</Text>
        <Icon as={ChevronDown} size={15} className="text-slate-500" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View className="flex-1 justify-end">
          <Pressable onPress={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <View className={tw('rounded-t-3xl border-t border-white/10 light:border-black/10 bg-[#141a28] light:bg-white px-3 pt-3 glassy:glass-card')} style={{ maxHeight: '70%', paddingBottom: insets.bottom + 12 }}>
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-white/20" />
            {title ? <Text className={tw('px-2 pb-2 text-base font-semibold text-white light:text-slate-900')}>{title}</Text> : null}
            {options.length > 8 && (
              <TextInput value={query} onChangeText={setQuery} placeholder="Type to filter" placeholderTextColor="#64748b" className={tw('mx-1 mb-2 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-sm text-white light:text-slate-900')} />
            )}
            <FlatList
              data={shown}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = String(item.value) === String(value ?? '')
                return (
                  <Pressable disabled={item.disabled} onPress={() => { onChange(item.value); setOpen(false) }} className={tw('flex-row items-center justify-between rounded-lg px-3 py-3', active ? 'bg-accent-400/15' : '', item.disabled && 'opacity-40')}>
                    <Text className={tw('flex-1 text-sm', active ? 'text-accent-200 light:text-accent-700' : 'text-slate-200 light:text-slate-700')}>{item.label}</Text>
                    {active ? <Icon as={Check} size={14} className="text-accent-200 light:text-accent-700" /> : null}
                  </Pressable>
                )
              }}
              ListEmptyComponent={<Text className="px-3 py-4 text-sm text-slate-500">No matches</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}
