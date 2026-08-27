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

// Same shape as uploadAttachment, but for the public 'avatars' bucket (see
// drizzle/0042_avatars_storage.sql) — a profile photo is rendered directly via <img src> in many
// places at once, so it needs a stable public URL rather than a signed one that'd need
// re-fetching everywhere it's shown. Returns the public URL for the caller to PATCH onto
// profiles.avatar_url itself (via the existing onSaveProfile flow), rather than doing that PATCH
// here — avatar_url is just one of several fields that save flow already handles together.
export async function uploadAvatar(file) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const path = `${userData.user.id}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (uploadError) return { error: uploadError }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return { url: data.publicUrl }
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
