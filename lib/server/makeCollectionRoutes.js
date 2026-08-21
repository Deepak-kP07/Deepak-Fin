import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/auth'
import { ensureDefaults } from '@/lib/server/services/categories'
import { createInCollection, deleteFromCollection, getOne, listCollection, updateInCollection } from '@/lib/server/genericCrud'

// Factory for the two route files every simple table needs:
//   app/api/finance/<table>/route.js       → { GET, POST } = makeCollectionRoutes(table)
//   app/api/finance/<table>/[id]/route.js  → { GET, PATCH, PUT, DELETE } = makeItemRoutes(table)
// Both just wrap the shared genericCrud engine with auth + CORS, matching the old catch-all's
// behavior exactly (see lib/server/genericCrud.js for the per-table side effects it preserves).

export function makeCollectionRoutes(table) {
  async function GET(request) {
    const { supabase, user, cors, response } = await requireUser(request)
    if (response) return response
    if (table === 'categories') await ensureDefaults(supabase, user.id).catch(() => {})
    const rows = await listCollection(supabase, user, table)
    return cors(NextResponse.json(rows))
  }

  async function POST(request) {
    const { supabase, user, cors, response } = await requireUser(request)
    if (response) return response
    const body = await request.json()
    const { created, error } = await createInCollection(supabase, user, table, body)
    if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
    return cors(NextResponse.json(created))
  }

  return { GET, POST }
}

export function makeItemRoutes(table) {
  async function GET(request, { params }) {
    const { id } = await params
    const { supabase, user, cors, response } = await requireUser(request)
    if (response) return response
    const row = await getOne(supabase, user, table, id)
    return cors(NextResponse.json(row))
  }

  async function PATCH(request, { params }) {
    const { id } = await params
    const { supabase, user, cors, response } = await requireUser(request)
    if (response) return response
    const body = await request.json()
    const { updated, error } = await updateInCollection(supabase, user, table, id, body)
    if (error) return cors(NextResponse.json({ error: error.message }, { status: 400 }))
    return cors(NextResponse.json(updated))
  }

  async function DELETE(request, { params }) {
    const { id } = await params
    const { supabase, user, cors, response } = await requireUser(request)
    if (response) return response
    const result = await deleteFromCollection(supabase, user, table, id)
    return cors(NextResponse.json(result))
  }

  return { GET, PATCH, PUT: PATCH, DELETE }
}
