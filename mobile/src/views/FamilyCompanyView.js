import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { Download, Landmark, Link2, Lock, Pencil, RefreshCw, Repeat, Trash2, Unlock, Upload, UserPlus, Users, Wallet } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { HeroStatTile } from '../ui/HeroStatTile'
import { MonthCursor } from '../ui/MonthCursor'
import { DismissibleBanner } from '../ui/DismissibleBanner'
import { AccentGradient } from '../ui/Gradient'
import { BackLink, CARD, EyeButton, HERO, MoreMenu, PageTitle, SelectBar, SelectMark, useSelection } from '../ui/DetailKit'
import { tw } from '../lib/tw'
import { MONTH_NAMES, capitalizeFirst, formatDate, money, todayISO } from '../lib/format'
import { ENTRY_TYPE_STYLE, buildFamilyCompanyExportCsv, canDeleteEntries, canDeleteProfile, canEditProfile, canManageProfileShares, canWriteEntries, categoriesFor, moneyProfileRole, profileTotals } from '../lib/shared'

// Port of features/familyCompany/FamilyCompanyView.jsx + MoneyProfileDetailView.jsx (mobile layout).
export async function exportFamilyCompany(payload, filenameBase) {
  try {
    const slug = String(filenameBase || 'export').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export'
    const name = `${slug}-${todayISO()}.csv`
    const file = new File(Paths.cache, name)
    if (file.exists) file.delete()
    await file.write(buildFamilyCompanyExportCsv(payload))
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: name })
  } catch (e) { Alert.alert('Export failed', e.message) }
}

// ENTRY_TYPE_STYLE is "bg-… text-… light:text-…" — split into the chip and its text.
export function EntryTypeChip({ type }) {
  const cls = (ENTRY_TYPE_STYLE[type] || '').split(' ')
  return (
    <View className={tw('rounded-full px-1.5 py-0.5', cls.filter((c) => c.startsWith('bg-')).join(' '))}>
      <Text className={tw('text-[9px] font-semibold uppercase tracking-widest', cls.filter((c) => !c.startsWith('bg-')).join(' '))}>{type}</Text>
    </View>
  )
}

function LinkedPill({ small }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-accent-400/15 px-1.5 py-0.5">
      <Icon as={Link2} size={small ? 9 : 10} className={tw('text-accent-200 light:text-accent-700')} />
      <Text className={tw(small ? 'text-[9px]' : 'text-[10px]', 'font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700')}>Linked</Text>
    </View>
  )
}
function ClosedPill({ small }) {
  return <View className="rounded-full bg-slate-500/20 px-1.5 py-0.5"><Text className={tw(small ? 'text-[9px]' : 'text-[10px]', 'font-semibold uppercase tracking-widest text-slate-300 light:text-slate-700')}>Closed</Text></View>
}

export function FamilyCompanyView({ data, onAddProfile, onEditProfile, onDeleteProfile, onAddEntry, onEditEntry, onDeleteEntryBulk, onBulkImport, onToggleStatus, onManageAccess, onSyncBalance, onOpenRecurring, onDetailChange, showMoney, onToggleMoney }) {
  const { money_profiles: profiles = [], money_profile_entries: entries = [], accounts = [], credit_cards: creditCards = [], categories = [], transactions = [] } = data
  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)
  useEffect(() => { onDetailChange?.(selectedProfile ? selectedProfileId : null) }, [selectedProfileId, !!selectedProfile])

  if (selectedProfile) {
    return (
      <MoneyProfileDetailView profile={selectedProfile} entries={entries.filter((e) => e.profile_id === selectedProfile.id)} accounts={accounts} creditCards={creditCards} transactions={transactions}
        categories={categoriesFor(selectedProfile, categories)} onBack={() => setSelectedProfileId(null)} onEdit={onEditProfile} onDelete={(p) => onDeleteProfile(p, () => setSelectedProfileId(null))}
        onAddEntry={onAddEntry} onEditEntry={onEditEntry} onDeleteEntryBulk={onDeleteEntryBulk} onBulkImport={onBulkImport} onToggleStatus={onToggleStatus}
        onManageAccess={onManageAccess} onSyncBalance={onSyncBalance} onOpenRecurring={onOpenRecurring} showMoney={showMoney} onToggleMoney={onToggleMoney} />
    )
  }

  const totalBalance = profiles.reduce((s, p) => s + profileTotals(p, entries.filter((e) => e.profile_id === p.id)).balance, 0)

  return (
    <View className="gap-5 pb-8">
      <PageTitle eyebrow="Managed on their behalf" title="Family / Company" />
      <View className="flex-row gap-2">
        <Pressable disabled={profiles.length === 0} onPress={() => exportFamilyCompany({ profiles, entries, categories }, 'family-company')}
          className={tw('flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5', profiles.length === 0 && 'opacity-50')}>
          <Icon as={Upload} size={14} className={tw('text-slate-300 light:text-slate-700')} />
          <Text className={tw('text-sm font-medium text-slate-300 light:text-slate-700')}>Export</Text>
        </Pressable>
        <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
      </View>

      {profiles.length > 0 && (
        <View className={tw(HERO)}>
          <Text className="text-xs uppercase tracking-widest text-slate-500">Total held for others</Text>
          <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(totalBalance) : '••••••'}</Text>
          <Text className="mt-1 text-sm text-slate-500">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</Text>
        </View>
      )}

      {profiles.length === 0 ? (
        <View className={tw(CARD)}><EmptyState icon={Users} title="No profiles yet" message="Create a profile for your family or a company you manage money for — link it to a bank account if you want its entries to reflect in your Transactions module too." cta="New profile" onCta={onAddProfile} /></View>
      ) : (
        <View className="gap-4">
          {profiles.map((p) => {
            const pEntries = entries.filter((e) => e.profile_id === p.id)
            const { income, expense, balance } = profileTotals(p, pEntries)
            const isClosed = p.status === 'closed'
            return (
              <Pressable key={p.id} onPress={() => setSelectedProfileId(p.id)}
                className={tw('rounded-2xl border p-5 active:opacity-80', isClosed ? 'border-white/5 light:border-black/5 bg-white/[.02] light:bg-black/[.02]' : 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card')}>
                <View className="flex-row items-center gap-3">
                  <View className={tw('h-11 w-11 items-center justify-center rounded-2xl', isClosed ? 'bg-slate-500/15' : 'bg-accent-400/15')}>
                    <Icon as={Users} size={18} className={isClosed ? 'text-slate-400 light:text-slate-500' : 'text-accent-200 light:text-accent-700'} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text numberOfLines={1} className={tw('flex-shrink text-sm font-semibold text-white light:text-slate-900')}>{p.name}</Text>
                      {p.linked_account_id ? <LinkedPill small /> : null}
                      {isClosed ? <ClosedPill small /> : null}
                    </View>
                    <Text className="text-xs capitalize text-slate-500">{p.profile_type} · {pEntries.length > 0 ? `${pEntries.length} entr${pEntries.length === 1 ? 'y' : 'ies'}` : 'empty'}</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row items-end justify-between">
                  <View>
                    <Text className="text-xs text-slate-500">Balance</Text>
                    <Text className={tw('text-xl font-semibold', isClosed ? 'text-slate-300 light:text-slate-700' : 'text-white light:text-slate-900')}>{showMoney ? money(balance) : '••••'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={tw('text-xs opacity-70', isClosed ? 'text-slate-500' : 'text-emerald-300 light:text-emerald-700')}>Income</Text>
                    <Text className={tw('text-sm font-semibold', isClosed ? 'text-slate-500' : 'text-emerald-300 light:text-emerald-700')}>{showMoney ? `+${money(income)}` : '••••'}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-[11px] text-slate-500">Expenses {showMoney ? money(expense) : '••••'}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

function MoneyProfileDetailView({ profile, entries, accounts, creditCards, categories, transactions, onBack, onEdit, onDelete, onAddEntry, onEditEntry, onDeleteEntryBulk, onBulkImport, onToggleStatus, onManageAccess, onSyncBalance, onOpenRecurring, showMoney, onToggleMoney }) {
  const role = moneyProfileRole(profile)
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const { opening, income, expense, balance } = profileTotals(profile, entries)
  const now = new Date()
  const thisMonth = entries.filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
  const thisMonthIncome = thisMonth.reduce((s, e) => s + (e.entry_type === 'income' ? Number(e.amount) : 0), 0)
  const thisMonthExpense = thisMonth.reduce((s, e) => s + (e.entry_type === 'expense' ? Number(e.amount) : 0), 0)
  const linkedAccount = accounts.find((a) => a.id === profile.linked_account_id)
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const isClosed = profile.status === 'closed'
  const [monthCursor, setMonthCursor] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }))
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthEntries = showAllMonths ? sorted : sorted.filter((e) => { const d = new Date(e.date); return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month })
  const sel = useSelection()
  const categoryById = (id) => categories.find((c) => c.id === id)
  const exportThisProfile = () => exportFamilyCompany({ profiles: [profile], entries: monthEntries, categories }, showAllMonths ? profile.name : `${profile.name} ${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`)
  const writable = canWriteEntries(role)

  return (
    <View className="gap-5 pb-8">
      <BackLink label="Back to Family / Company" onPress={onBack} />
      <View className="z-20 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/15"><Icon as={Users} size={22} className={tw('text-accent-200 light:text-accent-700')} /></View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className={tw('text-lg font-semibold text-white light:text-slate-900')}>{profile.name}</Text>
              {linkedAccount ? <LinkedPill /> : null}
              {isClosed ? <ClosedPill /> : null}
            </View>
            <Text className="text-xs capitalize text-slate-500">{profile.profile_type} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <EyeButton showMoney={showMoney} onToggle={onToggleMoney} />
          <MoreMenu width={224} items={[
            { icon: RefreshCw, label: 'Sync', onPress: () => setSyncOpen((o) => !o), hidden: !writable || isClosed },
            { icon: Repeat, label: 'Recurring entries', onPress: () => onOpenRecurring(profile), hidden: !writable || isClosed },
            { icon: Download, label: 'Bulk import', onPress: () => onBulkImport(profile), hidden: !writable || isClosed },
            { icon: Upload, label: 'Export', onPress: exportThisProfile, hidden: monthEntries.length === 0 },
            { icon: UserPlus, label: 'Manage access', onPress: () => onManageAccess(profile), hidden: !canManageProfileShares(role) },
            { icon: isClosed ? Unlock : Lock, label: isClosed ? 'Reactivate profile' : 'Close profile', onPress: () => onToggleStatus(profile), hidden: !canEditProfile(role) },
            { icon: Pencil, label: 'Edit profile', onPress: () => onEdit(profile), hidden: !canEditProfile(role) },
            { icon: Trash2, label: 'Delete profile', onPress: () => onDelete(profile), danger: true, hidden: !canDeleteProfile(role) },
          ]} />
        </View>
      </View>

      {syncOpen && (
        <View className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <Text className={tw('text-sm text-slate-300 light:text-slate-700')}>Sync with the real balance</Text>
          <Text className="mt-1 text-[11px] text-slate-500">If the real balance (a bank statement, or however you're tracking this outside the app) shows a different number, enter it here and it'll be reconciled with a labeled entry — no need to hunt for what's missing.</Text>
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <TextInput keyboardType="numbers-and-punctuation" value={syncValue} onChangeText={setSyncValue} placeholder={String(Math.round(balance))} placeholderTextColor="#64748b" className={tw('w-40 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2 text-sm text-white light:text-slate-900')} />
            <Pressable disabled={syncBusy || !syncValue} onPress={async () => { setSyncBusy(true); await onSyncBalance(profile, Number(syncValue)); setSyncBusy(false); setSyncOpen(false); setSyncValue('') }} className={tw((syncBusy || !syncValue) && 'opacity-50')}>
              <AccentGradient dir="r" style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}><Text className="text-sm font-semibold text-[#07101c]">{syncBusy ? 'Syncing…' : 'Sync'}</Text></AccentGradient>
            </Pressable>
            {syncValue ? <Text className="text-[11px] text-slate-500">{Number(syncValue) < balance ? `${money(balance - Number(syncValue))} lower than tracked` : Number(syncValue) > balance ? `${money(Number(syncValue) - balance)} higher than tracked` : 'Matches already'}</Text> : null}
          </View>
        </View>
      )}

      <DismissibleBanner id={`money-profile-linked-${profile.id}-${linkedAccount?.id || 'none'}`} tone="cyan">
        {linkedAccount
          ? <Text className={tw('text-xs leading-5 text-accent-200 light:text-accent-700')}>Linked to <Text className="font-bold">{linkedAccount.name}</Text> — every entry here also posts as a transaction on that account and counts toward your net worth.</Text>
          : 'Not linked to a bank account — entries here stay only in this module and never affect your other totals.'}
      </DismissibleBanner>

      {linkedAccount && (
        <View className={tw(CARD, 'flex-row items-center gap-4 p-5')}>
          <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${linkedAccount.color || '#22d3ee'}22` }}>
            {linkedAccount.type === 'cash' ? <Wallet size={20} color={linkedAccount.color || '#22d3ee'} /> : <Landmark size={20} color={linkedAccount.color || '#22d3ee'} />}
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className={tw('text-sm font-semibold text-white light:text-slate-900')}>{linkedAccount.name}</Text>
            <Text numberOfLines={1} className="text-xs capitalize text-slate-500">{linkedAccount.type.replace('_', ' ')}{linkedAccount.bank_name ? ` · ${linkedAccount.bank_name}` : ''}{linkedAccount.account_number_last4 ? ` · •${linkedAccount.account_number_last4}` : ''}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-slate-500">Account balance</Text>
            <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{showMoney ? money(linkedAccount.current_balance) : '••••'}</Text>
          </View>
        </View>
      )}

      {isClosed && (
        <DismissibleBanner id={`money-profile-closed-${profile.id}`} tone="amber">This profile is closed — no new entries can be added until you reactivate it. Existing entries are still visible and editable.</DismissibleBanner>
      )}

      <View className={tw(HERO)}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">Current balance</Text>
        <Text className={tw('mt-1 text-[32px] font-semibold leading-[36px] text-white light:text-slate-900')}>{showMoney ? money(balance) : '••••••'}</Text>
        <Text className="mt-1 text-sm text-slate-500">Opening {showMoney ? money(opening) : '••••'}</Text>
        <View className="mt-5 gap-3">
          <View className="flex-row gap-3">
            <HeroStatTile label="Total income" value={showMoney ? money(income) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
            <HeroStatTile label="Total expense" value={showMoney ? money(expense) : '••••'} valueTone="text-rose-300 light:text-rose-700" />
          </View>
          <View className="flex-row gap-3">
            <HeroStatTile label="This month income" value={showMoney ? money(thisMonthIncome) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
            <HeroStatTile label="This month expense" value={showMoney ? money(thisMonthExpense) : '••••'} valueTone="text-rose-300 light:text-rose-700" />
          </View>
        </View>
      </View>

      <View className={tw(CARD)}>
        {sel.selectMode ? (
          <SelectBar count={sel.selectedIds.size} onCancel={sel.exit} onDelete={async () => { if (await onDeleteEntryBulk([...sel.selectedIds])) sel.exit() }} />
        ) : (
          <View className={tw('flex-row items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
            <Text className="text-xs uppercase tracking-widest text-slate-500">Entries · {monthEntries.length}</Text>
            <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
          </View>
        )}
        {monthEntries.length === 0 ? (
          <EmptyState compact icon={Wallet} title={entries.length === 0 || showAllMonths ? 'No entries yet' : 'No entries this month'} message="Log an income, capital, or expense entry to start tracking." cta={isClosed ? undefined : 'Add entry'} onCta={isClosed ? undefined : () => onAddEntry(profile.id)} />
        ) : monthEntries.map((e, i) => {
          const cat = categoryById(e.category_id)
          const isExpense = e.entry_type === 'expense'
          return (
            <Pressable key={e.id} onPress={() => (sel.selectMode ? sel.toggle(e.id) : writable && onEditEntry(e))} onLongPress={() => canDeleteEntries(role) && sel.start(e.id)} delayLongPress={500}
              className={tw('flex-row items-center gap-3 px-5 py-3', i > 0 && 'border-t border-white/5 light:border-black/5')}>
              {sel.selectMode ? <SelectMark selected={sel.selectedIds.has(e.id)} /> : <EntryTypeChip type={e.entry_type} />}
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{capitalizeFirst(e.description)}</Text>
                <Text numberOfLines={1} className="text-[11px] text-slate-500">{formatDate(e.date)}{cat ? ` · ${cat.name}` : ''}{e.paid_party ? ` · ${capitalizeFirst(e.paid_party)}` : ''}</Text>
              </View>
              <Text className={tw('text-sm font-semibold', isExpense ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700')}>{showMoney ? `${isExpense ? '−' : '+'}${money(e.amount)}` : '••••'}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
