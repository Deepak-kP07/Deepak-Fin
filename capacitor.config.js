// .json can't read env vars, so this is .js instead — reuses NEXT_PUBLIC_BASE_URL, the same
// single source of truth every other absolute-URL builder in this app already uses (lib/email.js,
// the Kite OAuth redirect in features/settings/SettingsKite.jsx, etc.), instead of hardcoding a
// second copy of the production URL that could drift out of sync with it.
require('dotenv').config()

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.personalfin.app',
  appName: 'Personal Fin',
  webDir: 'public',
  server: {
    url: process.env.NEXT_PUBLIC_BASE_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

module.exports = config
