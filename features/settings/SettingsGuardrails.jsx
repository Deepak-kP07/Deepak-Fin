'use client'

import { ToggleSwitch } from '@/components/shared/ToggleSwitch'

export function SettingsGuardrails({ data, onSaveProfile }) {
  const { profile } = data
  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Spending guardrails</div>
      <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
        <div>
          <div className="text-sm text-white light:text-slate-900">Block transactions when an account is short</div>
          <div className="mt-0.5 text-xs text-slate-500">When a bank, cash, or debit card doesn't have enough balance: {profile?.block_insufficient_funds !== false ? 'blocked outright' : 'allowed with a "confirm anyway" prompt'}. Credit cards always block past their limit, regardless of this setting.</div>
        </div>
        <ToggleSwitch checked={profile?.block_insufficient_funds !== false} onChange={(v) => onSaveProfile({ block_insufficient_funds: v })} />
      </div>
    </div>
  )
}
