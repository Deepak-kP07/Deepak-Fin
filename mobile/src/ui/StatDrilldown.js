import { Modal, Pressable, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/StatDrilldown.jsx — centred card over a dimmed backdrop.
export function StatDrilldown({ open, onClose, title, icon, accent = 'bg-accent-400/15 text-accent-200 light:text-accent-700', rows = [], note, body }) {
  const chipBg = accent.split(' ').filter((c) => /(^|:)bg-/.test(c)).join(' ')
  const chipText = accent.split(' ').filter((c) => /(^|:)text-/.test(c)).join(' ')
  return (
    <Modal visible={!!open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/60 p-4">
        <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 glassy:glass-card')}>
          <View className="flex-row items-start justify-between gap-3">
            <View className={tw('h-11 w-11 items-center justify-center rounded-2xl', chipBg)}>{icon ? <Icon as={icon} size={18} className={chipText} /> : null}</View>
            <Pressable onPress={onClose} hitSlop={8} className="rounded-lg p-1.5"><Icon as={X} size={16} className="text-slate-500" /></Pressable>
          </View>
          <Text className={tw('mt-4 text-sm font-semibold text-white light:text-slate-900')}>{title}</Text>
          {body ? <Text className={tw('mt-3 text-sm leading-5 text-slate-300 light:text-slate-700')}>{body}</Text> : null}
          {rows.length > 0 && (
            <View className="mt-3">
              {rows.map((r, i) => (
                <View key={r.label} className={tw('flex-row items-center justify-between gap-3 py-2.5', i > 0 && 'border-t border-white/5 light:border-black/5')}>
                  <View className="flex-1">
                    <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{r.label}</Text>
                    {r.sub ? <Text className="mt-0.5 text-[11px] text-slate-500">{r.sub}</Text> : null}
                  </View>
                  <Text className={tw('text-sm font-semibold', r.tone || 'text-white light:text-slate-900')}>{r.value}</Text>
                </View>
              ))}
            </View>
          )}
          {note ? <Text className="mt-3 text-[11px] leading-4 text-slate-500">{note}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
