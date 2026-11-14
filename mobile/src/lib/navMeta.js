import {
  ArrowLeftRight, Briefcase, Coins, CreditCard, Heart, Landmark, LayoutDashboard, LineChart, Mountain,
  Plus, ShieldCheck, Target, TrendingUp, Users,
} from 'lucide-react-native'

// Same entries, labels and icons as the web's lib/navMeta.js (lucide-react → lucide-react-native).
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
  chit_funds: { key: 'chitfunds', label: 'Chit funds', icon: Coins },
}
export const VIEW_TO_MODULE = Object.fromEntries(Object.entries(NAV_META).map(([moduleKey, meta]) => [meta.key, moduleKey]))
export const MOBILE_MANDATORY_META = {
  dashboard: { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  transactions: { key: 'transactions', label: 'Trans', icon: ArrowLeftRight },
  accounts: { key: 'accounts', label: 'Accounts', icon: Landmark },
}
export const ADD_ACTION_META = { key: 'add', label: 'Add', icon: Plus }
