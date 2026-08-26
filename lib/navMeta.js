// Single source of truth for the icon/label of every destination that can appear in the app's
// navigation (desktop sidebar, mobile bottom nav, mobile "More" sheet, Settings > Mobile nav).
// Keeping this out of app/page.js lets Settings > Mobile nav reuse the exact same metadata
// instead of re-declaring its own icon map.

import {
  BarChart3, Briefcase, CreditCard, Heart, Landmark, LayoutDashboard, LineChart, Mountain,
  Plus, ShieldCheck, Target, TrendingUp, Users,
} from 'lucide-react'

// Maps a module_settings key to its nav entry — money_rules is intentionally absent here since
// it now lives entirely inside Settings, not as a top-level view.
export const NAV_META = {
  credit_cards: { key: 'cards', label: 'Credit cards', icon: CreditCard },
  investments: { key: 'investments', label: 'Investments', icon: TrendingUp },
  loans: { key: 'loans', label: 'Loans', icon: Briefcase },
  family_company: { key: 'family_company', label: 'Family / Company', icon: Users },
  lend_borrow: { key: 'lend', label: 'Lend / Borrow', icon: Heart },
  scholarships: { key: 'scholarships', label: 'Scholarships', icon: ShieldCheck },
  budgets: { key: 'budgets', label: 'Budgets', icon: Target },
  bucket_list: { key: 'bucket', label: 'Bucket list', icon: Mountain },
  insights: { key: 'insights', label: 'Insights', icon: LineChart },
}

export const VIEW_TO_MODULE = Object.fromEntries(Object.entries(NAV_META).map(([moduleKey, meta]) => [meta.key, moduleKey]))

// The 3 mandatory destinations, always available regardless of module_settings — same views the
// desktop sidebar pins first, but with the shorter labels the mobile nav has always used.
export const MOBILE_MANDATORY_META = {
  dashboard: { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  transactions: { key: 'transactions', label: 'Ledger', icon: BarChart3 },
  accounts: { key: 'accounts', label: 'Accounts', icon: Landmark },
}

// Not a real view — opens the quick-add transaction form instead of navigating. Only valid as a
// net-worth quick-action slot, never a bottom-nav slot (see app/page.js's quickActionDestinations).
export const ADD_ACTION_META = { key: 'add', label: 'Add', icon: Plus }
