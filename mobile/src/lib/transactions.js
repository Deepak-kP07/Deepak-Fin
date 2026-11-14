// Same rules as the web app's lib/hiddenTransactions.js: hidden transactions (and both legs of a
// hidden transfer) never appear in a list by name. Totals still use the full array.
export function hiddenTransferGroups(transactions) {
  return new Set((transactions || []).filter((t) => t.is_hidden && t.transfer_group_id).map((t) => t.transfer_group_id))
}

export function listableTransactions(transactions) {
  const groups = hiddenTransferGroups(transactions)
  return (transactions || []).filter((t) => !t.is_hidden && !(t.transfer_group_id && groups.has(t.transfer_group_id)))
}

// A transfer is stored as two rows (out + in) sharing transfer_group_id — lists show it once, from
// the "out" side, with the receiving account attached as `_to_account_id`.
export function dedupeTransfers(transactions) {
  const inLegs = new Map(transactions.filter((t) => t.type === 'transfer' && t.transfer_direction === 'in').map((t) => [t.transfer_group_id, t]))
  return transactions
    .filter((t) => !(t.type === 'transfer' && t.transfer_direction === 'in'))
    .map((t) => (t.type === 'transfer' ? { ...t, _to_account_id: inLegs.get(t.transfer_group_id)?.account_id || null } : t))
}

export function sortNewestFirst(transactions) {
  return [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.time || '').localeCompare(String(a.time || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')))
}

export function monthTotals(transactions, ym) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (!t.date?.startsWith(ym)) continue
    if (t.type === 'income') income += Number(t.amount || 0)
    else if (t.type === 'expense') expense += Number(t.amount || 0)
  }
  return { income, expense, net: income - expense }
}

// The account (or card) a transaction is against, as a display name.
export function sourceName(t, accounts, creditCards) {
  if (t.linked_module === 'credit_card' && t.linked_module_id) return creditCards.find((c) => c.id === t.linked_module_id)?.name || 'Credit card'
  return accounts.find((a) => a.id === t.account_id)?.name || ''
}

// Created by another module (lend/borrow, loans, cards, chit funds…) — the amount/type/account
// are owned by that module, so the mobile form only lets the description, category and notes change.
export const isModuleLinked = (t) => !!t.linked_module && t.linked_module !== 'credit_card'
