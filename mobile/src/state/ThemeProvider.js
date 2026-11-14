import { createContext, useContext, useMemo } from 'react'
import { View } from 'react-native'
import { useData } from './DataProvider'
import { accentColor, accentVars, DEFAULT_ACCENT } from '../lib/accent'
import { setTwTheme } from '../lib/tw'

// Dark / Light / Glass + accent colour, read from the same profile fields the web app saves
// (profiles.theme, profiles.accent_color). The tree is keyed by theme so every tw() call re-resolves.
const ThemeContext = createContext({ theme: 'dark', accent: DEFAULT_ACCENT })
const BG = { dark: '#080b12', light: '#eef1f6', glass: '#080b12' }

export function ThemeProvider({ children }) {
  const { data } = useData()
  const theme = ['dark', 'light', 'glass'].includes(data.profile?.theme) ? data.profile.theme : 'dark'
  const accent = data.profile?.accent_color || DEFAULT_ACCENT
  setTwTheme(theme)
  const value = useMemo(() => ({ theme, accent, bg: BG[theme], accentColor: (step, alpha) => accentColor(accent, step, alpha) }), [theme, accent])
  const style = useMemo(() => [{ flex: 1, backgroundColor: BG[theme] }, accentVars(accent)], [theme, accent])
  return (
    <ThemeContext.Provider value={value}>
      <View key={theme} style={style}>{children}</View>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
