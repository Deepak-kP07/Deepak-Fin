import { createClient } from '@/lib/supabase/browser'

// Shared client-side upload for the "receipt/screenshot" attachment pattern used by
// transactions, scholarships, and scholarship_payments — one file per record, stored in the
// private 'attachments' Supabase Storage bucket under `${userId}/${recordId}/...`, with the
// resulting path/name PATCHed onto the record's own attachment_path/attachment_name columns.
export async function uploadAttachment(endpoint, recordId, file) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const path = `${userData.user.id}/${recordId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError }
  const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attachment_path: path, attachment_name: file.name }) })
  if (!response.ok) return { error: new Error('Upload succeeded but saving the reference failed') }
  return { ok: true }
}

export async function removeAttachment(endpoint) {
  const response = await fetch(endpoint, { method: 'DELETE' })
  return { ok: response.ok }
}

export async function viewAttachment(endpoint) {
  const response = await fetch(endpoint)
  const data = await response.json()
  if (response.ok) window.open(data.url, '_blank')
}
