import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { capitalizeFirst, money, timeLabel } from '../lib/format'
import { sourceName } from '../lib/transactions'
import { colors } from '../lib/theme'

const ICON = { income: 'arrow-down-left', expense: 'arrow-up-right', transfer: 'repeat' }

export function TransactionRow({ t, accounts, categories, creditCards, onPress }) {
  const category = categories.find((c) => c.id === t.category_id)
  const isTransfer = t.type === 'transfer'
  const toName = isTransfer ? accounts.find((a) => a.id === t._to_account_id)?.name : null
  const from = sourceName(t, accounts, creditCards)
  const subtitle = [isTransfer ? `${from}${toName ? ` → ${toName}` : ''}` : category?.name || 'Uncategorised', !isTransfer && from, timeLabel(t.time)].filter(Boolean).join(' · ')
  const amountColor = t.type === 'income' ? colors.income : t.type === 'expense' ? colors.expense : colors.textMuted
  const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.icon}><Feather name={ICON[t.type] || 'circle'} size={16} color={amountColor} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{capitalizeFirst(t.description) || category?.name || 'Transaction'}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{sign}{money(t.amount)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 15, fontWeight: '500' },
  subtitle: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
})
