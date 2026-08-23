// A month's overall total and its category-line breakdown are saved together as one unit —
// mirrors the "bespoke multi-step action" shape already used for portfolio funding
// (lib/server/services/investments.js) rather than routing through the generic per-table CRUD,
// since a single save touches two tables atomically from the caller's point of view.

export async function saveBudgetMonth(supabase, userId, { year, month, total_amount, categories }) {
  if (year === undefined || year === null || month === undefined || month === null) {
    return { error: { message: 'year and month required' } }
  }
  const totalAmt = Number(total_amount || 0)
  const lines = Array.isArray(categories) ? categories.filter((c) => c.category_id && Number(c.amount) >= 0) : []
  const allocated = lines.reduce((s, c) => s + Number(c.amount), 0)
  // Mirrors the client-side check in BudgetMonthForm — enforced here too so a direct API call
  // can't bypass it. Categories are a breakdown of the overall total, never more than it.
  if (allocated > totalAmt) return { error: { message: `Categories add up to ${allocated} but the overall budget is only ${totalAmt} — raise the total or trim a category.` } }

  const { data: existing } = await supabase.from('budget_months').select('id, status').eq('user_id', userId).eq('year', year).eq('month', month).maybeSingle()
  if (existing?.status === 'closed') return { error: { message: 'This month is closed — reopen it before making changes.' } }

  // A single atomic upsert instead of a separate exists-check + insert/update — the previous
  // shape had a real race: two concurrent saves for the same brand-new month (a flaky
  // double-click, a retried request) could both see "doesn't exist yet" and both attempt an
  // insert, with the loser hitting a raw unique-constraint error instead of a clean update.
  // Only total_amount is written on conflict — status/closed_at are never touched here, so a
  // concurrent close() can't be silently clobbered by a save that started just before it.
  const { data: plan, error: upsertError } = await supabase
    .from('budget_months')
    .upsert({ user_id: userId, year, month, total_amount: totalAmt }, { onConflict: 'user_id,year,month' })
    .select()
    .single()
  if (upsertError) return { error: upsertError }
  const planId = plan.id

  // Replace the whole category-line set on every save — same "replace the array" semantics
  // Family/Company uses for its categories text[], just realized as child rows instead of a
  // column. Done as upsert-then-prune rather than delete-then-insert: two concurrent saves for
  // the same month (e.g. a flaky double-click) both deleting, then both inserting the same
  // category, is exactly how the delete-then-insert version raised a raw unique-constraint
  // error under a real race. Upserting each line is atomic per row (Postgres just serializes
  // concurrent writes to the same row), and the prune step only removes what's no longer wanted.
  if (lines.length) {
    const { error: upsertLinesError } = await supabase.from('budget_month_categories').upsert(
      lines.map((c) => ({ budget_month_id: planId, user_id: userId, category_id: c.category_id, amount: Number(c.amount) })),
      { onConflict: 'budget_month_id,category_id' },
    )
    if (upsertLinesError) return { error: upsertLinesError }
  }
  let pruneQuery = supabase.from('budget_month_categories').delete().eq('budget_month_id', planId).eq('user_id', userId)
  if (lines.length) pruneQuery = pruneQuery.not('category_id', 'in', `(${lines.map((c) => c.category_id).join(',')})`)
  await pruneQuery

  const { data: savedLines } = await supabase.from('budget_month_categories').select('*').eq('budget_month_id', planId).eq('user_id', userId)
  return { plan, categories: savedLines || [] }
}

export async function closeBudgetMonth(supabase, userId, id) {
  const { data: updated, error } = await supabase.from('budget_months').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  if (!updated) return { error: { message: 'Budget month not found', status: 404 } }
  return { plan: updated }
}

export async function reopenBudgetMonth(supabase, userId, id) {
  const { data: updated, error } = await supabase.from('budget_months').update({ status: 'active', closed_at: null }).eq('id', id).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  if (!updated) return { error: { message: 'Budget month not found', status: 404 } }
  return { plan: updated }
}

// Any 'active' plan whose (year, month) is strictly before the real current calendar month gets
// finalized the moment this runs. Called lazily at the top of /finance/summary rather than on a
// cron — a plan can never sit open more than one page-load past the month it belongs to.
export async function closeStaleBudgetMonths(supabase, userId) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  await supabase.from('budget_months').update({ status: 'closed', closed_at: now.toISOString() })
    .eq('user_id', userId).eq('status', 'active')
    .or(`year.lt.${y},and(year.eq.${y},month.lt.${m})`)
}
