'use client'

import { KeyRound, LayoutDashboard, LayoutGrid, LogOut, Palette, ShieldAlert, Star, Tag, Landmark as LandmarkIcon, User } from 'lucide-react'
import { SettingsProfile } from './SettingsProfile'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsGuardrails } from './SettingsGuardrails'
import { SettingsModules } from './SettingsModules'
import { SettingsDashboard } from './SettingsDashboard'
import { SettingsCategories } from './SettingsCategories'
import { SettingsAccounts } from './SettingsAccounts'
import { SettingsVault } from './SettingsVault'
import { SettingsMoneyRules } from './SettingsMoneyRules'

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: User, Component: SettingsProfile },
  { key: 'appearance', label: 'Appearance', icon: Palette, Component: SettingsAppearance },
  { key: 'guardrails', label: 'Guardrails', icon: ShieldAlert, Component: SettingsGuardrails },
  { key: 'modules', label: 'Modules', icon: LayoutGrid, Component: SettingsModules },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: SettingsDashboard },
  { key: 'categories', label: 'Categories', icon: Tag, Component: SettingsCategories },
  { key: 'accounts', label: 'Accounts', icon: LandmarkIcon, Component: SettingsAccounts },
  { key: 'vault', label: 'Vault', icon: KeyRound, Component: SettingsVault },
  { key: 'money_rules', label: 'Money rules', icon: Star, Component: SettingsMoneyRules },
]

export function SettingsShell({ activeSection, onSectionChange, onLogout, ...rest }) {
  const active = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-cyan-200/70">Your space</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        </div>
        <button onClick={onLogout} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"><LogOut size={13} />Sign out</button>
      </div>

      <div className="flex gap-4 lg:items-start">
        <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 lg:w-48 lg:flex-col lg:overflow-visible lg:pb-0">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSectionChange(s.key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:w-full ${active.key === s.key ? 'bg-cyan-400/10 text-cyan-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <s.icon size={15} />{s.label}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <active.Component {...rest} />
        </div>
      </div>
    </div>
  )
}
