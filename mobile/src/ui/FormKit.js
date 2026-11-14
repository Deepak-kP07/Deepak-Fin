import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar } from 'lucide-react-native'
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
export function DateInput({ value, onChange, allowFuture = true, placeholder = 'Pick a date' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className={tw(INPUT, 'flex-row items-center justify-between')}>
        <Text className={tw(value ? 'text-white light:text-slate-900' : 'text-slate-500')}>{value ? pretty(value) : placeholder}</Text>
        <Icon as={Calendar} size={15} className="text-slate-500" />
      </Pressable>
      {open && (
        <DateTimePicker value={value ? new Date(`${value}T12:00:00`) : new Date()} mode="date" maximumDate={allowFuture ? undefined : new Date()}
          onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) onChange(dateToLocalISO(d)) }} />
      )}
    </>
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
