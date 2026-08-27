'use client'

import { useState } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { VaultCardFlip } from '@/features/vault/VaultCardFlip'

const TABS = [
  { key: 'bank_account', label: 'Bank accounts' },
  { key: 'debit_card', label: 'Debit cards' },
  { key: 'credit_card', label: 'Credit cards' },
]

export function VaultView({ data, onAdd, onEdit, onDelete }) {
  const { vault_items = [] } = data
  const [tab, setTab] = useState('bank_account')
  const rows = vault_items.filter((i) => i.item_type === tab)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Encrypted at rest</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Vault</h1>
        </div>
        <button onClick={() => onAdd(tab)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add</button>
      </div>

      <div className="flex gap-1.5 rounded-xl bg-black/20 light:bg-black/[.06] p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === t.key ? 'bg-accent-400/15 text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900'}`}>{t.label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={KeyRound} title="Nothing here yet" message="Store this account or card's details securely — nothing is shown until you tap to reveal it." cta="Add to vault" onCta={() => onAdd(tab)} />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => (
            <VaultCardFlip key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
