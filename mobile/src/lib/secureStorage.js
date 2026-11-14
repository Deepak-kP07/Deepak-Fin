import * as SecureStore from 'expo-secure-store'

// Supabase keeps its session (access + refresh token) in a storage adapter. SecureStore is the
// encrypted store (Android Keystore), but some platforms reject values over ~2KB and a session can
// be larger, so values are split into chunks: `<key>` holds the chunk count, `<key>.0..n` the parts.
const CHUNK = 1800
const safeKey = (key) => key.replace(/[^A-Za-z0-9._-]/g, '_')

export const secureStorage = {
  async getItem(key) {
    const k = safeKey(key)
    const count = Number(await SecureStore.getItemAsync(k))
    if (!count) return null
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)))
    return parts.some((p) => p == null) ? null : parts.join('')
  },
  async setItem(key, value) {
    const k = safeKey(key)
    await this.removeItem(key)
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) || ['']
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)))
    await SecureStore.setItemAsync(k, String(parts.length))
  },
  async removeItem(key) {
    const k = safeKey(key)
    const count = Number(await SecureStore.getItemAsync(k))
    await Promise.all(Array.from({ length: count || 0 }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)))
    await SecureStore.deleteItemAsync(k)
  },
}
