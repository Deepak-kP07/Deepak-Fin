'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Manages the `dark`/`light` class on <html> (see tailwind.config.js's `light:` variant) and
// injects the no-flash blocking script itself — the actual choice is synced from/to
// profile.theme in app/page.js via next-themes' own useTheme() hook, not stored here.
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" themes={['dark', 'light']} enableSystem={false}>
      {children}
    </NextThemesProvider>
  )
}
