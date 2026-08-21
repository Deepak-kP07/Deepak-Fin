import { makeItemRoutes } from '@/lib/server/makeCollectionRoutes'

export const { GET, PATCH, PUT, DELETE } = makeItemRoutes('credit_cards')
