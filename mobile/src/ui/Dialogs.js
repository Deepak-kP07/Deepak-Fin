import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AlertTriangle, CheckCircle2, Info, LogOut, Trash2, XCircle } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AccentGradient } from './Gradient'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// The app's own dialog + toast, replacing Android's stock Alert.alert / ToastAndroid so every
// confirmation looks like the PWA's ConfirmDialog and Toast (useConfirm / useToast).
//
//   dialog.alert(title, message, buttons)   — same shape as Alert.alert; buttons take
//                                              { text, style: 'cancel' | 'destructive', onPress }
//   dialog.confirm({ title, message, confirmLabel, tone }) → Promise<boolean>
//   showToast(message, tone)                 — tone: success | error | warning | info
//
// An alert with no buttons is just a heads-up (e.g. "Enter a description"), so it shows as a
// warning toast instead of a blocking dialog.
//
// <DialogHost/> and <ToastHost/> are mounted once at the root. Android draws each Modal in its
// own window, so a toast fired while a bottom sheet is open would sit underneath it — BottomSheet
// mounts its own <ToastHost/>, and only the most recently mounted host draws toasts.

function createStore(initial) {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set: (next) => { state = typeof next === 'function' ? next(state) : next; subs.forEach((s) => s(state)) },
    sub: (fn) => { subs.add(fn); return () => subs.delete(fn) },
  }
}
function useStore(store) {
  const [s, setS] = useState(store.get())
  useEffect(() => store.sub(setS), [store])
  return s
}

/* ---------------------------------- dialog ---------------------------------- */
const dialogStore = createStore([]) // queue; the head is on screen

export const dialog = {
  alert(title, message, buttons) {
    if (!buttons || !buttons.length) {
      const tone = /fail|could ?n|can't|error|wrong|denied/i.test(title) ? 'error'
        : /finished|saved|deleted|disconnected|cleared|changed|\bset\b|done|added|updated/i.test(title) ? 'success' : 'warning'
      showToast(message ? `${title} — ${message}` : title, tone)
      return
    }
    dialogStore.set((q) => [...q, { title, message, buttons, id: Math.random() }])
  },
  confirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', icon } = {}) {
    return new Promise((resolve) => {
      dialogStore.set((q) => [...q, {
        title, message, icon, tone, id: Math.random(),
        buttons: [
          { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
          { text: confirmLabel, style: tone === 'danger' ? 'destructive' : 'default', onPress: () => resolve(true) },
        ],
        onDismiss: () => resolve(false),
      }])
    })
  },
}

export function DialogHost() {
  const queue = useStore(dialogStore)
  const current = queue[0]
  const close = (btn) => {
    dialogStore.set((q) => q.slice(1))
    if (btn?.onPress) setTimeout(() => btn.onPress(), 0)
    else if (!btn) current?.onDismiss?.()
  }
  const dismiss = () => {
    const cancel = current?.buttons.find((b) => b.style === 'cancel')
    close(cancel || null)
  }
  if (!current) return null
  const destructive = current.buttons.some((b) => b.style === 'destructive')
  const warn = current.icon === AlertTriangle
  const TheIcon = current.icon || (destructive ? Trash2 : /sign out/i.test(current.title) ? LogOut : Info)
  const stacked = current.buttons.length > 2
  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable onPress={dismiss} className="flex-1 items-center justify-center bg-black/60 p-5">
        <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6')}>
          <View className={tw('h-11 w-11 items-center justify-center rounded-2xl', destructive ? 'bg-rose-400/15' : warn ? 'bg-amber-400/15' : 'bg-accent-400/15')}>
            <Icon as={TheIcon} size={18} className={destructive ? 'text-rose-300 light:text-rose-700' : warn ? 'text-amber-300 light:text-amber-700' : 'text-accent-200 light:text-accent-700'} />
          </View>
          <Text className={tw('mt-4 text-base font-semibold text-white light:text-slate-900')}>{current.title}</Text>
          {current.message ? <Text className={tw('mt-1.5 text-sm leading-5 text-slate-400 light:text-slate-500')}>{current.message}</Text> : null}
          <View className={tw('mt-6 gap-2', stacked ? 'flex-col' : 'flex-row justify-end')}>
            {current.buttons.map((b, i) => <DialogButton key={i} button={b} stacked={stacked} onPress={() => close(b)} />)}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function DialogButton({ button, stacked, onPress }) {
  const wrap = stacked ? 'w-full' : 'min-w-[96px]'
  if (button.style === 'cancel') {
    return (
      <Pressable onPress={onPress} className={tw(wrap, 'items-center rounded-xl border border-white/10 light:border-black/10 px-4 py-3 active:opacity-60')}>
        <Text className={tw('text-sm font-medium text-slate-300 light:text-slate-700')}>{button.text || 'Cancel'}</Text>
      </Pressable>
    )
  }
  const label = <Text className={tw('text-sm font-semibold', button.style === 'destructive' ? 'text-white' : 'text-[#07101c]')}>{button.text || 'OK'}</Text>
  const box = { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }
  return (
    <Pressable onPress={onPress} className={tw(wrap, 'active:opacity-80')}>
      {button.style === 'destructive'
        ? <LinearGradient colors={['#fb7185', '#e11d48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={box}>{label}</LinearGradient>
        : <AccentGradient dir="r" style={box}>{label}</AccentGradient>}
    </Pressable>
  )
}

/* ---------------------------------- toast ---------------------------------- */
const toastStore = createStore([])
const hostStore = createStore([])
let nextHostId = 1

export function showToast(message, tone = 'success') {
  const id = Math.random()
  toastStore.set((t) => [...t.slice(-2), { id, message: String(message || ''), tone }])
  setTimeout(() => toastStore.set((t) => t.filter((x) => x.id !== id)), tone === 'error' || tone === 'warning' ? 4200 : 2600)
}

const TONES = {
  success: { icon: CheckCircle2, box: 'border-emerald-400/30 bg-[#0f2a22] light:bg-emerald-50', text: 'text-emerald-100 light:text-emerald-800', icn: 'text-emerald-300 light:text-emerald-700' },
  error: { icon: XCircle, box: 'border-rose-400/30 bg-[#2a1018] light:bg-rose-50', text: 'text-rose-100 light:text-rose-800', icn: 'text-rose-300 light:text-rose-700' },
  warning: { icon: AlertTriangle, box: 'border-amber-300/30 bg-[#2a2210] light:bg-amber-50', text: 'text-amber-100 light:text-amber-800', icn: 'text-amber-300 light:text-amber-700' },
  info: { icon: Info, box: 'border-accent-300/30 bg-[#141a28] light:bg-white', text: 'text-slate-100 light:text-slate-800', icn: 'text-accent-200 light:text-accent-700' },
}

export function ToastHost() {
  const idRef = useRef(null)
  if (idRef.current == null) idRef.current = nextHostId++
  const hosts = useStore(hostStore)
  const toasts = useStore(toastStore)
  const insets = useSafeAreaInsets()
  useEffect(() => {
    const id = idRef.current
    hostStore.set((h) => [...h, id])
    return () => hostStore.set((h) => h.filter((x) => x !== id))
  }, [])
  if (hosts[hosts.length - 1] !== idRef.current || !toasts.length) return null
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, zIndex: 999, elevation: 999 }}>
      {toasts.map((t) => <ToastPill key={t.id} toast={t} />)}
    </View>
  )
}

function ToastPill({ toast }) {
  const a = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start() }, [a])
  const t = TONES[toast.tone] || TONES.success
  const dismiss = () => toastStore.set((list) => list.filter((x) => x.id !== toast.id))
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }], marginBottom: 8 }}>
      <Pressable onPress={dismiss} className={tw('flex-row items-center gap-3 rounded-2xl border px-4 py-3', t.box)} style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
        <Icon as={t.icon} size={17} className={t.icn} />
        <Text className={tw('flex-1 text-sm font-medium', t.text)}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  )
}
