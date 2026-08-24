'use client'

import { useState } from 'react'
import { Link2, Plus, Upload, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { profileTotals, categoriesFor } from '@/lib/moneyProfiles'
import { downloadFamilyCompanyExport } from '@/lib/exportFamilyCompany'
import { money } from '@/lib/format'
import { MoneyProfileDetailView } from '@/features/familyCompany/MoneyProfileDetailView'

export function FamilyCompanyView({
  data, onAddProfile, onEditProfile, onDeleteProfile,
  onAddEntry, onEditEntry, onDeleteEntry, onBulkImport, onToggleStatus, onManageAccess,
}) {
  const { money_profiles: profiles = [], money_profile_entries: entries = [], accounts = [], categories = [] } = data
  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  if (selectedProfile) {
    return (
      <MoneyProfileDetailView
        profile={selectedProfile}
        entries={entries.filter((e) => e.profile_id === selectedProfile.id)}
        accounts={accounts}
        categories={categoriesFor(selectedProfile, categories)}
        onBack={() => setSelectedProfileId(null)}
        onEdit={onEditProfile}
        onDelete={(p) => { onDeleteProfile(p); setSelectedProfileId(null) }}
        onAddEntry={onAddEntry}
        onEditEntry={onEditEntry}
        onDeleteEntry={onDeleteEntry}
        onBulkImport={onBulkImport}
        onToggleStatus={onToggleStatus}
        onManageAccess={onManageAccess}
      />
    )
  }

  const totalBalance = profiles.reduce((s, p) => s + profileTotals(p, entries.filter((e) => e.profile_id === p.id)).balance, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70">Managed on their behalf</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Family / Company</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadFamilyCompanyExport({ profiles, entries, categories }, 'family-company', new Date().toISOString().slice(0, 10))}
            disabled={profiles.length === 0}
            title="Export every profile's entries as one CSV"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50 sm:flex-none"
          ><Upload size={14} />Export</button>
          <button onClick={onAddProfile} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] sm:flex-none"><Plus size={15} />New profile</button>
        </div>
      </div>

      {profiles.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Total held for others</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white">{money(totalBalance)}</div>
          <div className="mt-1 text-sm text-slate-500">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</div>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Users} title="No profiles yet" message="Create a profile for your family or a company you manage money for — link it to a bank account if you want its entries to reflect in your Transactions module too." cta="New profile" onCta={onAddProfile} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => {
            const pEntries = entries.filter((e) => e.profile_id === p.id)
            const { income, expense, balance } = profileTotals(p, pEntries)
            const isClosed = p.status === 'closed'
            return (
              <div key={p.id} onClick={() => setSelectedProfileId(p.id)} className={`cursor-pointer rounded-2xl border p-5 transition ${isClosed ? 'border-white/5 bg-white/[.02] hover:bg-white/[.035]' : 'border-white/10 bg-white/[.035] hover:border-accent-300/30 hover:bg-white/[.05]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isClosed ? 'bg-slate-500/15 text-slate-400' : 'bg-violet-400/15 text-violet-200'}`}>
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                      {p.linked_account_id && <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-200"><Link2 size={9} />Linked</span>}
                      {isClosed && <span className="shrink-0 rounded-full bg-slate-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-300">Closed</span>}
                    </div>
                    <div className="text-xs capitalize text-slate-500">{p.profile_type} · {pEntries.length > 0 ? `${pEntries.length} entr${pEntries.length === 1 ? 'y' : 'ies'}` : 'empty'}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Balance</div>
                    <div className={`text-xl font-semibold ${isClosed ? 'text-slate-300' : 'text-white'}`}>{money(balance)}</div>
                  </div>
                  <div className={`text-right ${isClosed ? 'text-slate-500' : 'text-emerald-300'}`}>
                    <div className="text-xs opacity-70">Income</div>
                    <div className="text-sm font-semibold">+{money(income)}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Expenses {money(expense)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
