'use client'

import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { DASHBOARD_SECTION_KEYS, DASHBOARD_STAT_KEYS, resolveDashboardWidgets } from '@/lib/moduleSettings'

const SECTION_INFO = {
  credit_card_alert: { label: 'Credit card bill alert', description: 'Banner warning when a card bill is due soon.' },
  quick_tiles: { label: 'Quick tiles', description: 'Portfolio, loans, and bucket list shortcuts.' },
  cashflow_chart: { label: 'Cash flow chart', description: 'Last 6 months of income vs expense.' },
  recent_transactions: { label: 'Recent transactions', description: "A scrolling ticker of this month's activity." },
  money_rules_widget: { label: 'Money rules', description: 'Your active rules, with a link to manage them.' },
  balances_panel: { label: 'Balances', description: 'Accounts, cards, and portfolios at a glance.' },
}

const STAT_INFO = {
  net_worth: { label: 'Net worth', description: 'Cash + investments − debt.' },
  income_month: { label: 'Income this month', description: '' },
  expense_month: { label: 'Expense this month', description: '' },
  savings_rate: { label: 'Savings rate', description: '% of income saved this month.' },
  net_cashflow: { label: 'Net cash flow', description: 'Income minus expense this month, as a plain amount.' },
  total_debt: { label: 'Total debt', description: 'Loans outstanding + credit card balances.' },
  total_invested: { label: 'Total invested', description: 'Current value across your portfolios.' },
  avg_monthly_spend: { label: 'Avg. monthly spend', description: 'Average expense over the last 6 months.' },
  transactions_count: { label: 'Transactions this month', description: 'How many you\'ve logged so far.' },
  top_category: { label: 'Top spending category', description: 'Your biggest expense category this month.' },
  credit_utilization: { label: 'Credit utilization', description: '% of your combined credit limit in use.' },
  budget_used_pct: { label: 'Budget used', description: "% of this month's budget spent so far." },
}

function ToggleList({ keys, info, resolved, onToggle }) {
  return (
    <div className="mt-3 space-y-2">
      {keys.map((key) => (
        <div key={key} className="flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
          <div className="flex-1">
            <div className="text-sm text-white light:text-slate-900">{info[key]?.label || key}</div>
            {info[key]?.description && <div className="mt-0.5 text-xs text-slate-500">{info[key].description}</div>}
          </div>
          <ToggleSwitch checked={resolved[key].enabled} onChange={() => onToggle(key)} />
        </div>
      ))}
    </div>
  )
}

export function SettingsDashboard({ data, onSaveProfile }) {
  const resolved = resolveDashboardWidgets(data.profile)
  const toggle = (key) => onSaveProfile({ dashboard_widgets: { ...resolved, [key]: { ...resolved[key], enabled: !resolved[key].enabled } } })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Stat cards</div>
        <div className="text-xs text-slate-500">Choose which numbers show in the top row. Position is fixed — only visibility is configurable.</div>
        <ToggleList keys={DASHBOARD_STAT_KEYS} info={STAT_INFO} resolved={resolved} onToggle={toggle} />
      </div>
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="text-sm font-semibold text-white light:text-slate-900">Sections</div>
        <div className="text-xs text-slate-500">Show or hide whole sections of the dashboard.</div>
        <ToggleList keys={DASHBOARD_SECTION_KEYS} info={SECTION_INFO} resolved={resolved} onToggle={toggle} />
      </div>
    </div>
  )
}
