// Shared by every /api/admin/* route that needs "every Supabase Auth user" or a per-user row
// count — pulled out of stats/route.js once a second route needed the same listing, rather than
// duplicating the pagination loop.

// supabase.auth.admin.listUsers() defaults to 50/page — loop until a short page confirms we've
// seen everyone, correct at any user count instead of silently capping at the default.
export async function listAllUsers(supabase) {
  const perPage = 1000
  const all = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    all.push(...data.users)
    if (data.users.length < perPage) break
  }
  return all
}

// One query per table, counted in JS — same shape stats/route.js's activeUsersThisWeek already
// uses. Fine at this project's scale; revisit only if a table's row count stops being cheap to
// pull a single column from.
export async function countsByUser(supabase, table, column = 'user_id') {
  const { data, error } = await supabase.from(table).select(column)
  if (error) throw new Error(error.message)
  const counts = new Map()
  for (const row of data || []) {
    const key = row[column]
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}
