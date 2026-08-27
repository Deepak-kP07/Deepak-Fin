'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Next.js route-level error boundary — catches a render/runtime error anywhere in this page
// and swaps it for a recoverable screen instead of a blank/broken one. Rendered inside the
// root layout, so ThemeProvider/globals.css are already in effect here.
export default function Error({ error, reset }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080b12] light:bg-[#eef1f6] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-300/5 text-rose-200 light:text-rose-700">
        <AlertTriangle size={24} />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-white light:text-slate-900">Something went wrong</h1>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">An unexpected error interrupted this page. Your data is safe — try again, or reload if it keeps happening.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c]"
        >
          <RefreshCw size={14} />Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-medium text-slate-300 light:text-slate-700 hover:bg-white/5"
        >
          Reload page
        </button>
      </div>
    </div>
  )
}
