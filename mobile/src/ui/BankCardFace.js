import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Wifi } from 'lucide-react-native'

// Port of components/shared/BankCardFace.jsx: diagonal colour → near-black gradient, gold chip,
// contactless mark, masked number, name and issuer.
export function BankCardFace({ name, subtitle, last4, color = '#a78bfa', revealedNumber, holderName, style }) {
  return (
    <LinearGradient colors={[color, `${color}cc`, '#0b0f18']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ width: '100%', aspectRatio: 85 / 54, borderRadius: 16, overflow: 'hidden', padding: 16, elevation: 6 }, style]}>
      <LinearGradient colors={['rgba(255,255,255,0.06)', 'transparent', 'rgba(0,0,0,0.25)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="flex-1 justify-between">
        <View className="flex-row items-start justify-between">
          <LinearGradient colors={['#fef08a', '#fde047', '#eab308']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 24, width: 32, borderRadius: 5, padding: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
            {Array.from({ length: 6 }).map((_, i) => <View key={i} style={{ width: '31%', height: '46%', borderRadius: 1, backgroundColor: 'rgba(161,98,7,0.4)' }} />)}
          </LinearGradient>
          <View style={{ transform: [{ rotate: '90deg' }] }}><Wifi size={18} color="rgba(255,255,255,0.7)" /></View>
        </View>
        <View>
          <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: '700', letterSpacing: 2.3, color: 'rgba(255,255,255,0.9)' }}>{revealedNumber || `•••• •••• •••• ${last4 || '••••'}`}</Text>
          <Text numberOfLines={1} className="mt-2 text-xs font-semibold text-white">{holderName || name}</Text>
          {(subtitle || last4) ? (
            <Text numberOfLines={1} className="mt-0.5 text-[9px] uppercase tracking-widest text-white/60">
              {holderName ? [name, subtitle].filter(Boolean).join(' · ') : [subtitle, last4 ? `••${last4}` : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  )
}
