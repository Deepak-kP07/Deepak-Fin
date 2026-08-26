'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { MODULE_KEYS, resolveModuleSettings } from '@/lib/moduleSettings'

const MODULE_INFO = {
  credit_cards: { label: 'Credit cards', description: 'Track cards, spends, and bill payments.' },
  investments: { label: 'Investments', description: 'Portfolios, holdings, SIPs, and other assets.' },
  loans: { label: 'Loans', description: 'EMIs, prepayments, and amortization.' },
  family_company: { label: 'Family / Company', description: 'Income, capital, and expenses for a family or company profile.' },
  lend_borrow: { label: 'Lend / Borrow', description: "Money you've lent or borrowed with people." },
  scholarships: { label: 'Scholarships', description: 'Scholarship batches received and payments made to college.' },
  budgets: { label: 'Budgets', description: 'Monthly plans, category breakdowns, and yearly budgets.' },
  bucket_list: { label: 'Bucket list', description: "The 30-day rule for things you're tempted to buy." },
  insights: { label: 'Insights', description: 'Charts and trends across your finances.' },
}

export function SettingsModules({ data, onSaveProfile }) {
  const resolved = resolveModuleSettings(data.profile)
  const orderedKeys = [...MODULE_KEYS].sort((a, b) => resolved[a].order - resolved[b].order)
  const save = (next) => onSaveProfile({ module_settings: next })
  const toggle = (key) => save({ ...resolved, [key]: { ...resolved[key], enabled: !resolved[key].enabled } })
  const move = (key, direction) => {
    const idx = orderedKeys.indexOf(key)
    const swapWith = orderedKeys[idx + direction]
    if (!swapWith) return
    const next = { ...resolved }
    next[key] = { ...resolved[key], order: resolved[swapWith].order }
    next[swapWith] = { ...resolved[swapWith], order: resolved[key].order }
    save(next)
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Modules</div>
      <div className="text-xs text-slate-500">Turn modules on or off, and reorder them in the sidebar. Dashboard, Transactions, and Accounts are always on and always come first.</div>
      <div className="mt-3 space-y-2">
        {orderedKeys.map((key, i) => (
          <div key={key} className="flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
            <div className="flex shrink-0 flex-col">
              <button disabled={i === 0} onClick={() => move(key, -1)} className="rounded p-0.5 text-slate-500 hover:text-white hover:light:text-slate-900 disabled:opacity-20"><ChevronUp size={14} /></button>
              <button disabled={i === orderedKeys.length - 1} onClick={() => move(key, 1)} className="rounded p-0.5 text-slate-500 hover:text-white hover:light:text-slate-900 disabled:opacity-20"><ChevronDown size={14} /></button>
            </div>
            <div className="flex-1">
              <div className="text-sm text-white light:text-slate-900">{MODULE_INFO[key]?.label || key}</div>
              <div className="mt-0.5 text-xs text-slate-500">{MODULE_INFO[key]?.description}</div>
            </div>
            <ToggleSwitch checked={resolved[key].enabled} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
    </div>
  )
}
