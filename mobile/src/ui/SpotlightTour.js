import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { X } from 'lucide-react-native'
import { Icon } from './Icon'
import { AccentGradient } from './Gradient'
import { tw } from '../lib/tw'

// Native port of components/shared/SpotlightTour.jsx. Each step's onEnter(context) drives the app
// to the screen it's about; then getTarget(step) measures the element to spotlight (a bottom-nav
// item, the More button, the Settings section picker) in window coordinates. The dim is four
// rectangles around that hole; with no target the card sits centred over a full dim.
const PAD = 6
const DIM = 'rgba(0,0,0,0.62)'

export function SpotlightTour({ steps, open, startIndex = 0, context, getTarget, onSkip, onFinish }) {
  const { height: H } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [cardH, setCardH] = useState(0)
  // The overlay is taken down while a step sets up and shown again once its target is measured.
  // Re-showing it puts it above anything the step opened (the More sheet is its own modal window
  // on Android, which would otherwise cover the tour).
  const [presented, setPresented] = useState(false)
  const fade = useRef(new Animated.Value(0)).current
  const step = steps[index]

  useEffect(() => { if (open) setIndex(Math.min(Math.max(0, startIndex), steps.length - 1)) }, [open, startIndex, steps.length])
  useEffect(() => { if (!open) setPresented(false) }, [open])

  const measure = useCallback(async () => {
    const r = await getTarget(step).catch(() => null)
    setRect(r && r.width > 0 && r.height > 0 ? r : null)
    setPresented(true)
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start()
  }, [getTarget, step, fade])

  useEffect(() => {
    if (!open || !step) return
    fade.setValue(0)
    setRect(null)
    setPresented(false)
    step.onEnter?.(context)
    // Let the navigation the step triggered (and the More sheet's slide-up) finish before measuring.
    const t = setTimeout(measure, 480)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index])

  if (!open || !step) return null
  const isLast = index === steps.length - 1
  const next = () => (isLast ? onFinish() : setIndex((i) => i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  const hole = rect ? { x: Math.max(0, rect.x - PAD), y: Math.max(0, rect.y - PAD), w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null
  // Card goes on whichever side of the hole has room; centred when there's no hole.
  const cardStyle = !hole
    ? { top: Math.max(24, (H - cardH) / 2) }
    : hole.y + hole.h / 2 > H / 2
      ? { top: Math.max(24, hole.y - cardH - 14) }
      : { top: Math.min(H - cardH - 24, hole.y + hole.h + 14) }

  return (
    <Modal visible={presented} transparent animationType="none" statusBarTranslucent onRequestClose={onSkip}>
      <View style={{ flex: 1 }}>
        {hole ? (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: hole.y, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', left: 0, width: hole.x, top: hole.y, height: hole.h, backgroundColor: DIM }} />
            <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: DIM }} />
            <Animated.View pointerEvents="none" className="border-accent-300" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 14, borderWidth: 2, opacity: fade }} />
          </>
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: DIM }} />
        )}

        <Animated.View onLayout={(e) => setCardH(e.nativeEvent.layout.height)} style={[{ position: 'absolute', left: 16, right: 16, opacity: fade }, cardStyle]}
          className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-5')}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-2">
              {step.icon ? <Icon as={step.icon} size={16} className="text-accent-300 light:text-accent-700" /> : null}
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{step.title}</Text>
            </View>
            <Pressable onPress={onSkip} hitSlop={10} accessibilityLabel="Skip tour" className="rounded-lg p-1"><Icon as={X} size={14} className="text-slate-500" /></Pressable>
          </View>
          <Text className={tw('mt-2 text-xs leading-5 text-slate-400 light:text-slate-600')}>{step.description}</Text>
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-500">{index + 1} / {steps.length}</Text>
            <View className="flex-row items-center gap-2">
              {index > 0 ? <Pressable onPress={back} className="rounded-lg px-3 py-1.5"><Text className={tw('text-xs font-medium text-slate-400 light:text-slate-500')}>Back</Text></Pressable> : null}
              <Pressable onPress={next}>
                <AccentGradient dir="r" style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}><Text className="text-xs font-semibold text-[#07101c]">{isLast ? 'Finish' : 'Next'}</Text></AccentGradient>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// Measures a mounted view in window coordinates (what the Modal overlay draws in).
export function measureView(node) {
  return new Promise((resolve) => {
    if (!node?.measureInWindow) return resolve(null)
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }))
  })
}
