import { createContext, useContext, useMemo } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useData } from './DataProvider'
import { accentColor, accentVars, DEFAULT_ACCENT } from '../lib/accent'
import { setTwTheme } from '../lib/tw'

// Dark / Light / Glass + accent colour, read from the same profile fields the web app saves
// (profiles.theme, profiles.accent_color). The tree is keyed by theme so every tw() call re-resolves.
const ThemeContext = createContext({ theme: 'dark', accent: DEFAULT_ACCENT })
const BG = { dark: '#080b12', light: '#eef1f6', glass: '#080b12' }

export function ThemeProvider({ children }) {
  const { data } = useData()
  // EXPO_PUBLIC_FORCE_THEME (dev only, .env.local) previews a theme without changing the profile.
  const raw = process.env.EXPO_PUBLIC_FORCE_THEME || data.profile?.theme
  // The web stores the Glass theme as 'glassy'.
  const theme = raw === 'glassy' || raw === 'glass' ? 'glass' : raw === 'light' ? 'light' : 'dark'
  const accent = data.profile?.accent_color || DEFAULT_ACCENT
  setTwTheme(theme)
  const value = useMemo(() => ({ theme, accent, bg: BG[theme], accentColor: (step, alpha) => accentColor(accent, step, alpha) }), [theme, accent])
  const style = useMemo(() => [{ flex: 1, backgroundColor: BG[theme] }, accentVars(accent)], [theme, accent])
  return (
    <ThemeContext.Provider value={value}>
      <View key={theme} style={style}>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        {theme === 'glass' ? <GlassGlow color={accentColor(accent, 400)} deep={accentColor(accent, 700)} /> : null}
        {children}
      </View>
    </ThemeContext.Provider>
  )
}

// The web's Glass theme puts two faint, heavily blurred accent glows in opposite corners behind
// everything (app/globals.css `.glassy body::before/::after`); radial gradients stand in for blur.
function GlassGlow({ color, deep }) {
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <RadialGradient id="g1" cx="0%" cy="0%" r="70%"><Stop offset="0" stopColor={color} stopOpacity={0.22} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient>
        <RadialGradient id="g2" cx="100%" cy="100%" r="65%"><Stop offset="0" stopColor={deep} stopOpacity={0.22} /><Stop offset="1" stopColor={deep} stopOpacity={0} /></RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#g1)" />
      <Rect width="100%" height="100%" fill="url(#g2)" />
    </Svg>
  )
}

export const useTheme = () => useContext(ThemeContext)
