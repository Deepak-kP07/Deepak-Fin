import { Pressable, Text, View } from 'react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/EmptyState.jsx.
export function EmptyState({ icon, title, message, cta, onCta, compact = false }) {
  return (
    <View className={compact ? 'items-center p-5' : 'items-center p-14'}>
      <View className={tw(compact ? 'h-9 w-9 rounded-xl' : 'h-12 w-12 rounded-2xl', 'items-center justify-center bg-accent-300/10')}><Icon as={icon} size={compact ? 16 : 20} className="text-accent-200 light:text-accent-700" /></View>
      <Text className={tw(compact ? 'mt-2.5 text-sm' : 'mt-4 text-base', 'text-center font-medium text-white light:text-slate-900')}>{title}</Text>
      {message ? <Text className={tw(compact ? 'text-xs' : 'text-sm', 'mt-1 text-center text-slate-500')}>{message}</Text> : null}
      {cta ? <Pressable onPress={onCta} className={tw(compact ? 'mt-3 rounded-lg px-3 py-1.5' : 'mt-5 rounded-xl px-4 py-2.5', 'bg-accent-300')}><Text className={tw(compact ? 'text-xs' : 'text-sm', 'font-semibold text-[#07101c]')}>{cta}</Text></Pressable> : null}
    </View>
  )
}
