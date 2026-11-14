import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Feather } from '@expo/vector-icons'
import { styles as ui } from './ui'
import { dateToLocalISO, dayLabel } from '../lib/format'
import { colors } from '../lib/theme'

// Full-screen modal form: title + close button, scrolling body, footer actions.
export function FormShell({ title, subtitle, onClose, children, footer }) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[ui.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={ui.muted} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><Feather name="x" size={22} color={colors.textMuted} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {children}
        {footer ? <View style={{ gap: 10, marginTop: 8 }}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// Date picker field. Past and today only unless allowFuture.
export function DateField({ label = 'Date', value, onChange, allowFuture = false, optional = false }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[ui.input, ui.pickerField]}>
        <Text style={{ color: value ? colors.text : colors.textFaint, fontSize: 15, flex: 1 }}>{value ? dayLabel(value) : optional ? 'Not set' : 'Choose a date'}</Text>
        {optional && value ? <Pressable hitSlop={10} onPress={() => onChange('')}><Feather name="x-circle" size={16} color={colors.textFaint} /></Pressable> : <Feather name="calendar" size={16} color={colors.textMuted} />}
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? new Date(`${value}T12:00:00`) : new Date()}
          mode="date"
          maximumDate={allowFuture ? undefined : new Date()}
          onChange={(event, picked) => { setOpen(false); if (event.type === 'set' && picked) onChange(dateToLocalISO(picked)) }}
        />
      )}
    </View>
  )
}

// Bank/cash/wallet accounts a payment can come from or go into (debit cards resolve to these).
export function bankAccountOptions(accounts) {
  return accounts.filter((a) => a.is_active !== false && a.type !== 'debit_card').map((a) => ({ value: a.id, label: a.name }))
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  topTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
})
