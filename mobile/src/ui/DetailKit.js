import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CheckCircle2, ChevronDown, ChevronLeft, Eye, EyeOff, MoreVertical, Trash2, X } from 'lucide-react-native'
import { Icon } from './Icon'
import { AccentGradient } from './Gradient'
import { tw } from '../lib/tw'
import { haptic } from '../lib/feedback'

// The pieces every PWA module/detail screen repeats on mobile, ported once.
export const CARD = 'rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card'
export const HERO = 'rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card'
export const ICON_BTN = 'rounded-xl border border-white/10 light:border-black/10 p-2.5'

export function BackLink({ label, onPress }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1.5 self-start">
      <Icon as={ChevronLeft} size={14} className={tw('text-slate-400 light:text-slate-500')} />
      <Text className={tw('text-sm text-slate-400 light:text-slate-500')}>{label}</Text>
    </Pressable>
  )
}

export function PageTitle({ title }) {
  return (
    <View className="min-w-0 flex-1">
      <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>{title}</Text>
    </View>
  )
}

export function Pill({ bg, fg, children }) {
  return <View className={tw('rounded-full px-2 py-0.5', bg)}><Text className={tw('text-[10px] uppercase tracking-widest', fg)}>{children}</Text></View>
}

export function EyeButton({ showMoney, onToggle }) {
  return <Pressable onPress={onToggle} className={tw(ICON_BTN)}><Icon as={showMoney ? Eye : EyeOff} size={16} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
}

// items: [{ icon, label, onPress, danger, hidden }]
export function MoreMenu({ items, width = 208 }) {
  const [open, setOpen] = useState(false)
  const shown = items.filter((i) => i && !i.hidden)
  if (shown.length === 0) return null
  return (
    <View className="relative">
      <Pressable onPress={() => setOpen((o) => !o)} className={tw('rounded-xl border p-2.5', open ? 'border-accent-300/40 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
        <Icon as={MoreVertical} size={16} className={open ? 'text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500'} />
      </Pressable>
      {open && (
        <View className={tw('absolute right-0 top-12 z-30 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1')} style={{ width, elevation: 12 }}>
          {shown.map((i) => {
            const tone = i.danger ? 'text-rose-300/70 light:text-rose-700' : 'text-slate-300 light:text-slate-700'
            return (
              <Pressable key={i.label} onPress={() => { setOpen(false); i.onPress() }} className="flex-row items-center gap-2 rounded-lg px-3 py-2">
                {i.icon ? <Icon as={i.icon} size={14} className={tw(tone)} /> : null}
                <Text className={tw('text-sm', tone)}>{i.label}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

export function GradientButton({ label, onPress, disabled, small, className }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} className={tw(className, disabled && 'opacity-50')}>
      <AccentGradient dir="r" style={{ borderRadius: small ? 8 : 12, paddingHorizontal: small ? 12 : 16, paddingVertical: small ? 8 : 10, alignItems: 'center' }}>
        <Text className={tw(small ? 'text-xs' : 'text-sm', 'font-semibold text-[#07101c]')}>{label}</Text>
      </AccentGradient>
    </Pressable>
  )
}

export function OutlineButton({ label, onPress, disabled, className }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} className={tw('items-center rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5', disabled && 'opacity-50', className)}>
      <Text className={tw('text-sm font-semibold text-slate-200 light:text-slate-800')}>{label}</Text>
    </Pressable>
  )
}

export function ProgressBar({ pct, color = 'bg-accent-400', className = 'mt-3 h-2' }) {
  return (
    <View className={tw('overflow-hidden rounded-full bg-white/5 light:bg-black/5', className)}>
      <View className={tw('h-full rounded-full', color)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </View>
  )
}

export function SectionHeader({ children, right }) {
  return (
    <View className={tw('flex-row items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
      <Text className="flex-1 text-xs uppercase tracking-widest text-slate-500">{children}</Text>
      {right}
    </View>
  )
}

// The long-press multi-select header bar (× · "N selected" · trash).
// While rows are selected (long-press), the module's section header turns into "N selected" and a
// floating Delete bar sits above the bottom nav — Gmail-style, so the action stays in reach however
// far down the list the rows are. The Shell draws the floating bar (<SelectionDock/>).
const dockListeners = new Set()
let dockState = null
const setDock = (next) => { dockState = next; dockListeners.forEach((l) => l(next)) }
export function useSelectionDock() {
  const [s, setS] = useState(dockState)
  useEffect(() => { dockListeners.add(setS); return () => { dockListeners.delete(setS) } }, [])
  return s
}

export function SelectBar({ count, onCancel, onDelete }) {
  const latest = useRef({ onCancel, onDelete })
  latest.current = { onCancel, onDelete }
  const token = useRef({})
  useEffect(() => {
    setDock({ token: token.current, count, onCancel: () => latest.current.onCancel(), onDelete: () => latest.current.onDelete() })
  }, [count])
  useEffect(() => { haptic('long'); return () => { if (dockState?.token === token.current) setDock(null) } }, [])
  return (
    <View className={tw('flex-row items-center gap-2 border-b border-white/10 light:border-black/10 px-5 py-3')}>
      <Pressable onPress={onCancel} hitSlop={6} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2')}><Icon as={X} size={15} className={tw('text-slate-400 light:text-slate-500')} /></Pressable>
      <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{count} selected</Text>
      <Text className="text-[11px] text-slate-500">Tap rows to add more</Text>
    </View>
  )
}

export function SelectMark({ selected }) {
  return selected ? <Icon as={CheckCircle2} size={22} className="text-accent-400" /> : <View className={tw('h-[22px] w-[22px] rounded-full border-2 border-white/20 light:border-black/20')} />
}

// Long-press-to-select state, same behaviour as the PWA's mobile lists.
export function useSelection() {
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const toggle = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const start = (id) => { if (!selectMode) { setSelectMode(true); toggle(id) } }
  const exit = () => { setSelectMode(false); setSelectedIds(new Set()) }
  return { selectMode, selectedIds, toggle, start, exit }
}

// The collapsible "calendar" card (Loans' EMI calendar, Chit funds' payment calendar).
export function CollapsibleCard({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <View className={tw(CARD)}>
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center justify-between gap-2 px-5 py-3">
        <Text className="flex-1 text-xs uppercase tracking-widest text-slate-500">{title}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon as={ChevronDown} size={14} className="text-slate-500" /></View>
      </Pressable>
      {open ? <View className={tw('border-t border-white/10 light:border-black/10')}>{children}</View> : null}
    </View>
  )
}

// The floating bar for SelectBar above — mounted once by the Shell, just above the bottom nav.
export function SelectionDock({ bottom }) {
  const dock = useSelectionDock()
  if (!dock) return null
  const n = dock.count
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom, zIndex: 40, elevation: 40 }}>
      <View className={tw('flex-row items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-[#1a2133] light:bg-white px-3 py-2.5')}
        style={{ elevation: 12, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
        <Pressable onPress={dock.onCancel} hitSlop={6} className="rounded-xl p-2 active:opacity-60"><Icon as={X} size={18} className={tw('text-slate-300 light:text-slate-600')} /></Pressable>
        <Text className={tw('flex-1 text-sm font-semibold text-white light:text-slate-900')}>{n} selected</Text>
        <Pressable disabled={n === 0} onPress={() => { haptic('medium'); dock.onDelete() }} className={tw('flex-row items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 active:opacity-80', n === 0 && 'opacity-40')}>
          <Trash2 size={16} color="#fff" /><Text className="text-sm font-semibold text-white">Delete</Text>
        </Pressable>
      </View>
    </View>
  )
}
