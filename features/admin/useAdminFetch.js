'use client'

import { useEffect, useState } from 'react'

// Shared by every /admin tab's read-only data call — a 401 means the session cookie expired
// (12h TTL) or was never valid, so it kicks back to the login screen instead of leaving the tab
// stuck showing a dead error state.
export function useAdminFetch(url, onAuthExpired) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then(async (res) => {
        if (res.status === 401) { onAuthExpired?.(); throw new Error('Session expired — signing you out') }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        return res.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [url])

  return { data, error }
}
