import { makeCollectionRoutes } from '@/lib/server/makeCollectionRoutes'

// POST is intentionally not exported here — creating/updating a plan always goes through
// /budget_months/save, which saves the overall total and its category lines together. A plain
// generic-CRUD POST would only ever create an empty-category plan and invite a second,
// inconsistent way to write this data.
export const { GET } = makeCollectionRoutes('budget_months')
