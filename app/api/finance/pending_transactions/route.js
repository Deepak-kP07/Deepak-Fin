import { makeCollectionRoutes } from '@/lib/server/makeCollectionRoutes'

// Plain list + ingestion insert — the native SMS bridge's fetch() lands here (see
// lib/server/genericCrud.js's pending_transactions side effect for the last4/category
// enrichment that runs after insert). Approve/reject are separate action routes, not part of
// this collection, since they're state transitions with side effects, not plain CRUD.
export const { GET, POST } = makeCollectionRoutes('pending_transactions')
