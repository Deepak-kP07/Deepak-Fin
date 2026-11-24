import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown, Tag } from 'lucide-react-native'
import { Icon } from './Icon'
import { tw } from '../lib/tw'
import { getCategoryIcon } from '../lib/categoryIcons'

// Port of components/shared/CategorySelect.jsx: categories run long, so they open as a grid of
// colour-coded tiles (icon + name) instead of a single scrolling list. The same picker is used by
// every form that takes a category — transactions, card spends, recurring rules, Family/Company —
// so choosing one looks identical everywhere.
const BASE = 'w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-2.5 glassy:glass-pill'

export function CategoryTile({ category, size = 26 }) {
  const color = category?.color || '#94a3b8'
  const I = category ? getCategoryIcon(category.name) : Tag
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}33`, alignItems: 'center', justifyContent: 'center' }}>
      <I size={Math.round(size * 0.54)} color={color} />
    </View>
  )
}

export function CategorySelect({ value, onChange, categories = [], placeholder = 'Uncategorised', title = 'Category', className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const insets = useSafeAreaInsets()
  const selected = categories.find((c) => String(c.id) === String(value ?? ''))
  const q = query.trim().toLowerCase()
  const shown = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories
  const pick = (id) => { onChange(id); setOpen(false) }
  return (
    <>
      <Pressable onPress={() => { setQuery(''); setOpen(true) }} className={tw(className || BASE, 'flex-row items-center gap-2.5 active:opacity-70')}>
        <CategoryTile category={selected} />
        <Text numberOfLines={1} className={tw('flex-1 text-sm', selected ? 'text-white light:text-slate-900' : 'text-slate-500')}>{selected ? selected.name : placeholder}</Text>
        <Icon as={ChevronDown} size={15} className="text-slate-500" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View className="flex-1 justify-end">
          <Pressable onPress={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <View className={tw('rounded-t-3xl border-t border-white/10 light:border-black/10 bg-[#141a28] light:bg-white px-4 pt-3 glassy:glass-card')} style={{ maxHeight: '75%', paddingBottom: insets.bottom + 12 }}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/20" />
            <Text className={tw('pb-3 text-base font-semibold text-white light:text-slate-900')}>{title}</Text>
            {categories.length > 9 && (
              <TextInput value={query} onChangeText={setQuery} placeholder="Search categories" placeholderTextColor="#64748b"
                className={tw('mb-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-sm text-white light:text-slate-900')} />
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                {!q && <GridItem label={placeholder} active={!selected} onPress={() => pick('')} />}
                {shown.map((c) => <GridItem key={c.id} category={c} label={c.name} active={String(c.id) === String(value)} onPress={() => pick(c.id)} />)}
              </View>
              {!shown.length && <Text className="px-1 py-4 text-sm text-slate-500">No matches</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

function GridItem({ category, label, active, onPress }) {
  return (
    <View style={{ width: '33.333%', padding: 4 }}>
      <Pressable onPress={onPress} className={tw('items-center rounded-2xl border px-1.5 py-3 active:opacity-70', active ? 'border-accent-300/50 bg-accent-400/15' : 'border-white/[.06] light:border-black/[.06] bg-white/[.03] light:bg-black/[.02]')}>
        <CategoryTile category={category} size={34} />
        <Text numberOfLines={1} className={tw('mt-2 text-xs font-medium', active ? 'text-accent-200 light:text-accent-700' : 'text-slate-300 light:text-slate-700')}>{label}</Text>
        {active ? <View className="absolute right-1.5 top-1.5"><Icon as={Check} size={12} className="text-accent-200 light:text-accent-700" /></View> : null}
      </Pressable>
    </View>
  )
}
