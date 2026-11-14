import { useState } from 'react'
import { Pressable } from 'react-native'

// NativeWind wraps Pressable and drops `style={({ pressed }) => …}` functions, which made rows lose
// their flex-row layout and buttons their background. This tracks `pressed` itself and passes a
// plain style, so those components keep working.
export function Press({ style, onPressIn, onPressOut, ...props }) {
  const [pressed, setPressed] = useState(false)
  const resolved = typeof style === 'function' ? style({ pressed }) : style
  return (
    <Pressable
      {...props}
      style={resolved}
      onPressIn={(e) => { setPressed(true); onPressIn?.(e) }}
      onPressOut={(e) => { setPressed(false); onPressOut?.(e) }}
    />
  )
}
