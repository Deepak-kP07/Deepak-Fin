import { makeItemRoutes } from '@/lib/server/makeCollectionRoutes'

// GET/PATCH (inline edits before approving)/DELETE. status/resolved_at/linked_transaction_id
// are excluded from pending_transactions' safeFields entry, so PATCH can't approve/reject itself
// — only /approve and /reject (in this same [id] segment) can move status.
export const { GET, PATCH, PUT, DELETE } = makeItemRoutes('pending_transactions')
