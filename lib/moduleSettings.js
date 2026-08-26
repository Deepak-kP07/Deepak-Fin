// Single source of truth for which optional modules/dashboard pieces exist, their default
// enabled/order state, and how to merge a profile's stored JSONB over those defaults. Keeping
// the defaults here (rather than scattered inline fallbacks) means every consumer — nav,
// dashboard, Settings — agrees on the same shape even before a profile has ever saved anything.

// money_rules and vault are intentionally absent — neither has a top-level nav entry (both live
// permanently inside Settings) or a gate of its own, so they aren't toggleable "modules" the way
// the rest of these are. Money Rules' dashboard widget has its own independent on/off switch
// instead (see below); Vault has no dashboard presence at all.
export const MODULE_KEYS = [
  'credit_cards', 'investments', 'loans', 'family_company', 'lend_borrow',
  'scholarships', 'budgets', 'bucket_list', 'insights',
]

export const DEFAULT_MODULE_SETTINGS = {
  credit_cards: { enabled: true, order: 1 },
  investments: { enabled: true, order: 2 },
  loans: { enabled: true, order: 3 },
  family_company: { enabled: false, order: 4 },
  lend_borrow: { enabled: false, order: 5 },
  scholarships: { enabled: false, order: 6 },
  budgets: { enabled: false, order: 7 },
  bucket_list: { enabled: false, order: 8 },
  insights: { enabled: false, order: 9 },
}

export function resolveModuleSettings(profile) {
  const stored = profile?.module_settings || {}
  return MODULE_KEYS.reduce((acc, key) => {
    acc[key] = { ...DEFAULT_MODULE_SETTINGS[key], ...(stored[key] || {}) }
    return acc
  }, {})
}

// Returns just the enabled keys from a resolved module-settings object, sorted by their `order`.
export function orderedEnabledKeys(resolved) {
  return Object.entries(resolved)
    .filter(([, v]) => v.enabled)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key]) => key)
}

// Which destination sits in each of the mobile bottom nav's 3 primary slots, and which sits in
// each of the net-worth card's 3 quick-action slots — see Settings > Mobile nav
// (features/settings/SettingsMobileNav.jsx) and app/page.js's primaryMobileNav/quickActionItems.
// Both groups share the one `mobile_nav_settings` column (`{ slots, quick_actions }`) since
// they're two facets of the same "what shows up where on mobile" concern. `validKeys` is the
// caller's current full list of allowed destination keys for that group; a slot whose stored key
// isn't in that list (its module got disabled, or — for quick actions — 'add' isn't valid outside
// that group) falls back to its positional default rather than showing a dead icon.
export const DEFAULT_MOBILE_NAV_SLOTS = ['dashboard', 'transactions', 'accounts']
export const DEFAULT_QUICK_ACTION_SLOTS = ['add', 'transactions', 'accounts']

function resolveSlotGroup(candidate, defaults, validKeys) {
  const source = Array.isArray(candidate) && candidate.length === defaults.length ? candidate : defaults
  const seen = new Set()
  return source.map((key, i) => {
    const ok = validKeys.includes(key) && !seen.has(key)
    const resolved = ok ? key : defaults[i]
    seen.add(resolved)
    return resolved
  })
}

export function resolveMobileNavSlots(profile, validKeys) {
  return resolveSlotGroup(profile?.mobile_nav_settings?.slots, DEFAULT_MOBILE_NAV_SLOTS, validKeys)
}

export function resolveQuickActionSlots(profile, validKeys) {
  return resolveSlotGroup(profile?.mobile_nav_settings?.quick_actions, DEFAULT_QUICK_ACTION_SLOTS, validKeys)
}

// Dashboard layout is fixed-position (a two-column chart/balances grid, not a freely reorderable
// list) — each piece is just a plain on/off switch, no `order`.
export const DASHBOARD_SECTION_KEYS = [
  'credit_card_alert', 'quick_tiles', 'cashflow_chart', 'recent_transactions', 'money_rules_widget', 'balances_panel',
]
const DEFAULT_DASHBOARD_SECTIONS = {
  credit_card_alert: { enabled: true },
  quick_tiles: { enabled: true },
  cashflow_chart: { enabled: true },
  recent_transactions: { enabled: true },
  money_rules_widget: { enabled: true },
  balances_panel: { enabled: true },
}

// The stat-card catalog shown in the dashboard's top row — the original four stay on by default;
// everything added since starts off so the default view doesn't suddenly get more crowded.
export const DASHBOARD_STAT_KEYS = [
  'net_worth', 'income_month', 'expense_month', 'savings_rate',
  'net_cashflow', 'total_debt', 'total_invested', 'avg_monthly_spend',
  'transactions_count', 'top_category', 'credit_utilization', 'budget_used_pct',
]
const DEFAULT_DASHBOARD_STATS = {
  net_worth: { enabled: true },
  income_month: { enabled: true },
  expense_month: { enabled: true },
  savings_rate: { enabled: true },
  net_cashflow: { enabled: false },
  total_debt: { enabled: false },
  total_invested: { enabled: false },
  avg_monthly_spend: { enabled: false },
  transactions_count: { enabled: false },
  top_category: { enabled: false },
  credit_utilization: { enabled: false },
  budget_used_pct: { enabled: false },
}

const DEFAULT_DASHBOARD_WIDGETS = { ...DEFAULT_DASHBOARD_SECTIONS, ...DEFAULT_DASHBOARD_STATS }

export function resolveDashboardWidgets(profile) {
  const stored = profile?.dashboard_widgets || {}
  return Object.keys(DEFAULT_DASHBOARD_WIDGETS).reduce((acc, key) => {
    acc[key] = { ...DEFAULT_DASHBOARD_WIDGETS[key], ...(stored[key] || {}) }
    return acc
  }, {})
}
