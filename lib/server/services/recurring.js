export function addInterval(dateStr, frequency) {
  const d = new Date(`${dateStr}T00:00:00`)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

// No cron/background-job infra exists in this app, so recurring rules (rent, salary, SIPs,
// subscriptions) are caught up lazily — every time the summary endpoint is hit, any rule whose
// next_due_date has already passed gets its missed occurrences generated as real transactions,
// stepping forward until it's caught up to today. Capped at 60 iterations per rule as a guard
// against a corrupted/very old next_due_date generating an unbounded backlog in one request.
// Returns which rules actually generated at least one transaction on this call, and how many —
// callers that don't need that (the summary endpoint) just ignore the return value; the
// notification cron route (Phase 4) uses it to know what to notify about, without needing a
// second query to work out "what's new" after the fact.
export async function generateDueRecurring(supabase, userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: due } = await supabase.from('recurring_transactions').select('*').eq('user_id', userId).eq('is_active', true).lte('next_due_date', today)
  if (!due || due.length === 0) return []
  // Build every occurrence for every due rule in memory first, then write it all in one round
  // trip — this used to await a single-row insert per occurrence (up to 60 per rule) on every
  // /finance/summary call, which is the hot path hit after every mutation in the app.
  const rowsToInsert = []
  const generated = []
  const ruleUpdates = []
  for (const rule of due) {
    let nextDue = rule.next_due_date
    let lastGenerated = rule.last_generated_date
    let guard = 0
    let count = 0
    while (nextDue <= today && guard < 60) {
      rowsToInsert.push({
        user_id: userId, account_id: rule.account_id, category_id: rule.category_id, amount: rule.amount,
        type: rule.type, description: rule.description, date: nextDue, notes: rule.notes,
        recurring_source_id: rule.id,
      })
      lastGenerated = nextDue
      nextDue = addInterval(nextDue, rule.frequency)
      guard++
      count++
    }
    ruleUpdates.push(supabase.from('recurring_transactions').update({ next_due_date: nextDue, last_generated_date: lastGenerated }).eq('id', rule.id).eq('user_id', userId))
    if (count > 0) generated.push({ ruleId: rule.id, description: rule.description, count, lastGenerated })
  }
  if (rowsToInsert.length) await supabase.from('transactions').insert(rowsToInsert)
  await Promise.all(ruleUpdates)
  return generated
}
