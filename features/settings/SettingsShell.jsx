'use client'

import { useState } from 'react'
import { BookOpen, Bell, KeyRound, LayoutDashboard, LayoutGrid, Link2, LogOut, Menu, Palette, ShieldAlert, Smartphone, Star, Tag, Landmark as LandmarkIcon, User } from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { SettingsProfile } from './SettingsProfile'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsGuardrails } from './SettingsGuardrails'
import { SettingsNotifications } from './SettingsNotifications'
import { SettingsModules } from './SettingsModules'
import { SettingsMobileNav } from './SettingsMobileNav'
import { SettingsDashboard } from './SettingsDashboard'
import { SettingsCategories } from './SettingsCategories'
import { SettingsAccounts } from './SettingsAccounts'
import { SettingsVault } from './SettingsVault'
import { SettingsMoneyRules } from './SettingsMoneyRules'
import { SettingsKite } from './SettingsKite'
import { SettingsUserGuide } from './SettingsUserGuide'

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: User, Component: SettingsProfile },
  { key: 'appearance', label: 'Appearance', icon: Palette, Component: SettingsAppearance },
  { key: 'guardrails', label: 'Guardrails', icon: ShieldAlert, Component: SettingsGuardrails },
  { key: 'notifications', label: 'Notifications', icon: Bell, Component: SettingsNotifications },
  { key: 'modules', label: 'Modules', icon: LayoutGrid, Component: SettingsModules },
  { key: 'mobile_nav', label: 'Mobile nav', icon: Smartphone, Component: SettingsMobileNav },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, Component: SettingsDashboard },
  { key: 'categories', label: 'Categories', icon: Tag, Component: SettingsCategories },
  { key: 'accounts', label: 'Accounts', icon: LandmarkIcon, Component: SettingsAccounts },
  { key: 'vault', label: 'Vault', icon: KeyRound, Component: SettingsVault },
  { key: 'money_rules', label: 'Money rules', icon: Star, Component: SettingsMoneyRules },
  { key: 'kite', label: 'Kite Connect', icon: Link2, Component: SettingsKite },
  { key: 'guide', label: 'User guide', icon: BookOpen, Component: SettingsUserGuide },
]

export function SettingsShell({ activeSection, onSectionChange, onLogout, ...rest }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const active = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Your space</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white light:text-slate-900">Settings</h1>
        </div>
        <button onClick={onLogout} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-3 py-2 text-xs text-slate-400 light:text-slate-500 hover:bg-white/5"><LogOut size={13} />Sign out</button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Mobile: too many sections for a scrolling tab strip to stay usable, so the current
            section opens a full picker sheet instead — scoped to Settings only, not the app's
            main mobile nav (that keeps its own separate "More" sheet). */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3.5 py-3 text-sm font-medium text-white light:text-slate-900 lg:hidden"
        >
          <active.icon size={16} className="text-accent-300 light:text-accent-700" />
          <span className="flex-1 text-left">{active.label}</span>
          <Menu size={16} className="text-slate-400 light:text-slate-500" />
        </button>

        <div className="hidden w-48 shrink-0 flex-col gap-1.5 lg:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => onSectionChange(s.key)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active.key === s.key ? 'bg-accent-400/10 text-accent-200 light:text-accent-700' : 'text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900'}`}
            >
              <s.icon size={15} />{s.label}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <active.Component {...rest} />
        </div>
      </div>

      <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title="Settings">
        <div className="grid grid-cols-3 gap-3 pb-4">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => { onSectionChange(s.key); setMenuOpen(false) }}
              className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center text-xs font-medium transition ${active.key === s.key ? 'bg-accent-400/10 text-accent-200 light:text-accent-700' : 'bg-white/[.04] light:bg-black/[.03] text-slate-300 light:text-slate-700 hover:bg-white/[.07] light:hover:bg-black/[.05]'}`}
            >
              <s.icon size={20} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
