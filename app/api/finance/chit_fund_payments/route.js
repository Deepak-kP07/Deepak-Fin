import { makeCollectionRoutes } from '@/lib/server/makeCollectionRoutes'

// POST intentionally not exported — a payment is always created via
// chit_funds/[id]/log_payment/route.js (lib/server/services/chitFunds.js's logChitFundPayment),
// which has a real side effect (an optional linked transaction), never through a raw insert.
export const { GET } = makeCollectionRoutes('chit_fund_payments')
