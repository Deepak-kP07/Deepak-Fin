import { makeItemRoutes } from '@/lib/server/makeCollectionRoutes'

export const { GET, PATCH, PUT, DELETE } = makeItemRoutes('lend_repayments')
