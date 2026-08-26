// Content + navigation for the first-login spotlight tour (components/shared/SpotlightTour.jsx
// is the generic engine; this file is purely data). Each step's onEnter(context) drives the real
// app into the state its targetSelector needs to exist in before it's measured — context is
// { setView, openSettings, setMoreOpen, primaryMobileNavKeys } from app/page.js's Shell.

import {
  BarChart3, Briefcase, CreditCard, KeyRound, Landmark, LayoutDashboard,
  LayoutGrid, Settings as SettingsIcon, Smartphone, Sparkles, Tag, TrendingUp,
} from 'lucide-react'

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 1024
}

// Navigates to a top-level module and makes sure its nav button is actually reachable — opening
// the mobile "More" sheet only when that module isn't in the user's customizable primary strip.
function focusNav(ctx, key) {
  ctx.setView(key)
  ctx.setMoreOpen(isMobileViewport() && !ctx.primaryMobileNavKeys.includes(key))
}

function focusSettings(ctx, section) {
  ctx.setMoreOpen(false)
  ctx.openSettings(section)
}

export const TOUR_STEPS = [
  {
    key: 'welcome',
    icon: Sparkles,
    title: 'Quick tour',
    description: "Here's a fast walkthrough of what's here — skip anytime, or replay it later from Settings.",
    onEnter: (ctx) => focusNav(ctx, 'dashboard'),
  },
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: "A single view for your entire personal finance — net worth, this month's numbers, and quick links into everything else.",
    targetSelector: 'nav-dashboard',
    onEnter: (ctx) => focusNav(ctx, 'dashboard'),
  },
  {
    key: 'transactions',
    icon: BarChart3,
    title: 'Transactions',
    description: 'Where you track your daily expenses and log income — the full ledger.',
    targetSelector: 'nav-transactions',
    onEnter: (ctx) => focusNav(ctx, 'transactions'),
  },
  {
    key: 'accounts',
    icon: Landmark,
    title: 'Accounts',
    description: 'Your bank accounts, wallets, and cash — the sources every transaction draws from.',
    targetSelector: 'nav-accounts',
    onEnter: (ctx) => focusNav(ctx, 'accounts'),
  },
  {
    key: 'credit_cards',
    icon: CreditCard,
    title: 'Credit cards',
    description: 'Track card spends, utilisation, and pay bills without leaving the app.',
    targetSelector: 'nav-cards',
    onEnter: (ctx) => focusNav(ctx, 'cards'),
  },
  {
    key: 'investments',
    icon: TrendingUp,
    title: 'Investments',
    description: 'Portfolios, holdings, and SIPs — with live pricing, and real Kite sync if you connect your Zerodha account.',
    targetSelector: 'nav-investments',
    onEnter: (ctx) => focusNav(ctx, 'investments'),
  },
  {
    key: 'loans',
    icon: Briefcase,
    title: 'Loans',
    description: "Use this if you have any active loans — manage prepayments to close a loan faster, and see exactly how much interest you've saved.",
    targetSelector: 'nav-loans',
    onEnter: (ctx) => focusNav(ctx, 'loans'),
  },
  {
    key: 'settings',
    icon: SettingsIcon,
    title: 'Settings',
    description: 'Your space — profile, appearance, and a few things worth knowing about, next.',
    targetSelector: 'nav-profile',
    onEnter: (ctx) => focusNav(ctx, 'profile'),
  },
  {
    key: 'settings_categories',
    icon: Tag,
    title: 'Categories',
    description: 'Add, edit, and reorder the categories used across transactions, budgets, and every other module.',
    targetSelector: 'settings-categories',
    onEnter: (ctx) => focusSettings(ctx, 'categories'),
  },
  {
    key: 'settings_mobile_nav',
    icon: Smartphone,
    title: 'Mobile nav',
    description: "Drag and drop to choose exactly which destinations sit in your phone's bottom nav and net-worth quick actions.",
    targetSelector: 'settings-mobile_nav',
    onEnter: (ctx) => focusSettings(ctx, 'mobile_nav'),
  },
  {
    key: 'settings_vault',
    icon: KeyRound,
    title: 'Vault',
    description: 'A secure place to store sensitive bank, debit, and credit card details for your own reference.',
    targetSelector: 'settings-vault',
    onEnter: (ctx) => focusSettings(ctx, 'vault'),
  },
  {
    key: 'settings_modules',
    icon: LayoutGrid,
    title: 'More modules',
    description: "Turn on more modules as you need them: Family/Company, Lend/Borrow, Scholarships (useful if you're a student), Budgets, Bucket list, and Insights.",
    targetSelector: 'settings-modules',
    onEnter: (ctx) => focusSettings(ctx, 'modules'),
  },
  {
    key: 'closing',
    icon: Sparkles,
    title: "You're all set",
    description: 'Find this tour again anytime, along with a full written guide, right here.',
    targetSelector: 'settings-guide',
    onEnter: (ctx) => focusSettings(ctx, 'guide'),
  },
]
