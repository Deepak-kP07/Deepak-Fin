import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as WebBrowser from 'expo-web-browser'
import * as Lucide from 'lucide-react-native'
import {
  ArrowDown, ArrowUp, Bell, BookOpen, Camera, CheckCircle2, ChevronDown, Circle, ExternalLink, Eye, EyeOff, KeyRound, Landmark, LayoutDashboard,
  LayoutGrid, Link2, Lock, LogOut, Menu, Moon, Palette, Pencil, Plus, RefreshCw, ShieldAlert, Smartphone, Sparkles, Star, Sun, Tag, Trash2, User,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { Avatar } from '../ui/Avatar'
import { BottomSheet } from '../ui/BottomSheet'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { EmptyState } from '../ui/EmptyState'
import { usePinDialog } from '../ui/PinDialog'
import { Field, FormSheet, Input, Pills, ColorPicker, SubmitButton } from '../ui/FormKit'
import { Select } from '../ui/Select'
import { tw } from '../lib/tw'
import { api, API_URL, WEB_URL } from '../lib/api'
import { supabase } from '../lib/supabase'
import { capitalizeFirst } from '../lib/format'
import { getCategoryIcon } from '../lib/categoryIcons'
import { disablePush, enablePush, pushPermissionStatus } from '../lib/push'
import { orderedEnabledKeys, resolveDashboardWidgets, resolveMobileNavSlots, resolveModuleSettings, resolveQuickActionSlots } from '../lib/shared'
import { ADD_ACTION_META, MOBILE_MANDATORY_META, NAV_META } from '../lib/navMeta'
import { CHANGELOG } from '@/lib/changelog'
import { GUIDE } from '@/lib/userGuide'

// Native port of features/settings/* (SettingsShell and every panel). Drag-to-reorder lists on
// the web use ↑/↓ buttons here; the Mobile nav phone preview uses tap-to-pick instead of drag.
const CARD = 'rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-5 glassy:glass-card'
const ROW = 'flex-row items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3'
const T = { title: 'text-sm font-semibold text-white light:text-slate-900', sub: 'text-xs text-slate-500', body: 'text-sm text-white light:text-slate-900' }
const ACCENT_PRESETS = [
  { name: 'Gold', hex: '#d4af37' }, { name: 'Cyan', hex: '#67e8f9' }, { name: 'Blue', hex: '#3b82f6' }, { name: 'Violet', hex: '#a78bfa' },
  { name: 'Green', hex: '#22c55e' }, { name: 'Orange', hex: '#f97316' }, { name: 'Rose', hex: '#fb7185' },
]
const ToggleRow = ({ label, description, checked, onChange, disabled }) => (
  <View className={tw(ROW)}>
    <View className="flex-1"><Text className={tw(T.body)}>{label}</Text>{description ? <Text className="mt-0.5 text-xs text-slate-500">{description}</Text> : null}</View>
    <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
  </View>
)
const OrderButtons = ({ onUp, onDown }) => (
  <View className="flex-row">
    <Pressable disabled={!onUp} onPress={onUp} hitSlop={6} className={tw('rounded p-1', !onUp && 'opacity-30')}><Icon as={ArrowUp} size={15} className="text-slate-500" /></Pressable>
    <Pressable disabled={!onDown} onPress={onDown} hitSlop={6} className={tw('rounded p-1', !onDown && 'opacity-30')}><Icon as={ArrowDown} size={15} className="text-slate-500" /></Pressable>
  </View>
)
const move = (arr, i, d) => { const next = [...arr]; const [x] = next.splice(i, 1); next.splice(i + d, 0, x); return next }

function ProfilePanel({ data, user, onSaveProfile, onDeleteAccount }) {
  const { profile } = data
  const [form, setForm] = useState({ full_name: '', age: '' })
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  useEffect(() => { if (profile) setForm({ full_name: profile.full_name || '', age: profile.age != null ? String(profile.age) : '' }) }, [profile])
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  // Same storage path/bucket as the web's uploadAvatar (lib/attachments.js): avatars/<userId>/<time>-<name>.
  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (res.canceled || !res.assets?.[0]) return
    const asset = res.assets[0]
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) return Alert.alert('Image is too large', 'Please pick one under 5MB.')
    setAvatarBusy(true)
    try {
      const body = await (await fetch(asset.uri)).arrayBuffer()
      const name = asset.fileName || `avatar-${Date.now()}.jpg`
      const path = `${user.id}/${Date.now()}-${name}`
      const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: asset.mimeType || 'image/jpeg', upsert: true })
      if (error) throw error
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      await onSaveProfile({ avatar_url: pub.publicUrl })
    } catch (e) { Alert.alert('Photo failed to upload', e.message) } finally { setAvatarBusy(false) }
  }
  return (
    <View className={tw(CARD, 'p-5')}>
      <Text className={tw(T.title)}>Profile</Text>
      <Text className="mt-1 text-[11px] text-slate-500">Your name and photo, as they appear across the app.</Text>
      <View className="mt-6 items-center">
        <Pressable onPress={pickAvatar} className="relative rounded-full border border-accent-300/25 p-1">
          <View style={{ opacity: avatarBusy ? 0.5 : 1 }}><Avatar src={avatarUrl} name={form.full_name} email={user?.email} size={128} rounded="rounded-full" /></View>
          <View className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-black/60"><Camera size={16} color="#fff" /></View>
        </Pressable>
        <Text className="mt-2 text-[11px] text-slate-500">{avatarBusy ? 'Uploading…' : 'Tap your photo to change it'}</Text>
        <Text className={tw('mt-3 text-xl font-semibold text-white light:text-slate-900')}>{form.full_name || 'Your profile'}</Text>
        <Text className="text-xs text-slate-500">{user?.email}</Text>
      </View>
      <View className="mt-8 flex-row gap-3">
        <Field label="Full name" style={{ flex: 2 }}><Input value={form.full_name} onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))} placeholder="Your name" /></Field>
        <Field label="Age" style={{ flex: 1 }}><Input keyboardType="number-pad" value={form.age} onChangeText={(v) => setForm((f) => ({ ...f, age: v }))} /></Field>
      </View>
      <SubmitButton className="mt-2" label={busy ? 'Saving…' : 'Save profile'} busy={busy} onPress={async () => { setBusy(true); try { await onSaveProfile({ full_name: form.full_name, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) } }} />
      <View className={tw('mt-10 border-t border-white/10 light:border-black/10 pt-6')}>
        <Text className={tw(T.title)}>Delete account</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500">Permanently deletes your login, every record across the app, and every file you uploaded. This can't be undone.</Text>
        <Pressable onPress={onDeleteAccount} className="mt-3 flex-row items-center gap-2 self-start rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5"><Icon as={Trash2} size={14} className={tw('text-rose-300 light:text-rose-700')} /><Text className={tw('text-xs font-medium text-rose-300 light:text-rose-700')}>Delete my account</Text></Pressable>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)} className="mt-4"><Text className="text-[11px] text-slate-500 underline">Privacy policy</Text></Pressable>
      </View>
    </View>
  )
}

function AppearancePanel({ data, onSaveProfile }) {
  const current = (data.profile?.accent_color || '#d4af37').toLowerCase()
  const theme = data.profile?.theme || 'dark'
  return (
    <View className="gap-4">
      <View className={tw(CARD)}>
        <Text className={tw(T.title)}>Accent color</Text>
        <Text className="mt-1 text-[11px] text-slate-500">The one signature color used across every screen — buttons, active tabs, highlights.</Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          {ACCENT_PRESETS.map((p) => (
            <Pressable key={p.hex} onPress={() => onSaveProfile({ accent_color: p.hex })} className={tw('h-12 w-12 items-center justify-center rounded-full border-2', current === p.hex.toLowerCase() ? 'border-white light:border-slate-900' : 'border-transparent')}>
              <View className="h-9 w-9 rounded-full" style={{ backgroundColor: p.hex }} />
            </Pressable>
          ))}
        </View>
      </View>
      <View className={tw(CARD)}>
        <Text className={tw(T.title)}>Theme</Text>
        <View className="mt-3 flex-row gap-3">
          {[{ v: 'dark', l: 'Dark', I: Moon, bg: '#1e293b' }, { v: 'light', l: 'Light', I: Sun, bg: '#f1f5f9' }, { v: 'glassy', l: 'Glass', I: Sparkles, bg: '#0f172a' }].map((t) => (
            <Pressable key={t.v} onPress={() => onSaveProfile({ theme: t.v })} className={tw('flex-1 rounded-xl border p-3', theme === t.v ? 'border-accent-300/50 bg-accent-400/10' : 'border-white/10 light:border-black/10')}>
              <View className="h-10 items-center justify-center rounded-lg border border-white/10" style={{ backgroundColor: t.bg }}><t.I size={16} color={t.v === 'light' ? '#64748b' : '#cbd5e1'} /></View>
              <Text className={tw('mt-2 text-sm font-medium text-white light:text-slate-900')}>{t.l}</Text>
              {theme === t.v ? <Text className={tw('text-[11px] text-accent-300 light:text-accent-600')}>Active</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

function GuardrailsPanel({ data, onSaveProfile }) {
  const on = data.profile?.block_insufficient_funds !== false
  return (
    <View className={tw(CARD)}>
      <Text className={tw(T.title)}>Spending guardrails</Text>
      <View className="mt-3"><ToggleRow label="Block transactions when an account is short" description={`When a bank, cash, or debit card doesn't have enough balance: ${on ? 'blocked outright' : 'allowed with a "confirm anyway" prompt'}. Credit cards always block past their limit, regardless of this setting.`} checked={on} onChange={(v) => onSaveProfile({ block_insufficient_funds: v })} /></View>
    </View>
  )
}

function NotificationsPanel({ data, onSaveProfile }) {
  const { profile } = data
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { pushPermissionStatus().then(setStatus).catch(() => setStatus('undetermined')) }, [])
  const toggle = async (v) => {
    setBusy(true)
    try {
      if (v) { if (!(await enablePush())) Alert.alert('Notifications are off', 'Allow notifications for Personal Fin in Android settings.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }]) }
      else await disablePush({ optOut: true })
      setStatus(await pushPermissionStatus())
    } catch (e) { Alert.alert('Could not update notifications', e.message) } finally { setBusy(false) }
  }
  return (
    <View className="gap-4">
      <View className={tw(CARD)}>
        <Text className={tw(T.title)}>Push notifications</Text>
        <View className={tw('mt-3', ROW)}>
          <Icon as={Bell} size={16} className={tw('text-slate-400 light:text-slate-500')} />
          <View className="flex-1"><Text className={tw(T.body)}>Notify this device</Text><Text className="mt-0.5 text-xs text-slate-500">Credit card bills due soon, loan EMIs due soon, recurring transactions added, and budget overspend — nothing else.</Text></View>
          {status === null || busy ? <ActivityIndicator /> : <ToggleSwitch checked={status === 'on'} onChange={toggle} />}
        </View>
      </View>
      <View className={tw(CARD, 'gap-3')}>
        <Text className={tw(T.title)}>Email reports</Text>
        <ToggleRow label="Weekly summary" description="Net worth, income vs expense, budget pace, and upcoming bills — every Monday morning." checked={profile?.weekly_report_enabled !== false} onChange={(v) => onSaveProfile({ weekly_report_enabled: v })} />
        <ToggleRow label="Monthly summary" description="Your full month recap — net worth change, budget status, and top spending categories." checked={profile?.monthly_report_enabled !== false} onChange={(v) => onSaveProfile({ monthly_report_enabled: v })} />
      </View>
    </View>
  )
}

const MODULE_INFO = {
  credit_cards: ['Credit cards', 'Track cards, spends, and bill payments.'], investments: ['Investments', 'Portfolios, holdings, SIPs, and other assets.'],
  loans: ['Loans', 'EMIs, prepayments, and amortization.'], family_company: ['Family / Company', 'Income, capital, and expenses for a family or company profile.'],
  lend_borrow: ['Lend / Borrow', "Money you've lent or borrowed with people."], scholarships: ['Scholarships', 'Scholarship batches received and payments made to college.'],
  budgets: ['Budgets', 'Monthly plans, category breakdowns, and yearly budgets.'], bucket_list: ['Bucket list', "The 30-day rule for things you're tempted to buy."],
  insights: ['Insights', 'Charts and trends across your finances.'], chit_funds: ['Chit funds', "Track a chit fund you're a member of — monthly payments, payout, and net worth."],
}
function ModulesPanel({ data, onSaveProfile }) {
  const resolved = resolveModuleSettings(data.profile)
  const keys = Object.keys(resolved).sort((a, b) => resolved[a].order - resolved[b].order)
  const reorder = (next) => { const out = { ...resolved }; next.forEach((k, i) => { out[k] = { ...resolved[k], order: i } }); onSaveProfile({ module_settings: out }) }
  return (
    <View className={tw(CARD)}>
      <Text className={tw(T.title)}>Modules</Text>
      <Text className={tw(T.sub)}>Turn modules on or off, and reorder them. Dashboard, Transactions, and Accounts are always on and always come first.</Text>
      <View className="mt-3 gap-2">
        {keys.map((k, i) => (
          <View key={k} className={tw(ROW)}>
            <OrderButtons onUp={i > 0 ? () => reorder(move(keys, i, -1)) : null} onDown={i < keys.length - 1 ? () => reorder(move(keys, i, 1)) : null} />
            <View className="flex-1"><Text className={tw(T.body)}>{MODULE_INFO[k]?.[0] || k}</Text><Text className="mt-0.5 text-xs text-slate-500">{MODULE_INFO[k]?.[1]}</Text></View>
            <ToggleSwitch checked={resolved[k].enabled} onChange={() => onSaveProfile({ module_settings: { ...resolved, [k]: { ...resolved[k], enabled: !resolved[k].enabled } } })} />
          </View>
        ))}
      </View>
    </View>
  )
}

function MobileNavPanel({ data, onSaveProfile }) {
  const moduleSettings = resolveModuleSettings(data.profile)
  const optional = orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k])
  const navDest = [MOBILE_MANDATORY_META.dashboard, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts, ...optional]
  const actionDest = [ADD_ACTION_META, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts, ...optional]
  const navSlots = resolveMobileNavSlots(data.profile, navDest.map((d) => d.key))
  const actionSlots = resolveQuickActionSlots(data.profile, actionDest.map((d) => d.key))
  const [picking, setPicking] = useState(null) // { group: 'nav'|'action', index }
  const options = picking ? (picking.group === 'nav' ? navDest : actionDest) : []
  const choose = (key) => {
    const nav = [...navSlots], act = [...actionSlots]
    const arr = picking.group === 'nav' ? nav : act
    const existing = arr.indexOf(key)
    if (existing >= 0) arr[existing] = arr[picking.index] // swap if already placed in this group
    arr[picking.index] = key
    if (picking.group === 'nav' && !nav.includes('dashboard')) return Alert.alert('Home stays in the bottom nav', 'You can move it to any of the 3 positions.')
    onSaveProfile({ mobile_nav_settings: { slots: nav, quick_actions: act } })
    setPicking(null)
  }
  const find = (list, key) => list.find((d) => d.key === key)
  return (
    <View className={tw(CARD)}>
      <Text className={tw(T.title)}>Mobile nav</Text>
      <Text className="mt-1 text-[11px] text-slate-500">This is your phone screen. Tap a spot in the bottom nav or the quick actions to choose what goes there. Home always stays in the bottom nav, but you can move it to any of the 3 positions.</Text>
      <View className={tw('mt-5 self-center w-full max-w-[280px] rounded-[40px] border border-white/15 light:border-black/15 p-2')}>
        <View className={tw('overflow-hidden rounded-[34px] bg-[#080b12] light:bg-[#eef1f6]')}>
          <View className="px-4 pt-8">
            <Text className="text-[9px] uppercase tracking-widest text-slate-500">Net worth</Text>
            <Text className={tw('mt-1 text-2xl font-semibold text-white light:text-slate-900')}>₹••,••,•••</Text>
            <View className="mt-4 flex-row">
              {actionSlots.map((key, i) => { const it = find(actionDest, key); return (
                <Pressable key={i} onPress={() => setPicking({ group: 'action', index: i })} className="flex-1 items-center gap-1 rounded-xl py-1.5">
                  <View className={tw('h-7 w-7 items-center justify-center rounded-full', key === 'add' ? 'bg-accent-400/20' : 'bg-white/[.08] light:bg-black/[.05]')}>{it ? <Icon as={it.icon} size={13} className={key === 'add' ? 'text-accent-200 light:text-accent-700' : 'text-slate-200'} /> : null}</View>
                  <Text numberOfLines={1} className={tw('text-[9px] text-slate-300 light:text-slate-600')}>{it?.label}</Text>
                </Pressable>
              ) })}
            </View>
          </View>
          <View className="mt-5 gap-2 px-4"><View className={tw('h-3 w-2/3 rounded-full bg-white/[.05] light:bg-black/[.04]')} /><View className={tw('h-14 rounded-2xl bg-white/[.04] light:bg-black/[.03]')} /></View>
          <View className="h-6" />
          <View className={tw('flex-row border-t border-white/10 light:border-black/10 bg-black/40 light:bg-white/70 px-1')}>
            {navSlots.map((key, i) => { const it = find(navDest, key); return (
              <Pressable key={i} onPress={() => setPicking({ group: 'nav', index: i })} className="flex-1 items-center gap-0.5 py-1.5">
                {it ? <Icon as={it.icon} size={15} className={tw('text-slate-300 light:text-slate-600')} /> : null}
                <Text numberOfLines={1} className={tw('text-[8px] text-slate-300 light:text-slate-600')}>{it?.label}</Text>
              </Pressable>
            ) })}
            <View className="flex-1 items-center gap-0.5 py-1.5"><Icon as={Lucide.MoreHorizontal} size={15} className="text-slate-500" /><Text className="text-[8px] text-slate-500">More</Text></View>
          </View>
        </View>
      </View>
      <BottomSheet open={!!picking} onOpenChange={(v) => !v && setPicking(null)} title={picking?.group === 'nav' ? 'Bottom nav spot' : 'Quick action'}>
        <View className="flex-row flex-wrap gap-2 pb-4">
          {options.map((it) => (
            <Pressable key={it.key} onPress={() => choose(it.key)} style={{ width: '31%' }} className={tw('items-center gap-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5')}>
              <Icon as={it.icon} size={16} className={tw('text-accent-300 light:text-accent-700')} />
              <Text className={tw('text-center text-[10px] text-slate-300 light:text-slate-700')}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  )
}

const STAT_INFO = { net_worth: ['Net worth', 'Cash + investments − debt.'], income_month: ['Income this month', ''], expense_month: ['Expense this month', ''], savings_rate: ['Savings rate', '% of income saved this month.'], net_cashflow: ['Net cash flow', 'Income minus expense this month, as a plain amount.'], total_debt: ['Total debt', 'Loans outstanding + credit card balances.'], total_invested: ['Total invested', 'Current value across your portfolios.'], avg_monthly_spend: ['Avg. monthly spend', 'Average expense over the last 6 months.'], transactions_count: ['Transactions this month', "How many you've logged so far."], top_category: ['Top spending category', 'Your biggest expense category this month.'], credit_utilization: ['Credit utilization', '% of your combined credit limit in use.'], budget_used_pct: ['Budget used', "% of this month's budget spent so far."] }
const SECTION_INFO = { credit_card_alert: ['Credit card bill alert', 'Banner warning when a card bill is due soon.'], quick_tiles: ['Quick tiles', 'Portfolio, loans, and bucket list shortcuts.'], cashflow_chart: ['Cash flow chart', 'Last 6 months of income vs expense.'], recent_transactions: ['Recent transactions', "A scrolling ticker of this month's activity."], money_rules_widget: ['Money rules', 'Your active rules, with a link to manage them.'], balances_panel: ['Balances', 'Accounts, cards, and portfolios at a glance.'] }
function DashboardPanel({ data, onSaveProfile }) {
  const resolved = resolveDashboardWidgets(data.profile)
  const toggle = (k) => onSaveProfile({ dashboard_widgets: { ...resolved, [k]: { ...resolved[k], enabled: !resolved[k].enabled } } })
  const list = (info) => Object.keys(info).map((k) => <ToggleRow key={k} label={info[k][0]} description={info[k][1]} checked={resolved[k]?.enabled} onChange={() => toggle(k)} />)
  return (
    <View className="gap-4">
      <View className={tw(CARD)}><Text className={tw(T.title)}>Stat cards</Text><Text className={tw(T.sub)}>Choose which numbers show in the top row. Position is fixed — only visibility is configurable.</Text><View className="mt-3 gap-2">{list(STAT_INFO)}</View></View>
      <View className={tw(CARD)}><Text className={tw(T.title)}>Sections</Text><Text className={tw(T.sub)}>Show or hide whole sections of the dashboard.</Text><View className="mt-3 gap-2">{list(SECTION_INFO)}</View></View>
    </View>
  )
}

const MODULE_OPTIONS = [{ key: 'transactions', label: 'Transactions' }, { key: 'budgets', label: 'Budgets' }, { key: 'recurring', label: 'Recurring' }, { key: 'credit_card_spend', label: 'Credit card spend' }, { key: 'family_company', label: 'Family / Company' }]
function CategoriesPanel({ data, refresh }) {
  const [type, setType] = useState('expense')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new
  const cats = [...data.categories].filter((c) => c.type === type).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const patch = async (c, body) => { try { await api(`/finance/categories/${c.id}`, { method: 'PATCH', body }); await refresh() } catch (e) { Alert.alert('Update failed', e.message) } }
  const reorder = async (next) => { try { await Promise.all(next.map((c, i) => ((c.order_index ?? 0) !== i ? api(`/finance/categories/${c.id}`, { method: 'PATCH', body: { order_index: i } }) : null))); await refresh() } catch { Alert.alert('Reorder failed') } }
  const remove = (c) => Alert.alert(`Delete category "${c.name}"?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/finance/categories/${c.id}`, { method: 'DELETE' }); await refresh() } catch (e) { Alert.alert('Delete failed', e.message) } } }])
  return (
    <View className={tw(CARD)}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className={tw(T.title)}>Categories</Text>
        <Pressable onPress={() => setEditing(null)} className="flex-row items-center gap-1.5 rounded-xl bg-accent-400/15 px-3 py-1.5"><Icon as={Plus} size={13} className={tw('text-accent-200 light:text-accent-700')} /><Text className={tw('text-xs font-semibold text-accent-200 light:text-accent-700')}>Add</Text></Pressable>
      </View>
      <Text className="mt-1 text-xs text-slate-500">Reorder how categories appear in pickers, and choose which modules each one shows up in.</Text>
      <Pills value={type} onChange={setType} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      <View className="mt-3 gap-2">
        {cats.length === 0 ? <Text className="text-sm text-slate-500">No categories yet</Text> : cats.map((c, i) => {
          const I = getCategoryIcon(c.name)
          return (
            <View key={c.id} className={tw('rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] p-3')}>
              <View className="flex-row items-center gap-2">
                <OrderButtons onUp={i > 0 ? () => reorder(move(cats, i, -1)) : null} onDown={i < cats.length - 1 ? () => reorder(move(cats, i, 1)) : null} />
                <View className="h-5 w-5 items-center justify-center rounded-md" style={{ backgroundColor: `${c.color || '#94a3b8'}33` }}><I size={12} color={c.color || '#94a3b8'} /></View>
                <Text numberOfLines={1} className={tw('min-w-0 flex-1 text-sm text-white light:text-slate-900')}>{c.name}</Text>
                <Pressable onPress={() => setEditing(c)} className="rounded-lg p-1.5"><Icon as={Pencil} size={13} className="text-slate-500" /></Pressable>
                <Pressable onPress={() => remove(c)} className="rounded-lg p-1.5"><Icon as={Trash2} size={13} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {MODULE_OPTIONS.map((m) => {
                  const hidden = (c.hidden_in_modules || []).includes(m.key)
                  return (
                    <Pressable key={m.key} onPress={() => patch(c, { hidden_in_modules: hidden ? (c.hidden_in_modules || []).filter((x) => x !== m.key) : [...(c.hidden_in_modules || []), m.key] })} style={{ width: '48%' }}
                      className={tw('flex-row items-center gap-1.5 rounded-lg px-2.5 py-2', !hidden && 'bg-accent-400/10')}>
                      <Icon as={hidden ? Circle : CheckCircle2} size={14} className={hidden ? 'text-slate-500' : 'text-accent-200 light:text-accent-700'} />
                      <Text className={tw('text-xs font-medium', hidden ? 'text-slate-500' : 'text-accent-200 light:text-accent-700')}>{m.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )
        })}
      </View>
      <CategoryForm open={editing !== undefined} editing={editing} defaultType={type} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await refresh() }} />
    </View>
  )
}
function CategoryForm({ open, editing, defaultType, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', type: defaultType, color: '#fb7185' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(editing ? { name: editing.name, type: editing.type, color: editing.color || '#fb7185' } : { name: '', type: defaultType, color: '#fb7185', icon: 'tag' }) }, [editing, open])
  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Enter a name')
    setBusy(true)
    try { await api(editing ? `/finance/categories/${editing.id}` : '/finance/categories', { method: editing ? 'PATCH' : 'POST', body: form }); onSaved() } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  return (
    <FormSheet open={open} onClose={onClose} title={editing ? 'Edit category' : 'Add category'} submitLabel={busy ? 'Saving…' : editing ? 'Update category' : 'Save category'} onSubmit={save} busy={busy}>
      <Field label="Name"><Input value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Groceries" /></Field>
      <Field label="Type"><Pills value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} /></Field>
      <Field label="Colour"><ColorPicker value={form.color} onChange={(c) => setForm((f) => ({ ...f, color: c }))} /></Field>
    </FormSheet>
  )
}

function AccountsPanel({ data, refresh }) {
  const accounts = [...data.accounts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const reorder = async (next) => { try { await Promise.all(next.map((a, i) => ((a.order_index ?? 0) !== i ? api(`/finance/accounts/${a.id}`, { method: 'PATCH', body: { order_index: i } }) : null))); await refresh() } catch { Alert.alert('Reorder failed') } }
  const toggle = async (a) => { try { await api(`/finance/accounts/${a.id}`, { method: 'PATCH', body: { is_active: a.is_active === false } }); await refresh() } catch { Alert.alert('Update failed') } }
  return (
    <View className={tw(CARD)}>
      <Text className={tw(T.title)}>Accounts</Text>
      <Text className={tw(T.sub)}>Reorder how accounts appear in every dropdown across the app. The eye icon hides an account from those dropdowns without touching its balance or history.</Text>
      {accounts.length === 0 ? <Text className="mt-3 text-sm text-slate-500">No accounts yet</Text> : (
        <View className="mt-3 gap-1.5">
          {accounts.map((a, i) => (
            <View key={a.id} className={tw('flex-row items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-3 py-2', a.is_active === false && 'opacity-50')}>
              <OrderButtons onUp={i > 0 ? () => reorder(move(accounts, i, -1)) : null} onDown={i < accounts.length - 1 ? () => reorder(move(accounts, i, 1)) : null} />
              <Icon as={Landmark} size={14} className="text-slate-500" />
              <Text numberOfLines={1} className={tw('min-w-0 flex-1 text-sm text-white light:text-slate-900')}>{a.name}</Text>
              <Text className="text-xs capitalize text-slate-500">{a.type.replace('_', ' ')}</Text>
              <Pressable onPress={() => toggle(a)} className="rounded-lg p-1.5"><Icon as={a.is_active === false ? EyeOff : Eye} size={15} className="text-slate-500" /></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function HiddenPanel({ data, onHiddenPinChanged, onSignOut }) {
  const hasPin = !!data.profile?.has_hidden_pin
  const pinDialog = usePinDialog()
  const post = async (path, body) => { try { await api(`/finance/hidden_pin${path}`, { method: 'POST', body: body || {} }); return { ok: true } } catch (e) { return { ok: false, error: e.message } } }
  const setup = async () => {
    let current
    if (hasPin && !(await pinDialog.ask({ title: 'Enter your current PIN', confirmLabel: 'Next', submit: async (p) => { current = p; return post('/verify', { pin: p }) } }))) return
    let first
    if (!(await pinDialog.ask({ title: hasPin ? 'Choose a new PIN' : 'Create a PIN', message: "4 to 6 digits. You'll need it to see hidden transactions.", confirmLabel: 'Next', submit: async (p) => { first = p; return { ok: true } } }))) return
    if (await pinDialog.ask({ title: 'Confirm your PIN', confirmLabel: 'Save PIN', submit: async (p) => (p === first ? post('', { pin: p, current_pin: current }) : { ok: false, error: "PINs don't match — try again." }) })) { onHiddenPinChanged(true); Alert.alert(hasPin ? 'PIN changed' : 'PIN set') }
  }
  const forgot = async () => { const r = await post('/reset'); if (r.ok) { onHiddenPinChanged(false); Alert.alert('PIN cleared — set a new one') } else Alert.alert(r.error) }
  return (
    <View className={tw(CARD)}>
      <View className="flex-row items-center gap-2"><Icon as={Lock} size={15} className={tw('text-accent-300 light:text-accent-700')} /><Text className={tw(T.title)}>Hidden transactions</Text></View>
      <Text className="mt-1.5 text-xs leading-5 text-slate-500">Turn on "Hide this transaction" when adding one to keep it out of every list. It still counts in your balances, totals and charts. To see hidden transactions, tap the lock on the Transactions page and enter this PIN. They lock again when you leave the app.</Text>
      <View className={tw('mt-4', ROW, 'justify-between')}>
        <View><Text className={tw(T.body)}>PIN</Text><Text className="mt-0.5 text-xs text-slate-500">{hasPin ? 'Set' : 'Not set — needed before you can hide a transaction'}</Text></View>
        <Pressable onPress={setup} className="rounded-xl bg-accent-300/20 px-3.5 py-2"><Text className={tw('text-xs font-semibold text-accent-100 light:text-accent-700')}>{hasPin ? 'Change PIN' : 'Set PIN'}</Text></Pressable>
      </View>
      {hasPin && (
        <Text className="mt-3 text-xs text-slate-500">Forgot your PIN? <Text onPress={onSignOut} className={tw('text-accent-300 light:text-accent-700')}>Sign out</Text>, sign back in, then come back here within 10 minutes and <Text onPress={forgot} className={tw('text-accent-300 light:text-accent-700')}>reset it</Text>.</Text>
      )}
      {pinDialog.view}
    </View>
  )
}

function MoneyRulesPanel({ data, refresh }) {
  const [text, setText] = useState('')
  const rules = data.money_rules || []
  const add = async () => {
    if (!text.trim()) return
    try { await api('/finance/money_rules', { method: 'POST', body: { rule_text: text.trim(), order_index: (rules[rules.length - 1]?.order_index ?? 0) + 1, is_active: true } }); setText(''); await refresh() } catch { Alert.alert('Could not add') }
  }
  return (
    <View className="gap-5">
      <View><Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Your compass</Text><Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Money rules</Text></View>
      <View className="flex-row gap-2">
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder="e.g. Save 30% of every paycheck before spending" placeholderTextColor="#64748b" className={tw('flex-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-4 py-3 text-white light:text-slate-900')} />
        <Pressable onPress={add} className="justify-center rounded-xl bg-accent-400 px-5"><Text className="text-sm font-semibold text-[#07101c]">+ Add</Text></Pressable>
      </View>
      {rules.length === 0 ? <View className={tw(CARD, 'p-0')}><EmptyState icon={Star} title="No rules yet" message="Write down your personal money principles. They'll appear on the dashboard as a gentle reminder." /></View> : (
        <View className="gap-2">
          {rules.map((r, i) => (
            <View key={r.id} className={tw('flex-row items-center gap-3 rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] px-4 py-3 glassy:glass-card')}>
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-accent-400/15"><Text className={tw('text-xs font-semibold text-accent-200 light:text-accent-700')}>{i + 1}</Text></View>
              <Text className={tw('flex-1 text-sm', r.is_active ? 'text-white light:text-slate-900' : 'text-slate-500 line-through')}>{capitalizeFirst(r.rule_text)}</Text>
              <Pressable onPress={async () => { await api(`/finance/money_rules/${r.id}`, { method: 'PATCH', body: { is_active: !r.is_active } }).catch(() => {}); await refresh() }} className={tw('rounded-lg px-3 py-1.5', r.is_active ? 'bg-emerald-400/15' : 'bg-white/[.06] light:bg-black/[.04]')}>
                <Text className={tw('text-xs font-medium', r.is_active ? 'text-emerald-200 light:text-emerald-700' : 'text-slate-400 light:text-slate-500')}>{r.is_active ? 'Active' : 'Off'}</Text>
              </Pressable>
              <Pressable onPress={() => Alert.alert(`Delete rule "${r.rule_text}"?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await api(`/finance/money_rules/${r.id}`, { method: 'DELETE' }).catch(() => {}); await refresh() } }])} className="rounded-lg p-1.5"><Icon as={Trash2} size={13} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function KitePanel({ data, refresh }) {
  const { profile } = data
  const [apiKey, setApiKey] = useState(profile?.kite_api_key || '')
  const [apiSecret, setApiSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const redirectUrl = `${WEB_URL.replace('www.', '')}/api/kite/callback`
  const save = async () => { setBusy(true); try { await api('/kite/credentials', { method: 'POST', body: { api_key: apiKey, api_secret: apiSecret } }); setApiSecret(''); await refresh(); Alert.alert('Kite app saved') } catch (e) { Alert.alert('Could not save Kite app', e.message) } finally { setBusy(false) } }
  const remove = async () => { try { await api('/kite/credentials', { method: 'DELETE' }); setApiKey(''); await refresh(); Alert.alert('Kite app disconnected') } catch { Alert.alert('Could not disconnect') } }
  return (
    <View className={tw(CARD)}>
      <View className="mb-1 flex-row flex-wrap items-center justify-between gap-2">
        <Text className={tw(T.title)}>Your own Kite Connect app</Text>
        <Pressable onPress={() => Linking.openURL('https://youtu.be/r88L9AqnNaE?si=Rgx9I3-92aXc1KX_&t=68')} className="rounded-xl border border-[#FF0000]/30 bg-[#FF0000]/10 px-3 py-1.5"><Text className="text-xs font-medium text-[#FF0000]">Watch how-to video</Text></Pressable>
      </View>
      {!profile?.kite_connected && (
        <Pressable onPress={() => Linking.openURL('https://zerodha.com/?c=ZGF543&s=CONSOLE')} className="mb-3 flex-row items-center justify-center gap-2 rounded-xl border border-accent-300/25 bg-accent-400/10 px-4 py-2.5">
          <Text className={tw('text-sm font-medium text-accent-200 light:text-accent-700')}>Don't have a Zerodha account? Create one</Text><Icon as={ExternalLink} size={13} className={tw('text-accent-200 light:text-accent-700')} />
        </Pressable>
      )}
      <Text className={tw('text-sm leading-6 text-slate-400 light:text-slate-600')}>Connecting Kite already works out of the box using the app's default Kite Connect app — you don't need to do anything here unless you want to use your own instead. If you do, register a free app at Zerodha's Kite Connect API page, set its redirect URL to the address below, then paste the API key and secret it gives you.</Text>
      <Text className="mt-3 text-xs text-slate-500">Redirect URL to register with Kite</Text>
      <Text selectable className={tw('mt-1 rounded-xl border border-white/10 light:border-black/10 bg-black/30 light:bg-black/[.06] px-3 py-2.5 text-xs text-accent-200 light:text-accent-700')}>{redirectUrl}</Text>
      <Field label="API key" style={{ marginTop: 16 }}><Input value={apiKey} onChangeText={setApiKey} autoCapitalize="none" /></Field>
      <Field label="API secret"><Input value={apiSecret} onChangeText={setApiSecret} secureTextEntry autoCapitalize="none" placeholder={profile?.kite_api_key ? 'Saved — enter again to change' : ''} /></Field>
      <View className="flex-row gap-2">
        <View className="flex-1"><SubmitButton className="mt-1" label={busy ? 'Saving…' : 'Save Kite app'} busy={busy} disabled={!apiKey || !apiSecret} onPress={save} /></View>
        {profile?.kite_api_key ? <Pressable onPress={remove} className="mt-1 justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 px-4"><Text className={tw('text-sm text-rose-300 light:text-rose-700')}>Remove</Text></Pressable> : null}
      </View>
    </View>
  )
}

function GuidePanel({ onClearAllData }) {
  const [openKey, setOpenKey] = useState(null)
  return (
    <View className="gap-4">
      <View className={tw(CARD)}>
        <Text className={tw(T.title)}>User guide</Text>
        <Text className="mt-1 text-[11px] text-slate-500">What each part of the app does, and how to use it. Tap a section to expand it.</Text>
        <View className="mt-3 gap-2">
          {GUIDE.map((item) => {
            const isOpen = openKey === item.label
            const I = Lucide[item.icon] || BookOpen
            return (
              <View key={item.label} className={tw('overflow-hidden rounded-xl bg-black/20 light:bg-black/[.06]')}>
                <Pressable onPress={() => setOpenKey(isOpen ? null : item.label)} className="flex-row items-center gap-3 px-4 py-3">
                  <Icon as={I} size={16} className={tw('text-accent-300 light:text-accent-700')} />
                  <View className="min-w-0 flex-1"><Text className={tw('text-sm font-medium text-white light:text-slate-900')}>{item.label}</Text>{!isOpen ? <Text numberOfLines={1} className="text-xs text-slate-500">{item.blurb}</Text> : null}</View>
                  <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}><Icon as={ChevronDown} size={15} className="text-slate-500" /></View>
                </Pressable>
                {isOpen && (
                  <View className="px-4 pb-4 pl-[42px]">
                    <Text className={tw('text-xs text-slate-400 light:text-slate-600')}>{item.blurb}</Text>
                    <View className="mt-2 gap-1.5">{item.points.map((p, i) => <View key={i} className="flex-row gap-2"><View className="mt-2 h-1 w-1 rounded-full bg-slate-500" /><Text className={tw('flex-1 text-xs leading-5 text-slate-400 light:text-slate-600')}>{p}</Text></View>)}</View>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </View>
      <View className={tw(CARD)}>
        <View className="flex-row items-center gap-2"><Icon as={ShieldAlert} size={16} className={tw('text-accent-300 light:text-accent-700')} /><Text className={tw(T.title)}>Keeping your data safe</Text></View>
        <Text className={tw('mt-2 text-xs leading-5 text-slate-400 light:text-slate-600')}>We've taken care to keep your data safe — encrypted storage, access limited to what you explicitly share, and role-based permissions on anything shared with someone else. Even so, you're responsible for your own data: keep your login private, only grant access to people you trust, and use CSV exports where available if you want your own backup.</Text>
        <View className={tw('mt-4 border-t border-white/10 light:border-black/10 pt-4')}>
          <Pressable onPress={onClearAllData} className="flex-row items-center gap-2 self-start rounded-xl border border-rose-400/20 bg-rose-400/10 px-3.5 py-2.5"><Icon as={Trash2} size={14} className={tw('text-rose-300 light:text-rose-700')} /><Text className={tw('text-xs font-medium text-rose-300 light:text-rose-700')}>Clear all data</Text></Pressable>
          <Text className="mt-2 text-[11px] leading-5 text-slate-500">Permanently deletes every account, transaction, and record you have across the app. This can't be undone.</Text>
        </View>
      </View>
    </View>
  )
}

function UpdatesPanel() {
  return (
    <View className={tw(CARD)}>
      <View className="flex-row items-center gap-2"><Icon as={Sparkles} size={16} className={tw('text-accent-300 light:text-accent-700')} /><Text className={tw(T.title)}>What's new</Text></View>
      <View className="mt-3 gap-4">
        {CHANGELOG.map((entry) => (
          <View key={entry.date}>
            <Text className="text-[11px] uppercase tracking-widest text-slate-500">{entry.date}</Text>
            <View className="mt-1.5 gap-1.5">{entry.points.map((p, i) => <View key={i} className="flex-row gap-2"><View className="mt-2 h-1 w-1 rounded-full bg-slate-500" /><Text className={tw('flex-1 text-xs leading-5 text-slate-400 light:text-slate-600')}>{p}</Text></View>)}</View>
          </View>
        ))}
      </View>
    </View>
  )
}

export function SettingsView({ data, user, refresh, onSaveProfile, onDeleteAccount, onClearAllData, onSignOut, onHiddenPinChanged, renderVault, section, onSectionChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const props = { data, user, refresh, onSaveProfile, onDeleteAccount, onClearAllData, onSignOut, onHiddenPinChanged }
  const SECTIONS = [
    { key: 'profile', label: 'Profile', icon: User, render: () => <ProfilePanel {...props} /> },
    { key: 'appearance', label: 'Appearance', icon: Palette, render: () => <AppearancePanel {...props} /> },
    { key: 'guardrails', label: 'Guardrails', icon: ShieldAlert, render: () => <GuardrailsPanel {...props} /> },
    { key: 'notifications', label: 'Notifications', icon: Bell, render: () => <NotificationsPanel {...props} /> },
    { key: 'modules', label: 'Modules', icon: LayoutGrid, render: () => <ModulesPanel {...props} /> },
    { key: 'mobile_nav', label: 'Mobile nav', icon: Smartphone, render: () => <MobileNavPanel {...props} /> },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, render: () => <DashboardPanel {...props} /> },
    { key: 'categories', label: 'Categories', icon: Tag, render: () => <CategoriesPanel {...props} /> },
    { key: 'accounts', label: 'Accounts', icon: Landmark, render: () => <AccountsPanel {...props} /> },
    { key: 'vault', label: 'Vault', icon: KeyRound, render: renderVault },
    { key: 'hidden_transactions', label: 'Hidden transactions', icon: Lock, render: () => <HiddenPanel {...props} /> },
    { key: 'money_rules', label: 'Money rules', icon: Star, render: () => <MoneyRulesPanel {...props} /> },
    { key: 'kite', label: 'Kite Connect', icon: Link2, render: () => <KitePanel {...props} /> },
    { key: 'guide', label: 'User guide', icon: BookOpen, render: () => <GuidePanel {...props} /> },
    { key: 'updates', label: 'Updates', icon: RefreshCw, render: () => <UpdatesPanel /> },
  ]
  const active = SECTIONS.find((s) => s.key === section) || SECTIONS[0]
  return (
    <View className="gap-4">
      <View className="flex-row items-start justify-between gap-4">
        <View>
          <Text className={tw('mb-1 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>Your space</Text>
          <Text className={tw('text-2xl font-semibold tracking-tight text-white light:text-slate-900')}>Settings</Text>
        </View>
        <Pressable onPress={onSignOut} className={tw('flex-row items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-3 py-2')}><Icon as={LogOut} size={13} className={tw('text-slate-400 light:text-slate-500')} /><Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Sign out</Text></Pressable>
      </View>
      <Pressable onPress={() => setMenuOpen(true)} className={tw('flex-row items-center gap-2.5 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3.5 py-3')}>
        <Icon as={Menu} size={16} className={tw('text-slate-400 light:text-slate-500')} />
        <Icon as={active.icon} size={16} className={tw('text-accent-300 light:text-accent-700')} />
        <Text className={tw('flex-1 text-sm font-medium text-white light:text-slate-900')}>{active.label}</Text>
      </Pressable>
      {active.render()}
      <BottomSheet open={menuOpen} onOpenChange={setMenuOpen} title="Settings">
        <View className="flex-row flex-wrap gap-3 pb-4">
          {SECTIONS.map((s) => (
            <Pressable key={s.key} onPress={() => { onSectionChange(s.key); setMenuOpen(false) }} style={{ width: '31%' }} className={tw('items-center gap-2 rounded-2xl px-3 py-4', active.key === s.key ? 'bg-accent-400/10' : 'bg-white/[.04] light:bg-black/[.03]')}>
              <Icon as={s.icon} size={20} className={active.key === s.key ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700'} />
              <Text className={tw('text-center text-xs font-medium', active.key === s.key ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700')}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  )
}
