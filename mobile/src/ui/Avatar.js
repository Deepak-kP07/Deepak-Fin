import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { Image } from 'expo-image'
import { AccentGradient } from './Gradient'
import { tw } from '../lib/tw'

// Port of components/shared/Avatar.jsx — photo, or the initial on an accent→blue gradient.
const RADIUS = { 'rounded-xl': 12, 'rounded-full': 9999, 'rounded-2xl': 16 }
export function Avatar({ src, name, email, size = 36, rounded = 'rounded-xl' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const initials = (name || email || 'D').trim().slice(0, 1).toUpperCase()
  const radius = RADIUS[rounded] ?? 12
  if (src && !failed) {
    return <Image source={{ uri: src }} onError={() => setFailed(true)} className={tw('border border-white/10 light:border-black/10')} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />
  }
  return (
    <AccentGradient toColor="#2563eb" style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: Math.round(size * 0.4), fontWeight: '600', color: '#07101c' }}>{initials}</Text>
    </AccentGradient>
  )
}
