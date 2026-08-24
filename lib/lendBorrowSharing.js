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
