'use client'

import { ChevronDown, ChevronUp, Landmark } from 'lucide-react'

export function SettingsAccounts({ data, onReorderAccount }) {
  const accounts = [...data.accounts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="text-sm font-semibold text-white">Accounts</div>
      <div className="text-xs text-slate-500">Reorder how accounts appear in every dropdown across the app.</div>
      <div className="mt-3 space-y-1.5">
        {accounts.length === 0 ? <div className="text-sm text-slate-500">No accounts yet</div> : accounts.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => onReorderAccount(a, accounts[i - 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
              <button disabled={i === accounts.length - 1} onClick={() => onReorderAccount(a, accounts[i + 1])} className="rounded p-0.5 text-slate-500 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
            </div>
            <Landmark size={14} className="text-slate-500" />
            <span className="text-sm text-white">{a.name}</span>
            <span className="text-xs capitalize text-slate-500">{a.type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
