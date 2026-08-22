// The stored `status` field can only be trusted for pending/received — 'paid' is only ever true
// once logged payments (scholarship_payments) actually cover the total, which is enforced
// server-side on write (lib/server/genericCrud.js). This derives what to *show* defensively, so
// a badge never disagrees with the real paid/pending numbers even for older rows written before
// that guard existed.
export function scholarshipDisplayStatus(s) {
  const total = Number(s.total_amount || 0)
  const paid = Number(s.amount_paid_to_college || 0)
  if (total > 0 && paid >= total) return 'paid'
  return s.status === 'paid' ? 'received' : s.status
}
