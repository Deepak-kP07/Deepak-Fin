import { useEffect, useRef, useState } from 'react'
import { Keyboard, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { ToastHost } from './Dialogs'

// Port of components/shared/BottomSheet.jsx (vaul drawer): grabber, title row with close, scrolling body.
//
// Keyboard: the app is edge-to-edge, so Android no longer shrinks the window for the keyboard and a
// sheet's lower fields (a second budget line, the submit button) ended up hidden behind it. The
// sheet lifts itself by however much of the keyboard the window didn't already make room for.
// keyboardShouldPersistTaps="handled" lets a tap on another field/picker act straight away instead
// of only closing the keyboard first.
export function BottomSheet({ open, onOpenChange, title, children }) {
  const insets = useSafeAreaInsets()
  const close = () => onOpenChange(false)
  const [kb, setKb] = useState(0)
  const [rootH, setRootH] = useState(0)
  const fullH = useRef(0)
  useEffect(() => {
    if (!open) return
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates?.height || 0))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0))
    return () => { show.remove(); hide.remove(); setKb(0) }
  }, [open])
  const onRootLayout = (e) => {
    const h = e.nativeEvent.layout.height
    if (h > fullH.current) fullH.current = h
    setRootH(h)
  }
  const resizedBy = fullH.current && rootH ? fullH.current - rootH : 0
  const lift = Math.max(0, kb - resizedBy)
  return (
    <Modal visible={!!open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View className="flex-1 justify-end" onLayout={onRootLayout}>
        <Pressable onPress={close} className="absolute inset-0 bg-black/60" />
        <View className={tw('rounded-t-3xl border-t border-white/10 light:border-black/10 bg-[#141a28] light:bg-white glassy:glass-card')}
          style={{ maxHeight: rootH ? (rootH - lift) * 0.92 : '92%', marginBottom: lift }}>
          <View className="mt-3 h-1 w-10 self-center rounded-full bg-white/20" />
          <View className="flex-row items-center justify-between px-5 pt-3">
            <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{title}</Text>
            <Pressable onPress={close} hitSlop={8} className="rounded-lg p-1.5"><Icon as={X} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
          </View>
          <ScrollView className="px-5 pt-3" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: (lift ? 16 : insets.bottom) + 20 }}>{children}</ScrollView>
        </View>
      </View>
      <ToastHost />
    </Modal>
  )
}
