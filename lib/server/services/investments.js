// Moves cash between a real bank/cash account and a portfolio's un-invested cash_balance.
// Both directions record a real transaction (so the money movement shows up everywhere else
// in the app — Transactions list, exports, the source account's balance via the existing
// sync_account_balance trigger) tagged linked_module: 'investment' / linked_module_id: portfolioId.

export async function addPortfolioFunds(supabase, userId, portfolioId, { amount, account_id, date, time, notes }) {
  const amt = Number(amount)
  if (!(amt > 0) || !account_id) return { error: { message: 'amount and account_id required' } }
  const { data: portfolio } = await supabase.from('portfolios').select('*').eq('id', portfolioId).eq('user_id', userId).maybeSingle()
  if (!portfolio) return { error: { message: 'Portfolio not found', status: 404 } }
  const now = new Date()
  const txPayload = {
    user_id: userId, account_id, amount: amt, type: 'expense', description: `Funded ${portfolio.name}`,
    date: date || now.toISOString().slice(0, 10), time: time || now.toTimeString().slice(0, 5),
    linked_module: 'investment', linked_module_id: portfolioId, notes: notes || null,
  }
  await supabase.from('transactions').insert(txPayload)
  const newCash = Number(portfolio.cash_balance || 0) + amt
  await supabase.from('portfolios').update({ cash_balance: newCash }).eq('id', portfolioId).eq('user_id', userId)
  return { cash_balance: newCash }
}

export async function withdrawPortfolioFunds(supabase, userId, portfolioId, { amount, account_id, date, time, notes }) {
  const amt = Number(amount)
  if (!(amt > 0) || !account_id) return { error: { message: 'amount and account_id required' } }
  const { data: portfolio } = await supabase.from('portfolios').select('*').eq('id', portfolioId).eq('user_id', userId).maybeSingle()
  if (!portfolio) return { error: { message: 'Portfolio not found', status: 404 } }
  // Withdrawing more than what's sitting in cash isn't a risk call like an account overspend —
  // it's simply impossible, so this is an unconditional hard block, no override.
  if (amt > Number(portfolio.cash_balance || 0)) {
    return { error: { message: `"${portfolio.name}" only has ${Number(portfolio.cash_balance || 0)} in cash — can't withdraw more than that.` } }
  }
  const now = new Date()
  const txPayload = {
    user_id: userId, account_id, amount: amt, type: 'income', description: `Withdrawn from ${portfolio.name}`,
    date: date || now.toISOString().slice(0, 10), time: time || now.toTimeString().slice(0, 5),
    linked_module: 'investment', linked_module_id: portfolioId, notes: notes || null,
  }
  await supabase.from('transactions').insert(txPayload)
  const newCash = Number(portfolio.cash_balance || 0) - amt
  await supabase.from('portfolios').update({ cash_balance: newCash }).eq('id', portfolioId).eq('user_id', userId)
  return { cash_balance: newCash }
}
