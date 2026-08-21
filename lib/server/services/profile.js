export async function syncProfileFromAuth(supabase, user) {
  const meta = user.user_metadata || {}
  const googleAvatar = meta.avatar_url || meta.picture
  const googleName = meta.full_name || meta.name
  if (!googleAvatar && !googleName) return
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
  if (!profile) return
  const patch = {}
  if (!profile.avatar_url && googleAvatar) patch.avatar_url = googleAvatar
  if (!profile.full_name && googleName) patch.full_name = googleName
  if (Object.keys(patch).length > 0) {
    await supabase.from('profiles').update(patch).eq('id', user.id)
  }
}
