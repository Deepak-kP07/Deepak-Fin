import { Pressable, Text, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { MONTH_NAMES } from '../lib/format'

// Port of components/shared/MonthCursor.jsx — month stepper + "All" toggle.
export function MonthCursor({ cursor, onShift, showAll, onToggleAll }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={tw('flex-row items-center rounded-xl border border-white/10 light:border-black/10', showAll && 'opacity-50')}>
        <Pressable onPress={() => onShift(-1)} className="rounded-l-xl p-2"><Icon as={ChevronLeft} size={14} className="text-slate-400 light:text-slate-500" /></Pressable>
        <Text className={tw('w-9 text-center text-xs font-semibold uppercase tracking-wider text-slate-300 light:text-slate-700')}>{MONTH_NAMES[cursor.month].slice(0, 3)}</Text>
        <Pressable onPress={() => onShift(1)} className="rounded-r-xl p-2"><Icon as={ChevronRight} size={14} className="text-slate-400 light:text-slate-500" /></Pressable>
      </View>
      <Pressable onPress={onToggleAll} className={tw('rounded-xl border px-3 py-2', showAll ? 'border-accent-300/40 bg-accent-400/15' : 'border-white/10 light:border-black/10')}>
        <Text className={tw('text-[11px] font-semibold uppercase tracking-wider', showAll ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500')}>All</Text>
      </Pressable>
    </View>
  )
}
