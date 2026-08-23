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
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-cyan-200/70">Encrypted at rest</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Vault</h1>
        </div>
        <button onClick={() => onAdd(tab)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c]"><Plus size={15} />Add</button>
      </div>

      <div className="flex gap-1.5 rounded-xl bg-black/20 p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === t.key ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
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
