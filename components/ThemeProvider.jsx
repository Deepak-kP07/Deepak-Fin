'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

// Manages the `dark`/`light`/`glassy` class on <html> (see tailwind.config.js's `light:`/`glassy:`
// variants) and injects the no-flash blocking script itself — the actual choice is synced from/to
// profile.theme in app/page.js via next-themes' own useTheme() hook, not stored here.
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" themes={['dark', 'light', 'glassy']} enableSystem={false}>
      {children}
    </NextThemesProvider>
  )
}
