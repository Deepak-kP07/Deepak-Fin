import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

// Precache list is injected at build time by @serwist/next's webpack plugin — this exact
// string is the injection point it searches for, must appear once, untouched.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // defaultCache already network-firsts /api/* (including /api/finance/summary) with a 10s
  // timeout before falling back to cache, and precaches pages/JS/CSS/images — Phase 0 rides
  // on this as-is; Phase 2 layers the IndexedDB-first read path on top for a true offline UI.
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// Phase 3: a best-effort assist for flushing the offline write queue when the tab that queued
// something isn't in the foreground when connectivity returns. All the real flush logic (the
// Dexie outbox, the API calls, reconciling temp ids) lives in lib/offline/mutate.js in page
// context, where the app's data already is — this handler doesn't duplicate any of that, it
// just wakes up whatever tabs are open so they can run their own flush. If no tab is open there's
// nothing to wake; the flush resumes on its own next time the app opens (see Shell's mount effect).
self.addEventListener('sync', (event) => {
  if (event.tag !== 'outbox-flush') return
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'FLUSH_OUTBOX' }))
    })
  )
})

// Phase 4: display a push sent by POST /api/cron/notifications (title/body/url JSON payload —
// see that route for exactly what it sends and why).
self.addEventListener('push', (event) => {
  let payload = { title: 'Personal Finance', body: '' }
  try { payload = { ...payload, ...event.data.json() } } catch (e) { /* no/invalid payload — show the fallback above */ }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  )
})

// Focus an already-open tab on the relevant view if one exists, rather than always opening a
// fresh one — a user with the app already open shouldn't end up with two tabs from one tap.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) { existing.navigate(url); return existing.focus() }
      return self.clients.openWindow(url)
    })
  )
})
