// Moves cash between a real bank/cash account and a portfolio's un-invested cash_balance.
// Both directions record a real transaction (so the money movement shows up everywhere else
// in the app — Transactions list, exports, the source account's balance via the existing
// sync_account_balance trigger) tagged linked_module: 'investment' / linked_module_id: portfolioId.

export async function addPortfolioFunds(supabase, userId, portfolioId, { amount, account_id, date, time, notes }) {
  const amt = Number(amount)
  if (!(amt > 0) || !account_id) return { error: { message: 'amount and account_id required' } }
  const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', portfolioId).eq('user_id', userId).maybeSingle()
  if (!portfolio) return { error: { message: 'Portfolio not found', status: 404 } }
  const now = new Date()
  // The transactions insert and the cash_balance update happen inside one DB function
  // (drizzle/0040_portfolio_funds_atomic.sql) so they can't desync on a partial failure.
  const { data: cashBalance, error } = await supabase.rpc('add_portfolio_funds', {
    p_portfolio_id: portfolioId, p_account_id: account_id, p_amount: amt,
    p_date: date || now.toISOString().slice(0, 10), p_time: time || now.toTimeString().slice(0, 5), p_notes: notes || null,
  })
  if (error) return { error: { message: error.message } }
  return { cash_balance: cashBalance }
}

export async function withdrawPortfolioFunds(supabase, userId, portfolioId, { amount, account_id, date, time, notes }) {
  const amt = Number(amount)
  if (!(amt > 0) || !account_id) return { error: { message: 'amount and account_id required' } }
  const { data: portfolio } = await supabase.from('portfolios').select('*').eq('id', portfolioId).eq('user_id', userId).maybeSingle()
  if (!portfolio) return { error: { message: 'Portfolio not found', status: 404 } }
  // Withdrawing more than what's sitting in cash isn't a risk call like an account overspend —
  // it's simply impossible, so this is an unconditional hard block, no override. (The DB's own
  // portfolios_cash_balance_check backstops this too, inside the atomic RPC below, for the rare
  // race where cash_balance changes between this check and that call.)
  if (amt > Number(portfolio.cash_balance || 0)) {
    return { error: { message: `"${portfolio.name}" only has ${Number(portfolio.cash_balance || 0)} in cash — can't withdraw more than that.` } }
  }
  const now = new Date()
  // The transactions insert and the cash_balance update happen inside one DB function
  // (drizzle/0040_portfolio_funds_atomic.sql) so they can't desync on a partial failure.
  const { data: cashBalance, error } = await supabase.rpc('withdraw_portfolio_funds', {
    p_portfolio_id: portfolioId, p_account_id: account_id, p_amount: amt,
    p_date: date || now.toISOString().slice(0, 10), p_time: time || now.toTimeString().slice(0, 5), p_notes: notes || null,
  })
  if (error) return { error: { message: error.message } }
  return { cash_balance: cashBalance }
}
