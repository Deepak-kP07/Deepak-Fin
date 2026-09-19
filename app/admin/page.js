'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminLoginScreen } from '@/features/admin/AdminLoginScreen'
import { AdminDashboardView } from '@/features/admin/AdminDashboardView'

// Fully standalone from the main app's Shell/AuthScreen/user session — its own gate, its own
// cookie, checked here rather than via Supabase's `/api/auth/me`. See lib/server/adminAuth.js.
export default function AdminPage() {
  const [authed, setAuthed] = useState(undefined) // undefined = checking, else boolean

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me')
      setAuthed(res.ok)
    } catch {
      setAuthed(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setAuthed(false)
  }

  if (authed === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-[#080b12] text-sm text-slate-500">Loading…</div>
  }

  return authed ? <AdminDashboardView onLogout={handleLogout} /> : <AdminLoginScreen onSuccess={() => setAuthed(true)} />
}
