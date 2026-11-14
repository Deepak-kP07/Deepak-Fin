import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { X } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// Port of components/shared/DismissibleBanner.jsx — the × remembers the dismissal under `id`
// (device storage here instead of localStorage), so it stays gone across visits.
const TONES = {
  cyan: ['border-accent-300/20 bg-accent-300/5', 'text-accent-200 light:text-accent-700'],
  amber: ['border-amber-300/20 bg-amber-300/5', 'text-amber-200 light:text-amber-700'],
  slate: ['border-slate-500/25 bg-slate-500/5', 'text-slate-300 light:text-slate-700'],
}
const keyFor = (id) => `dismissed_banner.${String(id).replace(/[^A-Za-z0-9._-]/g, '_')}`.slice(0, 200)

export function DismissibleBanner({ id, tone = 'cyan', children }) {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    let alive = true
    if (!id) { setDismissed(false); return }
    SecureStore.getItemAsync(keyFor(id)).then((v) => { if (alive) setDismissed(v === '1') }, () => { if (alive) setDismissed(false) })
    return () => { alive = false }
  }, [id])
  if (dismissed) return null
  const [box, text] = TONES[tone] || TONES.cyan
  const dismiss = () => { setDismissed(true); if (id) SecureStore.setItemAsync(keyFor(id), '1').catch(() => {}) }
  return (
    <View className={tw('flex-row items-start gap-2 rounded-xl border px-4 py-2.5', box)}>
      <View className="min-w-0 flex-1">{typeof children === 'string' ? <Text className={tw('text-xs leading-5', text)}>{children}</Text> : children}</View>
      <Pressable onPress={dismiss} hitSlop={8} className="rounded-lg p-0.5 opacity-60"><Icon as={X} size={14} className={text} /></Pressable>
    </View>
  )
}
