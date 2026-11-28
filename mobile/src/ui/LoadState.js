import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { CloudOff, RefreshCw } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'

// The PWA's loading skeleton (app/page.js: four stat tiles + one tall chart block), pulsing.
export function LoadingSkeleton() {
  const pulse = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [pulse])
  const block = tw('rounded-2xl bg-white/[.06] light:bg-black/[.06]')
  return (
    <Animated.View style={{ opacity: pulse }} className="gap-4">
      <View className={tw(block, 'h-32')} />
      <View className="flex-row gap-4"><View className={tw(block, 'h-28 flex-1')} /><View className={tw(block, 'h-28 flex-1')} /></View>
      <View className="flex-row gap-4"><View className={tw(block, 'h-28 flex-1')} /><View className={tw(block, 'h-28 flex-1')} /></View>
      <View className={tw(block, 'h-72')} />
    </Animated.View>
  )
}

// Nothing has loaded yet and the load failed — there's no data to fall back on, so say so instead
// of rendering every module's empty state ("No accounts yet") as if the account were empty.
export function LoadError({ message, onRetry, retrying }) {
  return (
    <View className="items-center px-4 py-16">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10"><Icon as={CloudOff} size={20} className="text-rose-300 light:text-rose-600" /></View>
      <Text className={tw('mt-4 text-center text-base font-medium text-white light:text-slate-900')}>Couldn't load your data</Text>
      <Text className="mt-1 text-center text-sm text-slate-500">{friendly(message)}</Text>
      <Pressable disabled={retrying} onPress={onRetry} className={tw('mt-5 flex-row items-center gap-2 rounded-xl bg-accent-300 px-4 py-2.5', retrying && 'opacity-60')}>
        <Icon as={RefreshCw} size={14} className="text-[#07101c]" />
        <Text className="text-sm font-semibold text-[#07101c]">{retrying ? 'Retrying…' : 'Try again'}</Text>
      </Pressable>
    </View>
  )
}

// A network failure (offline, DNS, timeout) rather than an error from the server.
export function isNetworkError(message) {
  return /network request failed|fetch failed|failed to fetch|connectexception|unknownhost|unable to resolve|timed? ?out/i.test(String(message || ''))
}

function friendly(message) {
  if (isNetworkError(message)) return 'Check your internet connection and try again.'
  return String(message || '') || 'Please try again in a moment.'
}
