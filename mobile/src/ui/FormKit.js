import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { BottomSheet } from './BottomSheet'
import { AccentGradient } from './Gradient'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { MONTH_NAMES, dateToLocalISO } from '../lib/format'

// The PWA's form vocabulary, ported once so every form looks the same as on the web:
// <FormSheet> (mobile forms are BottomSheets there), <Field label>, <Input>, <Pills>,
// <ColorPicker>, <DateInput>, <SubmitButton>.
export const INPUT = 'mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900'
export const PALETTE = ['#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#34d399', '#60a5fa', '#fb7185', '#facc15']

export function FormSheet({ open, onClose, title, children, submitLabel, onSubmit, busy, footer }) {
  return (
    <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={title}>
      {children}
      {onSubmit ? <SubmitButton label={submitLabel} onPress={onSubmit} busy={busy} /> : null}
      {footer}
    </BottomSheet>
  )
}

export function Field({ label, hint, children, style, optional }) {
  return (
    <View className="mb-3.5" style={style}>
      <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>{label}{optional ? <Text className="text-xs text-slate-500"> (optional)</Text> : null}</Text>
      {children}
      {hint ? <Text className="mt-1 text-[11px] text-slate-500">{hint}</Text> : null}
    </View>
  )
}

export function Input({ className, ...props }) {
  return <TextInput placeholderTextColor="#64748b" className={tw(INPUT, className)} {...props} />
}

export function Pills({ options, value, onChange, columns }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={columns ? { flexBasis: `${100 / columns - 3}%`, flexGrow: 1 } : { flexGrow: 1 }}
            className={tw('items-center rounded-xl border px-3 py-2.5', active ? 'border-accent-300/50 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
            <Text className={tw('text-sm font-medium', active ? 'text-white light:text-slate-900' : 'text-slate-400 light:text-slate-500')}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function ColorPicker({ value, onChange }) {
  return (
    <View className="mt-2 flex-row flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <Pressable key={c} onPress={() => onChange(c)} className={tw('h-8 w-8 rounded-full border-2', value === c ? 'border-white light:border-slate-900' : 'border-transparent')} style={{ backgroundColor: c }} />
      ))}
      {value && !PALETTE.includes(value) ? <View className="h-8 w-8 rounded-full border-2 border-white" style={{ backgroundColor: value }} /> : null}
    </View>
  )
}

const pretty = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${String(d).padStart(2, '0')}-${MONTH_NAMES[m - 1].slice(0, 3)}-${y}` }
export function DateInput({ value, onChange, allowFuture = true, placeholder = 'Pick a date', minDate }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className={tw(INPUT, 'flex-row items-center justify-between active:opacity-70')}>
        <Text className={tw(value ? 'text-white light:text-slate-900' : 'text-slate-500')}>{value ? pretty(value) : placeholder}</Text>
        <Icon as={Calendar} size={15} className="text-slate-500" />
      </Pressable>
      <CalendarPicker open={open} value={value} allowFuture={allowFuture} minDate={minDate}
        onClose={() => setOpen(false)} onPick={(iso) => { setOpen(false); onChange(iso) }} />
    </>
  )
}

// Port of components/shared/DateInput.jsx's popup calendar (the PWA doesn't use the browser's
// picker either). Tapping the month title switches to a year grid for far-away dates.
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export function CalendarPicker({ open, value, onPick, onClose, allowFuture = true, minDate }) {
  const [view, setView] = useState(() => (value ? new Date(`${value}T12:00:00`) : new Date()))
  const [years, setYears] = useState(false)
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) { setLastOpen(open); if (open) { setView(value ? new Date(`${value}T12:00:00`) : new Date()); setYears(false) } }
  const y = view.getFullYear(), m = view.getMonth()
  const today = dateToLocalISO(new Date())
  const firstDow = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const disabled = (d) => (!allowFuture && iso(d) > today) || (minDate && iso(d) < minDate)
  const thisYear = new Date().getFullYear()
  const yearList = Array.from({ length: 24 }, (_, i) => (allowFuture ? thisYear + 4 : thisYear) - 23 + i)
  return (
    <Modal visible={!!open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/60 p-5">
        <Pressable onPress={() => {}} className={tw('w-full max-w-sm rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-4')}>
          <View className="flex-row items-center justify-between">
            <Pressable hitSlop={8} onPress={() => setView(new Date(years ? y - 1 : y, years ? m : m - 1, 1))} className="rounded-xl p-2 active:bg-white/10"><Icon as={ChevronLeft} size={18} className="text-slate-400 light:text-slate-500" /></Pressable>
            <Pressable onPress={() => setYears((v) => !v)} className="rounded-xl px-3 py-1.5 active:bg-white/10">
              <Text className={tw('text-base font-semibold text-white light:text-slate-900')}>{years ? y : `${MONTH_NAMES[m]} ${y}`}</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setView(new Date(years ? y + 1 : y, years ? m : m + 1, 1))} className="rounded-xl p-2 active:bg-white/10"><Icon as={ChevronRight} size={18} className="text-slate-400 light:text-slate-500" /></Pressable>
          </View>
          {years ? (
            <View className="mt-3 flex-row flex-wrap">
              {yearList.map((yr) => (
                <View key={yr} style={{ width: '25%', padding: 3 }}>
                  <Pressable onPress={() => { setView(new Date(yr, m, 1)); setYears(false) }} className={tw('items-center rounded-xl py-2.5', yr === y ? 'bg-accent-400' : 'active:bg-white/10')}>
                    <Text className={tw('text-sm', yr === y ? 'font-semibold text-[#07101c]' : 'text-slate-300 light:text-slate-700')}>{yr}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View className="mt-3 flex-row">
                {WEEKDAYS.map((d, i) => <Text key={i} style={{ width: `${100 / 7}%` }} className="text-center text-[11px] font-medium uppercase text-slate-500">{d}</Text>)}
              </View>
              <View className="mt-1 flex-row flex-wrap">
                {cells.map((d, i) => {
                  if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 42 }} />
                  const k = iso(d), sel = k === value, isToday = k === today, off = disabled(d)
                  return (
                    <View key={i} style={{ width: `${100 / 7}%`, height: 42, padding: 2 }}>
                      <Pressable disabled={off} onPress={() => onPick(k)}
                        className={tw('flex-1 items-center justify-center rounded-xl', sel ? 'bg-accent-400' : isToday ? 'border border-accent-300/50' : 'active:bg-white/10', off && 'opacity-25')}>
                        <Text className={tw('text-sm', sel ? 'font-semibold text-[#07101c]' : isToday ? 'font-semibold text-accent-200 light:text-accent-700' : 'text-slate-200 light:text-slate-700')}>{d}</Text>
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            </>
          )}
          <View className={tw('mt-3 flex-row items-center justify-between border-t border-white/10 light:border-black/10 pt-3')}>
            <Pressable onPress={onClose} className="rounded-lg px-2 py-1.5 active:opacity-60"><Text className={tw('text-sm font-medium text-slate-400 light:text-slate-500')}>Cancel</Text></Pressable>
            <Pressable onPress={() => onPick(today)} className="rounded-lg px-2 py-1.5 active:opacity-60"><Text className={tw('text-sm font-semibold text-accent-300 light:text-accent-700')}>Today</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function SubmitButton({ label, onPress, busy, disabled, className = 'mt-6' }) {
  return (
    <Pressable disabled={busy || disabled} onPress={onPress} className={tw(className, (busy || disabled) && 'opacity-60')}>
      <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
        {busy ? <ActivityIndicator color="#07101c" /> : <Text className="text-sm font-semibold text-[#07101c]">{label}</Text>}
      </AccentGradient>
    </Pressable>
  )
}
