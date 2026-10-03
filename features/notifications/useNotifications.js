'use client'

import { useCallback, useEffect, useState } from 'react'

const POLL_MS = 2 * 60 * 1000

// One shared source for every bell on screen (sidebar on desktop, header row on mobile) — call
// once in the app shell and pass the result down, so multiple bells don't each poll.
export function useNotifications() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items || [])
      setUnread(data.unread || 0)
      setLoaded(true)
    } catch { /* offline — keep what we have */ }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const post = (body) => fetch('/api/finance/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})

  // Optimistic: the dot and badge clear immediately; the server catches up in the background.
  const markRead = useCallback((id) => {
    const target = items.find((n) => n.id === id)
    if (!target || target.read_at) return
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    setUnread((u) => Math.max(0, u - 1))
    post({ ids: [id] })
  }, [items])
  const markAllRead = useCallback(() => {
    setItems((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })))
    setUnread(0)
    post({ all: true })
  }, [])

  return { items, unread, loaded, reload: load, markRead, markAllRead }
}
