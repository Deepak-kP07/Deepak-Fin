'use client'

import { useEffect } from 'react'

// Catches an error in the root layout itself (rare, but the RootLayout/ThemeProvider crashing
// means globals.css and Tailwind may not be reliably in effect here) — this replaces <html>/
// <body> entirely, so it's kept deliberately plain and inline-styled rather than depending on
// Tailwind classes actually applying, matching the app's dark ground either way.
export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
        background: '#080b12', color: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, maxWidth: 360, fontSize: 14, lineHeight: 1.5, color: 'rgba(241,245,249,0.6)' }}>
            The app failed to load. Your data is safe — try reloading.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          style={{ borderRadius: 12, background: '#d4af37', color: '#07101c', fontWeight: 600, fontSize: 14, padding: '10px 20px', border: 'none', cursor: 'pointer' }}
        >
          Reload
        </button>
      </body>
    </html>
  )
}
