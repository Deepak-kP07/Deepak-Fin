import { Text, View } from 'react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/HeroStatTile.jsx.
export function HeroStatTile({ icon, label, value, valueTone = 'text-white light:text-slate-900', sub }) {
  return (
    <View className={tw('flex-1 rounded-2xl bg-white/[.04] light:bg-black/[.03] p-3.5 glassy:glass-pill')}>
      <View className="flex-row items-center gap-1.5">
        {icon ? <Icon as={icon} size={13} className="text-slate-400 light:text-slate-500" /> : null}
        <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>{label}</Text>
      </View>
      <Text numberOfLines={1} className={tw('mt-1 text-lg font-semibold', valueTone)}>{value}</Text>
      {sub ? <Text className="text-[11px] text-slate-500">{sub}</Text> : null}
    </View>
  )
}
