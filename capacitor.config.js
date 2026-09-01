// .json can't read env vars, so this is .js instead — reuses NEXT_PUBLIC_BASE_URL, the same
// single source of truth every other absolute-URL builder in this app already uses (lib/email.js,
// the Kite OAuth redirect in features/settings/SettingsKite.jsx, etc.), instead of hardcoding a
// second copy of the production URL that could drift out of sync with it.
require('dotenv').config()

// personalfin.site 308-redirects to www.personalfin.site (Vercel's configured canonical domain
// — confirmed via `curl -I https://personalfin.site`). NEXT_PUBLIC_BASE_URL is deliberately kept
// as the bare domain everywhere else (it's what's registered with Kite Connect, used in
// transactional emails, etc.), so the `www.` is added here rather than changing that shared env
// var. This isn't cosmetic: Capacitor's WebView treats a top-level navigation landing on a
// different origin than `server.url` as leaving the app, and hands it to the system browser
// instead of following it internally — that redirect is what turned "open the app" into
// "open Chrome" on every single cold launch, before any UI ever rendered.
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://personalfin.site'
const serverUrl = baseUrl.includes('://www.') ? baseUrl : baseUrl.replace('://', '://www.')

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.personalfin.app',
  appName: 'Personal Fin',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

module.exports = config
