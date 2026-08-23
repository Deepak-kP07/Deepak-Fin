'use client'

import { MoneyRulesView } from '@/features/money-rules/MoneyRulesView'

export function SettingsMoneyRules({ data, onAddRule, onToggleRule, onDeleteRule }) {
  return <MoneyRulesView data={data} onAdd={onAddRule} onToggle={onToggleRule} onEdit={() => {}} onDelete={onDeleteRule} />
}
