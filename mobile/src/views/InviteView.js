import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Heart, ShieldAlert, Users, X } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { AccentGradient } from '../ui/Gradient'
import { tw } from '../lib/tw'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useAuth } from '../state/AuthProvider'
import { useData } from '../state/DataProvider'

// Native port of app/invite/[token]/page.js (Family/Company) and app/invite/lend/[token]/page.js
// (Lend/Borrow): preview who shared what, then accept or decline as the invited email.
const KINDS = {
  profile: {
    api: 'money_profile_shares', icon: Users, view: 'family_company',
    roles: { read: 'View only', edit: 'Add & edit entries', admin: 'Manage everything but delete' },
    accepted: (p) => `"${p.profile_name}" now shows up in your own Family / Company list.`,
  },
  lend: {
    api: 'lend_borrow_shares', icon: Heart, view: 'lend',
    roles: { read: 'View only', admin: 'Edit & manage access' },
    accepted: () => 'This record now shows up in your own Lend / Borrow list.',
  },
}

export function InviteView({ kind, token }) {
  const cfg = KINDS[kind] || KINDS.profile
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { refresh } = useData()
  const [preview, setPreview] = useState(undefined)
  const [previewError, setPreviewError] = useState('')
  const [responding, setResponding] = useState(false)
  const [respondError, setRespondError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!token) { setPreview(null); setPreviewError('This invite link is incomplete.'); return }
    api(`/finance/${cfg.api}/preview?token=${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((e) => { setPreviewError(e.status === 404 ? '' : e.message || 'Something went wrong loading this invite.'); setPreview(null) })
  }, [token, cfg.api])

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const goToModule = () => router.replace({ pathname: '/', params: { view: cfg.view } })
  const respond = async (action) => {
    setResponding(true); setRespondError('')
    try {
      const share = await api(`/finance/${cfg.api}/accept`, { method: 'POST', body: { token, action } })
      setResult({ status: share?.status || (action === 'accept' ? 'accepted' : 'declined') })
      if (action === 'accept') refresh()
    } catch (e) { setRespondError(e.message || 'Something went wrong') } finally { setResponding(false) }
  }

  let body
  if (preview === undefined) {
    body = <ActivityIndicator className="my-10" />
  } else if (!preview) {
    body = (
      <>
        <Icon as={ShieldAlert} size={32} className="self-center text-rose-300 light:text-rose-700" />
        <Text className={tw('mt-4 text-center text-lg font-semibold text-white light:text-slate-900')}>Invite not found</Text>
        <Text className={tw('mt-2 text-center text-sm text-slate-400 light:text-slate-500')}>{previewError || "This invite link doesn't exist or has already been used."}</Text>
        <SecondaryButton label="Close" onPress={close} />
      </>
    )
  } else if (result) {
    const accepted = result.status === 'accepted'
    body = (
      <>
        <Icon as={accepted ? Check : X} size={32} className={tw('self-center', accepted ? 'text-emerald-300 light:text-emerald-700' : 'text-slate-400 light:text-slate-500')} />
        <Text className={tw('mt-4 text-center text-lg font-semibold text-white light:text-slate-900')}>{accepted ? "You're in" : 'Invite declined'}</Text>
        <Text className={tw('mt-2 text-center text-sm text-slate-400 light:text-slate-500')}>{accepted ? cfg.accepted(preview) : 'You can ignore this invite from now on.'}</Text>
        {accepted ? <PrimaryButton label={kind === 'lend' ? 'Open Lend / Borrow' : 'Open Family / Company'} onPress={goToModule} /> : <SecondaryButton label="Close" onPress={close} />}
      </>
    )
  } else {
    const isExpired = preview.status === 'pending' && new Date(preview.expires_at).getTime() < Date.now()
    const emailMatches = (user?.email || '').toLowerCase() === String(preview.invited_email || '').toLowerCase()
    const role = cfg.roles[preview.role] || preview.role
    const verb = preview.record_type === 'borrowed' ? 'borrowed from' : 'lent to'
    body = (
      <>
        <View className="h-14 w-14 items-center justify-center self-center rounded-2xl bg-accent-400/15"><Icon as={cfg.icon} size={22} className="text-accent-200 light:text-accent-700" /></View>
        <Text className={tw('mt-4 text-center text-lg font-semibold text-white light:text-slate-900')}>{preview.status === 'pending' && !isExpired ? "You're invited" : 'This invite'}</Text>
        {kind === 'lend' ? (
          <Text className={tw('mt-2 text-center text-sm text-slate-400 light:text-slate-500')}>
            to {String(role).toLowerCase()} — <Text className={tw('text-white light:text-slate-900')}>{money(preview.amount)} {verb} {preview.person_name}</Text>
          </Text>
        ) : (
          <Text className={tw('mt-2 text-center text-sm text-slate-400 light:text-slate-500')}>
            to <Text className={tw('text-white light:text-slate-900')}>{preview.profile_name}</Text> as <Text className={tw('text-accent-200 light:text-accent-700')}>{role}</Text>
          </Text>
        )}
        {isExpired ? (
          <Notice tone="amber">This invite has expired — ask them to send a new one.</Notice>
        ) : preview.status !== 'pending' ? (
          <Notice>This invite was already {preview.status}.</Notice>
        ) : !emailMatches ? (
          <Notice tone="amber">This invite was sent to {preview.invited_email} — sign in as that address to accept it.</Notice>
        ) : (
          <>
            {respondError ? <Text className={tw('mt-4 text-center text-sm text-rose-300 light:text-rose-700')}>{respondError}</Text> : null}
            <View className="mt-6 flex-row gap-3">
              <Pressable disabled={responding} onPress={() => respond('decline')} className={tw('flex-1 items-center rounded-xl border border-white/10 light:border-black/10 px-4 py-3', responding && 'opacity-60')}>
                <Text className={tw('text-sm font-medium text-slate-300 light:text-slate-700')}>Decline</Text>
              </Pressable>
              <Pressable disabled={responding} onPress={() => respond('accept')} className={tw('flex-1', responding && 'opacity-60')}>
                <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}><Text className="text-sm font-semibold text-[#07101c]">{responding ? 'Accepting…' : 'Accept'}</Text></AccentGradient>
              </Pressable>
            </View>
          </>
        )}
        {(isExpired || preview.status !== 'pending' || !emailMatches) && <SecondaryButton label="Close" onPress={close} />}
      </>
    )
  }

  return (
    <View className="flex-1 justify-center p-4" style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View className={tw('w-full rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-8')}>{body}</View>
    </View>
  )
}

function Notice({ tone, children }) {
  const amber = tone === 'amber'
  return (
    <View className={tw('mt-6 rounded-xl border px-4 py-3', amber ? 'border-amber-400/20 bg-amber-400/10' : 'border-white/10 light:border-black/10 bg-white/[.03] light:bg-black/[.02]')}>
      <Text className={tw('text-center text-sm', amber ? 'text-amber-200 light:text-amber-700' : 'text-slate-400 light:text-slate-500')}>{children}</Text>
    </View>
  )
}
const PrimaryButton = ({ label, onPress }) => (
  <Pressable onPress={onPress} className="mt-6"><AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}><Text className="text-sm font-semibold text-[#07101c]">{label}</Text></AccentGradient></Pressable>
)
const SecondaryButton = ({ label, onPress }) => (
  <Pressable onPress={onPress} className={tw('mt-6 items-center rounded-xl border border-white/10 light:border-black/10 px-4 py-3')}><Text className={tw('text-sm font-medium text-slate-300 light:text-slate-700')}>{label}</Text></Pressable>
)
