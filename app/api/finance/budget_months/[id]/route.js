import { makeItemRoutes } from '@/lib/server/makeCollectionRoutes'

// PATCH/PUT are intentionally not exported — total_amount and category lines only change via
// /budget_months/save (which enforces the closed-month lock), and status only changes via the
// dedicated close/reopen actions. DELETE stays generic (cascade removes its category lines).
export const { GET, DELETE } = makeItemRoutes('budget_months')
