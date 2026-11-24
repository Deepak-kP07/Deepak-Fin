import { useRef } from 'react'
import { Animated, PanResponder, Pressable, Text, View } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'
import { haptic } from '../lib/feedback'
import { tw } from '../lib/tw'

// Gmail-style row actions: drag a row right-to-left to reveal Edit and Delete behind it; a long
// drag goes straight to Edit. Tap still opens the row, long-press still starts selecting. Only one
// row stays open at a time, and any tap on an open row just closes it.
const ACTION_W = 76
let openRow = null // the row currently swiped open: { close }
// For page-level gestures (Transactions' list ⇄ chart swipe): closes whichever row is open.
export function closeOpenRow() { const r = openRow; if (r) { r.close(); return true } return false }

export function SwipeRow({ children, onEdit, onDelete, disabled }) {
  const x = useRef(new Animated.Value(0)).current
  const offset = useRef(0)
  const width = useRef(360)
  const actions = [onEdit && 'edit', onDelete && 'delete'].filter(Boolean)
  const reveal = actions.length * ACTION_W
  const self = useRef({})

  const snap = (to) => {
    offset.current = to
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 18 }).start()
    if (to !== 0) { if (openRow && openRow !== self.current) openRow.close(); openRow = self.current }
    else if (openRow === self.current) openRow = null
  }
  self.current.close = () => snap(0)

  const pan = useRef(PanResponder.create({
    // An open row owns every gesture that starts on it — a tap or a swipe back just closes it, and
    // nothing leaks through to the page (which would otherwise flip to the chart).
    onStartShouldSetPanResponderCapture: () => offset.current < 0,
    onMoveShouldSetPanResponderCapture: () => offset.current < 0,
    onMoveShouldSetPanResponder: (_, g) => !disabledRef.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && (g.dx < 0 || offset.current < 0),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { x.stopAnimation() },
    onPanResponderMove: (_, g) => {
      const next = Math.min(0, offset.current + g.dx)
      x.setValue(next < -reveal ? -reveal + (next + reveal) * 0.35 : next) // rubber-band past the actions
    },
    onPanResponderRelease: (_, g) => {
      if (offset.current < 0 && Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) { snap(0); return } // tap on an open row
      const end = offset.current + g.dx
      if (onEditRef.current && end < -width.current * 0.55) { haptic('medium'); snap(0); onEditRef.current(); return }
      if (end < -reveal / 2 || g.vx < -0.5) { haptic('light'); snap(-reveal) } else snap(0)
    },
    onPanResponderTerminate: () => snap(offset.current < -reveal / 2 ? -reveal : 0),
  })).current
  const disabledRef = useRef(disabled); disabledRef.current = disabled || !actions.length
  const onEditRef = useRef(onEdit); onEditRef.current = onEdit

  const act = (fn) => { snap(0); fn() }
  return (
    <View onLayout={(e) => { width.current = e.nativeEvent.layout.width }} style={{ overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, flexDirection: 'row', opacity: x.interpolate({ inputRange: [-24, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
        {onEdit ? (
          <Pressable onPress={() => act(onEdit)} style={{ width: ACTION_W, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Pencil size={18} color="#fff" /><Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Edit</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={() => act(onDelete)} style={{ width: ACTION_W, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Trash2 size={18} color="#fff" /><Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Delete</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        <View className={tw('bg-[#0e121c] light:bg-[#f6f7f9] glassy:bg-[#161c2a]')}>
          {children}
        </View>
      </Animated.View>
    </View>
  )
}
