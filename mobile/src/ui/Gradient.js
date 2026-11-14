import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../state/ThemeProvider'

// Stand-in for the web's `bg-gradient-to-br from-accent-300 to-accent-600` (NativeWind gradients
// are web-only). `to` picks the direction like Tailwind's to-r / to-br.
const DIRS = { r: [{ x: 0, y: 0 }, { x: 1, y: 0 }], br: [{ x: 0, y: 0 }, { x: 1, y: 1 }], b: [{ x: 0, y: 0 }, { x: 0, y: 1 }] }
export function AccentGradient({ from = 300, to = 600, toColor, dir = 'br', style, children, ...props }) {
  const { accentColor } = useTheme()
  const [start, end] = DIRS[dir] || DIRS.br
  return <LinearGradient colors={[accentColor(from), toColor || accentColor(to)]} start={start} end={end} style={style} {...props}>{children}</LinearGradient>
}
