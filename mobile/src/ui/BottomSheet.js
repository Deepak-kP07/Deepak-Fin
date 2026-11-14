import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/BottomSheet.jsx (vaul drawer): grabber, title row with close, scrolling body.
export function BottomSheet({ open, onOpenChange, title, children }) {
  const insets = useSafeAreaInsets()
  const close = () => onOpenChange(false)
  return (
    <Modal visible={!!open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable onPress={close} className="absolute inset-0 bg-black/60" />
        <View className={tw('rounded-t-3xl border-t border-white/10 light:border-black/10 bg-[#141a28] light:bg-white glassy:glass-card')} style={{ maxHeight: '92%' }}>
          <View className="mt-3 h-1 w-10 self-center rounded-full bg-white/20" />
          <View className="flex-row items-center justify-between px-5 pt-3">
            <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{title}</Text>
            <Pressable onPress={close} hitSlop={8} className="rounded-lg p-1.5"><Icon as={X} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
          </View>
          <ScrollView className="px-5 pt-3" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  )
}
