'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

// Shared between the profile detail page and the entry form itself (behind a pencil-icon
// toggle there) so managing a profile's categories never requires leaving whichever screen
// you're on.
export function CategoryEditor({ profile, onUpdateCategories }) {
  const [draft, setDraft] = useState('')
  const categories = profile.categories || []
  const addCategory = () => {
    const name = draft.trim()
    if (!name || categories.includes(name)) return
    onUpdateCategories(profile, [...categories, name])
    setDraft('')
  }
  const removeCategory = (name) => onUpdateCategories(profile, categories.filter((c) => c !== name))
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="text-sm font-semibold text-white">Categories</div>
      <p className="mt-1 text-xs text-slate-500">Customize the categories entries in this profile can use.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.length === 0 && <span className="text-xs text-slate-500">No categories yet — add one below.</span>}
        {categories.map((c) => (
          <span key={c} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-slate-300">
            {c}
            <button type="button" onClick={() => removeCategory(c)} className="text-slate-500 hover:text-rose-300"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
          placeholder="Add a category…"
          className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
        />
        <button type="button" onClick={addCategory} disabled={!draft.trim()} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50">Add</button>
      </div>
    </div>
  )
}
