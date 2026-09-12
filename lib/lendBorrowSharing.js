// Client-side mirror of lib/server/permissions.js's role helpers, adapted for Lend/Borrow's
// two-tier model ('read'/'admin', no 'edit') — a UX layer only (gating which buttons even
// render), never the real enforcement. The matching server-side check + RLS policy
// (drizzle/0033_lend_borrow_sharing.sql) is what actually stops a disallowed request.
export const roleFor = (record) => record.my_role || 'owner'
export const canEditRecord = (role) => role === 'owner' || role === 'admin'
export const canManageShares = (role) => role === 'owner' || role === 'admin'
export const canDeleteRecord = (role) => role === 'owner'
// Logging or deleting a repayment is a real side-effecting write (mirrors a transaction, can
// touch a credit card's outstanding balance) — reserved for the owner alone, never shared, even
// at admin tier.
export const canLogRepayment = (role) => role === 'owner'

// `record.type` is always written from the OWNER's perspective ('lent' = the owner lent it out,
// 'borrowed' = the owner borrowed it) — a collaborator who IS the counterparty needs the mirror
// opposite for anything shown as their own financial position (net worth, lent/borrowed totals,
// "they owe you"/"you owe" copy): money the owner lent them is money THEY borrowed, and money the
// owner borrowed from them is money THEY are owed. Only flips for a non-owner viewer; an owner
// (or a record with no sharing at all) always sees `type` as-is.
export const perspectiveType = (record) => (roleFor(record) === 'owner' ? record.type : (record.type === 'lent' ? 'borrowed' : 'lent'))
