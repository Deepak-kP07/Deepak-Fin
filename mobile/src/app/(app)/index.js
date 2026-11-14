import { useEffect, useState } from 'react'
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, MoreHorizontal, Plus, Settings } from 'lucide-react-native'
import { Icon } from '../../ui/Icon'
import { Avatar } from '../../ui/Avatar'
import { AccentGradient } from '../../ui/Gradient'
import { BottomSheet } from '../../ui/BottomSheet'
import { DashboardView } from '../../views/DashboardView'
import TransactionsLegacy from '../../views/legacy/TransactionsLegacy'
import AccountsLegacy from '../../views/legacy/AccountsLegacy'
import SettingsLegacy from '../../views/legacy/SettingsLegacy'
import { tw } from '../../lib/tw'
import { useAuth } from '../../state/AuthProvider'
import { useData } from '../../state/DataProvider'
import { orderedEnabledKeys, resolveMobileNavSlots, resolveModuleSettings } from '../../lib/shared'
import { MOBILE_MANDATORY_META, NAV_META } from '../../lib/navMeta'
import { api } from '../../lib/api'

// Native port of the PWA's Shell (app/page.js): one screen whose `view` switches what's shown,
// the Dashboard header, the configurable 3-slot bottom nav + "More" sheet, and the floating
// quick-add button. Modules not yet ported open their interim native screens.
const INTERIM_ROUTES = {
  cards: '/cards', loans: '/loans', lend: '/lend', chitfunds: '/chits', family_company: '/family', budgets: '/budgets',
  investments: '/investments', scholarships: '/scholarships', bucket: '/bucket', insights: '/insights',
}

export default function Shell() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { data, refresh } = useData()
  const [view, setViewState] = useState('dashboard')
  const [moreOpen, setMoreOpen] = useState(false)
  const [showMoney, setShowMoney] = useState(true)
  const [hasGreetedOnce, setHasGreetedOnce] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => { const t = setTimeout(() => setHasGreetedOnce(true), 2200); return () => clearTimeout(t) }, [])
  useEffect(() => { api('/finance/notifications').then((r) => setUnread(r.unread || 0)).catch(() => {}) }, [data])
  // Android back: from any module, back goes to the Dashboard first (as the PWA's nav does).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (moreOpen) { setMoreOpen(false); return true }
      if (view !== 'dashboard') { setViewState('dashboard'); return true }
      return false
    })
    return () => sub.remove()
  }, [view, moreOpen])

  const setView = (key) => {
    if (INTERIM_ROUTES[key]) { router.push(INTERIM_ROUTES[key]); return }
    setViewState(key)
  }
  const openTxForm = () => router.push('/transaction')

  const profile = data.profile
  const moduleSettings = resolveModuleSettings(profile)
  const mobileDestinations = [
    MOBILE_MANDATORY_META.dashboard, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts,
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const mobileNavSlots = resolveMobileNavSlots(profile, mobileDestinations.map((d) => d.key))
  const primaryMobileNav = mobileNavSlots.map((key) => mobileDestinations.find((d) => d.key === key)).filter(Boolean)
  const morePanelItems = [...mobileDestinations.filter((d) => !mobileNavSlots.includes(d.key)), { key: 'profile', label: 'Settings', icon: Settings }]
  const isMoreActive = morePanelItems.some((n) => n.key === view)

  const firstName = profile?.full_name?.split(' ')?.[0] || user?.user_metadata?.full_name?.split(' ')?.[0] || user?.email?.split('@')?.[0] || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

  return (
    <View className="flex-1">
      {view === 'dashboard' && (
        <ScrollView contentContainerStyle={{ paddingTop: Math.max(24, insets.top + 24), paddingBottom: 96 + insets.bottom }} className="px-5">
          <View className="mb-6 flex-row items-center justify-between">
            <Pressable onPress={() => setView('profile')} className="-m-1 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl p-1">
              <Avatar src={avatarUrl} name={firstName} email={user?.email} size={38} />
              <Text numberOfLines={1} className={tw('min-w-0 flex-1 text-lg font-semibold text-white light:text-slate-900')}>
                {hasGreetedOnce ? `${firstName} 👋` : <><Text className={tw('font-normal text-slate-400 light:text-slate-500')}>Welcome back,</Text> {firstName} 👋</>}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} className={tw('relative rounded-xl border border-white/10 light:border-black/10 p-2.5')}>
              <Icon as={Bell} size={16} className="text-slate-400 light:text-slate-500" />
              {unread > 0 && (
                <View className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1">
                  <Text className="text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </Pressable>
          </View>
          <DashboardView
            data={data} showMoney={showMoney} onToggleMoney={() => setShowMoney((v) => !v)} onOpenTxForm={openTxForm} setView={setView}
            onManageMoneyRules={() => router.push('/rules')} onPayCardBill={(card) => router.push({ pathname: '/forms/pay-card', params: { id: card.id } })}
          />
        </ScrollView>
      )}
      {view === 'transactions' && <TransactionsLegacy />}
      {view === 'accounts' && <AccountsLegacy />}
      {view === 'profile' && <SettingsLegacy />}

      {/* Floating quick add */}
      <Pressable onPress={openTxForm} className="absolute right-5 z-30 h-14 w-14" style={{ bottom: 96 + insets.bottom }}>
        <AccentGradient style={{ flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16 }}>
          <Plus size={24} color="#07101c" />
        </AccentGradient>
      </Pressable>

      {/* Bottom nav */}
      <View className={tw('absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 light:border-black/10 bg-[#0b0f18]/95 light:bg-white/90 glassy:glass-nav')} style={{ paddingBottom: insets.bottom }}>
        <View className="flex-row">
          {primaryMobileNav.map((n) => {
            const active = view === n.key
            return (
              <Pressable key={n.key} onPress={() => setView(n.key)} className="flex-1 items-center gap-1 py-3">
                <Icon as={n.icon} size={18} className={active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'} />
                <Text numberOfLines={1} className={tw('px-1 text-[11px]', active ? 'text-accent-300 light:text-accent-700' : 'text-slate-500')}>{n.label}</Text>
              </Pressable>
            )
          })}
          <Pressable onPress={() => setMoreOpen(true)} className="flex-1 items-center gap-1 py-3">
            <Icon as={MoreHorizontal} size={18} className={isMoreActive ? 'text-accent-300 light:text-accent-700' : 'text-slate-500'} />
            <Text className={tw('text-[11px]', isMoreActive ? 'text-accent-300 light:text-accent-700' : 'text-slate-500')}>More</Text>
          </Pressable>
        </View>
      </View>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <View className="flex-row flex-wrap gap-3 pb-4">
          {morePanelItems.map((n) => {
            const active = view === n.key
            return (
              <Pressable
                key={n.key}
                onPress={() => { setMoreOpen(false); setView(n.key) }}
                style={{ width: '31%' }}
                className={tw('items-center gap-2 rounded-xl border p-4 glassy:glass-pill', active ? 'border-accent-300/30 bg-accent-400/10' : 'border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03]')}
              >
                <Icon as={n.icon} size={20} className={active ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700'} />
                <Text numberOfLines={2} className={tw('text-center text-xs', active ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700')}>{n.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </BottomSheet>
    </View>
  )
}
