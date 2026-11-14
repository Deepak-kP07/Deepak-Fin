import { Pressable, Text, View } from 'react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/StatCard.jsx. `accent` is the icon-chip classes ("bg-… text-…");
// the bg goes on the chip, the text colour on the icon.
export function StatCard({ label, value, sub, icon, accent = 'bg-accent-300/10 text-accent-200 light:text-accent-700', tone = 'text-emerald-300 light:text-emerald-700', onPress }) {
  const chipBg = accent.split(' ').filter((c) => /(^|:)bg-/.test(c)).join(' ')
  const chipText = accent.split(' ').filter((c) => /(^|:)text-/.test(c)).join(' ')
  const Wrapper = onPress ? Pressable : View
  return (
    <Wrapper onPress={onPress} className={tw('min-w-0 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-3.5 glassy:glass-card', onPress && 'active:opacity-80')}>
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className={tw('flex-1 text-xs text-slate-400 light:text-slate-500')}>{label}</Text>
        <View className={tw('h-7 w-7 items-center justify-center rounded-lg', chipBg)}><Icon as={icon} size={14} className={chipText} /></View>
      </View>
      <Text numberOfLines={1} className={tw('mt-2.5 text-xl font-semibold tracking-tight text-white light:text-slate-900')}>{value}</Text>
      {sub ? (typeof sub === 'string' ? <Text numberOfLines={1} className={tw('mt-1 text-[11px]', tone)}>{sub}</Text> : <View className="mt-1 flex-row items-center gap-1">{sub}</View>) : null}
    </Wrapper>
  )
}
