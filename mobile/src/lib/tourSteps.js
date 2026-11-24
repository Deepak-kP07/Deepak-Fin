import { BarChart3, Briefcase, CreditCard, KeyRound, Landmark, LayoutDashboard, LayoutGrid, Settings, Smartphone, Sparkles, Tag, TrendingUp } from 'lucide-react-native'

// Native copy of features/onboarding/tourSteps.js (that file imports the web icon set, so it can't
// be shared). Same steps and wording; `target` names what the Shell spotlights:
// 'nav:<key>' = that module's bottom-nav item — or, when it lives in the More sheet, the sheet is
// opened and its tile is spotlit (same as the PWA's focusNav); 'settings' = the Settings section
// picker. context = { setView, openSettings }.
const nav = (key) => (ctx) => ctx.setView(key)
const settings = (section) => (ctx) => ctx.openSettings(section)

export const TOUR_STEPS = [
  { key: 'welcome', icon: Sparkles, title: 'Quick tour', description: "Here's a fast walkthrough of what's here — skip anytime, or replay it later from Settings.", onEnter: nav('dashboard') },
  { key: 'dashboard', icon: LayoutDashboard, title: 'Dashboard', description: "A single view for your entire personal finance — net worth, this month's numbers, and quick links into everything else.", target: 'nav:dashboard', onEnter: nav('dashboard') },
  { key: 'transactions', icon: BarChart3, title: 'Transactions', description: 'Where you track your daily expenses and log income — the full ledger.', target: 'nav:transactions', onEnter: nav('transactions') },
  { key: 'accounts', icon: Landmark, title: 'Accounts', description: 'Your bank accounts, wallets, and cash — the sources every transaction draws from.', target: 'nav:accounts', onEnter: nav('accounts') },
  { key: 'credit_cards', icon: CreditCard, title: 'Credit cards', description: 'Track card spends, utilisation, and pay bills without leaving the app.', target: 'nav:cards', onEnter: nav('cards') },
  { key: 'investments', icon: TrendingUp, title: 'Investments', description: 'Portfolios, holdings, and SIPs — with live pricing, and real Kite sync if you connect your Zerodha account.', target: 'nav:investments', onEnter: nav('investments') },
  { key: 'loans', icon: Briefcase, title: 'Loans', description: "Use this if you have any active loans — manage prepayments to close a loan faster, and see exactly how much interest you've saved.", target: 'nav:loans', onEnter: nav('loans') },
  { key: 'settings', icon: Settings, title: 'Settings', description: 'Your space — profile, appearance, and a few things worth knowing about, next.', target: 'nav:profile', onEnter: nav('profile') },
  { key: 'settings_categories', icon: Tag, title: 'Categories', description: 'Add, edit, and reorder the categories used across transactions, budgets, and every other module.', target: 'settings', onEnter: settings('categories') },
  { key: 'settings_mobile_nav', icon: Smartphone, title: 'Mobile nav', description: "Choose exactly which destinations sit in your phone's bottom nav and net-worth quick actions.", target: 'settings', onEnter: settings('mobile_nav') },
  { key: 'settings_vault', icon: KeyRound, title: 'Vault', description: 'A secure place to store sensitive bank, debit, and credit card details for your own reference.', target: 'settings', onEnter: settings('vault') },
  { key: 'settings_modules', icon: LayoutGrid, title: 'More modules', description: "Turn on more modules as you need them: Family/Company, Lend/Borrow, Scholarships (useful if you're a student), Budgets, Bucket list, and Insights.", target: 'settings', onEnter: settings('modules') },
  { key: 'closing', icon: Sparkles, title: "You're all set", description: 'Find this tour again anytime, along with a full written guide, right here.', target: 'settings', onEnter: settings('guide') },
]
