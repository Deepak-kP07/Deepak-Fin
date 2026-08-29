import { addInterval } from '@/lib/server/services/recurring'

// Same lazy "catch up on next summary fetch" model as generateDueRecurring (lib/server/services/
// recurring.js), just landing in money_profile_entries instead of transactions directly. Each
// created entry gets a mirror_money_profile_entry_transaction call — that RPC resolves whichever
// account applies (the rule's own account_id override, or the profile's linked_account_id) and
// is a no-op if neither does, so every row gets one call rather than pre-filtering here per-rule.
export async function generateDueRecurringMoneyProfileEntries(supabase, userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: due } = await supabase.from('recurring_money_profile_entries').select('*').eq('user_id', userId).eq('is_active', true).lte('next_due_date', today)
  if (!due || due.length === 0) return []
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
        profile_id: rule.profile_id, user_id: userId, entry_type: rule.entry_type, category_id: rule.category_id,
        account_id: rule.account_id, description: rule.description, amount: rule.amount, date: nextDue,
        paid_party: rule.paid_party, notes: rule.notes,
      })
      lastGenerated = nextDue
      nextDue = addInterval(nextDue, rule.frequency)
      guard++
      count++
    }
    ruleUpdates.push(supabase.from('recurring_money_profile_entries').update({ next_due_date: nextDue, last_generated_date: lastGenerated }).eq('id', rule.id).eq('user_id', userId))
    if (count > 0) generated.push({ ruleId: rule.id, description: rule.description, count, lastGenerated })
  }
  if (rowsToInsert.length) {
    const { data: created } = await supabase.from('money_profile_entries').insert(rowsToInsert).select('id')
    await Promise.all((created || []).map((row) =>
      supabase.rpc('mirror_money_profile_entry_transaction', { p_entry_id: row.id, p_action: 'create' }).catch(() => {})
    ))
  }
  await Promise.all(ruleUpdates)
  return generated
}
