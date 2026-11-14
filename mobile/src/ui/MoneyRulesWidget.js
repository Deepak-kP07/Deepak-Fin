import { Pressable, Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { capitalizeFirst } from '../lib/format'

// Port of features/money-rules/MoneyRulesWidget.jsx.
export function MoneyRulesWidget({ rules, onOpen }) {
  const active = rules.filter((r) => r.is_active).slice(0, 4)
  return (
    <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-5 glassy:glass-card')}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-accent-400/15"><Icon as={Star} size={15} className="text-accent-200 light:text-accent-700" /></View>
          <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Money rules</Text>
        </View>
        <Pressable onPress={onOpen} hitSlop={8}><Text className={tw('text-xs text-accent-300 light:text-accent-700')}>Manage</Text></Pressable>
      </View>
      {active.length === 0 ? (
        <Pressable onPress={onOpen} className={tw('w-full items-center rounded-xl border border-dashed border-white/10 light:border-black/10 py-4')}>
          <Text className={tw('text-sm text-slate-400 light:text-slate-500')}>+ Add your first financial rule</Text>
        </Pressable>
      ) : (
        <View className="gap-2">
          {active.map((r) => (
            <View key={r.id} className="flex-row items-start gap-2">
              <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-300" />
              <Text className={tw('flex-1 text-sm text-slate-200 light:text-slate-700')}>{capitalizeFirst(r.rule_text)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
