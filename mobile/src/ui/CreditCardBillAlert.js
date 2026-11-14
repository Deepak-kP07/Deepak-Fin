import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { AlertTriangle, X } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { cardsDueSoon } from '../lib/shared'
import { money } from '../lib/format'

// Port of components/shared/CreditCardBillAlert.jsx — dismissals remembered per card + due date.
const KEY = 'dismissedBillAlerts'
const dueDateKey = (due) => due.toISOString().slice(0, 10)

export function CreditCardBillAlert({ creditCards = [], transactions = [], onPay, showMoney = true }) {
  const dueSoon = cardsDueSoon(creditCards, transactions)
  const [dismissed, setDismissed] = useState({})
  useEffect(() => { SecureStore.getItemAsync(KEY).then((v) => setDismissed(JSON.parse(v || '{}'))).catch(() => {}) }, [])
  const dismiss = (cardId, key) => setDismissed((d) => { const next = { ...d, [cardId]: key }; SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {}); return next })
  const visible = dueSoon.filter(({ card, due }) => dismissed[card.id] !== dueDateKey(due))
  if (visible.length === 0) return null
  return (
    <View className="gap-2">
      {visible.map(({ card, days, due }) => {
        const overdue = days < 0
        const tone = overdue ? 'text-rose-200 light:text-rose-700' : 'text-amber-200 light:text-amber-700'
        return (
          <View key={card.id} className={tw('flex-row flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3', overdue ? 'border-rose-300/30 bg-rose-300/5' : 'border-amber-300/30 bg-amber-300/5')}>
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <Icon as={AlertTriangle} size={15} className={tone} />
              <Text className={tw('flex-1 text-sm', tone)}>
                <Text className="font-bold">{card.name}</Text> bill of {showMoney ? money(card.current_outstanding) : '••••'} is {overdue ? `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Pressable onPress={() => onPay(card)} className={tw('rounded-lg px-3 py-1.5', overdue ? 'bg-rose-300/20' : 'bg-amber-300/20')}>
                <Text className={tw('text-xs font-semibold', overdue ? 'text-rose-100 light:text-rose-800' : 'text-amber-100 light:text-amber-800')}>Pay now</Text>
              </Pressable>
              <Pressable onPress={() => dismiss(card.id, dueDateKey(due))} hitSlop={8} className="rounded-lg p-1 opacity-60"><Icon as={X} size={14} className={tone} /></Pressable>
            </View>
          </View>
        )
      })}
    </View>
  )
}
