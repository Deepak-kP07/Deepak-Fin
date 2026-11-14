import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { colors, radius } from '../lib/theme'
import { useData } from '../state/DataProvider'

export function Screen({ title, right, children, scroll = true, refreshing, onRefresh, back = false }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const header = title ? (
    <View style={styles.header}>
      {back ? (
        <Pressable hitSlop={12} onPress={() => router.back()} style={{ marginRight: 8 }} accessibilityLabel="Back">
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <Text style={[styles.title, back && { fontSize: 22, flex: 1 }]} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  ) : null
  if (!scroll) {
    return <View style={[styles.screen, { paddingTop: insets.top }]}>{header}{children}</View>
  }
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} /> : undefined}
      >
        {header}
        {children}
      </ScrollView>
    </View>
  )
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>
}

export function Button({ label, onPress, variant = 'primary', disabled, busy, icon, style }) {
  const { accent } = useData() || {}
  const primary = variant === 'primary'
  const danger = variant === 'danger'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: accent || '#d4af37', borderColor: 'transparent' },
        danger && { backgroundColor: colors.dangerBg, borderColor: 'rgba(251,113,133,0.25)' },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={primary ? '#07101c' : colors.text} /> : (
        <View style={styles.buttonInner}>
          {icon ? <Feather name={icon} size={16} color={primary ? '#07101c' : danger ? colors.danger : colors.text} /> : null}
          <Text style={[styles.buttonText, primary && { color: '#07101c' }, danger && { color: colors.danger }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function Field({ label, style, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.textFaint} style={styles.input} {...inputProps} />
    </View>
  )
}

export function Segmented({ options, value, onChange }) {
  const { accent } = useData() || {}
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && { backgroundColor: colors.cardRaised, borderColor: accent }]}>
            <Text style={[styles.segmentText, active && { color: colors.text }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// A tappable field that opens a searchable list — stands in for the web app's <Select>.
export function Picker({ label, value, options, onChange, placeholder = 'Choose…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()
  const selected = options.find((o) => o.value === value)
  const q = query.trim().toLowerCase()
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable onPress={() => { setQuery(''); setOpen(true) }} style={[styles.input, styles.pickerField]}>
        <Text style={{ color: selected ? colors.text : colors.textFaint, fontSize: 15, flex: 1 }} numberOfLines={1}>{selected?.label || placeholder}</Text>
        <Feather name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.sheetTitle}>{label || placeholder}</Text>
          {options.length > 8 ? <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.textFaint} style={[styles.input, { marginBottom: 8 }]} /> : null}
          <FlatList
            data={shown}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.value); setOpen(false) }} style={styles.sheetRow}>
                <Text style={[styles.sheetRowText, item.value === value && { fontWeight: '600' }]}>{item.label}</Text>
                {item.value === value ? <Feather name="check" size={16} color={colors.text} /> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.muted}>Nothing matches.</Text>}
          />
        </View>
      </Modal>
    </View>
  )
}

// A row inside a Card: title + detail on the left, value (and optional sub-value) on the right.
export function ListRow({ title, detail, value, valueColor, subValue, dot, icon, onPress, last }) {
  const content = (
    <View style={[styles.listRow, !last && styles.listRowBorder]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {icon ? <Feather name={icon} size={18} color={colors.textMuted} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
        {detail ? <Text style={styles.listDetail} numberOfLines={2}>{detail}</Text> : null}
      </View>
      {value != null || subValue ? (
        <View style={{ alignItems: 'flex-end' }}>
          {value != null ? <Text style={[styles.listValue, valueColor && { color: valueColor }]}>{value}</Text> : null}
          {subValue ? <Text style={styles.listDetail}>{subValue}</Text> : null}
        </View>
      ) : null}
      {onPress ? <Feather name="chevron-right" size={16} color={colors.textFaint} /> : null}
    </View>
  )
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>{content}</Pressable> : content
}

export function ProgressBar({ pct, color }) {
  const { accent } = useData() || {}
  const clamped = Math.max(0, Math.min(100, pct || 0))
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color || accent }]} />
    </View>
  )
}

export function Stat({ label, value, color, style }) {
  return (
    <Card style={[{ flex: 1 }, style]}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Card>
  )
}

export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={28} color={colors.textFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text> : null}
      {action}
    </View>
  )
}

export function Loading() {
  return <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.textMuted} /></View>
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <Pressable onPress={onRetry} style={styles.errorBanner}>
      <Feather name="alert-circle" size={14} color={colors.danger} />
      <Text style={{ color: colors.danger, flex: 1, fontSize: 13 }}>{message}{onRetry ? ' — tap to retry' : ''}</Text>
    </Pressable>
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollBody: { paddingHorizontal: 16, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  sectionLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  button: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)', color: colors.text, fontSize: 15, paddingHorizontal: 14 },
  pickerField: { flexDirection: 'row', alignItems: 'center' },
  segmented: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segment: { flex: 1, minHeight: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: '70%', backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  sheetRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sheetRowText: { color: colors.text, fontSize: 15, flex: 1 },
  muted: { color: colors.textMuted, fontSize: 13 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listTitle: { color: colors.text, fontSize: 15, fontWeight: '500' },
  listDetail: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  listValue: { color: colors.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: 6, borderRadius: 3 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 10 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, backgroundColor: colors.dangerBg, padding: 12, marginBottom: 12 },
})
