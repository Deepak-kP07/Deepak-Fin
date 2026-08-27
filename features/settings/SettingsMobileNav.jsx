'use client'

import { useState } from 'react'
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import { BatteryFull, Lock, MoreHorizontal, Signal, Wifi } from 'lucide-react'
import { resolveModuleSettings, orderedEnabledKeys, resolveMobileNavSlots, resolveQuickActionSlots } from '@/lib/moduleSettings'
import { NAV_META, MOBILE_MANDATORY_META, ADD_ACTION_META } from '@/lib/navMeta'

// Home always occupies one of the 3 bottom-nav slots — it can be dragged to a different position
// among them, but never displaced out to the pool the way every other destination can be.
const LOCKED_KEYS = ['dashboard']

// context 'slot': rendered inside the phone mockup, matching the real production component pixel
// for pixel (no border/box — just icon + label, exactly like app/page.js's actual bottom nav and
// net-worth quick-action buttons) so the preview is a true "what you'll actually see" mirror.
// context 'pool': rendered in the single "Available" picker grid below the phone — a bordered
// chip card, since that's a settings-picker list, not a preview of real UI.
function Chip({ id, item, dragging, kind, context }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id })
  const Icon = item.icon
  const locked = LOCKED_KEYS.includes(item.key)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 } : undefined

  if (context === 'slot' && kind === 'nav') {
    return (
      <button ref={setNodeRef} style={style} {...listeners} {...attributes} className={`relative flex min-w-0 touch-none flex-col items-center gap-0.5 py-1.5 text-slate-300 light:text-slate-600 transition ${dragging ? 'opacity-40' : ''}`}>
        {locked && <Lock size={7} className="absolute right-2 top-0.5 text-slate-500" />}
        <Icon size={15} />
        <span className="max-w-full truncate text-[8px] leading-tight">{item.label}</span>
      </button>
    )
  }
  if (context === 'slot' && kind === 'action') {
    return (
      <button ref={setNodeRef} style={style} {...listeners} {...attributes} className={`flex min-w-0 touch-none flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] text-slate-300 light:text-slate-600 transition ${dragging ? 'opacity-40' : 'hover:bg-white/[.06]'}`}>
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${item.key === 'add' ? 'bg-accent-400/20 text-accent-200 light:text-accent-700' : 'bg-white/[.08] light:bg-black/[.05] text-slate-200'}`}><Icon size={13} /></div>
        <span className="max-w-full truncate">{item.label}</span>
      </button>
    )
  }
  // context === 'pool' — the settings-picker chip card, same look regardless of kind.
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex touch-none flex-col items-center gap-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-center transition ${dragging ? 'opacity-40' : 'hover:bg-white/[.07] light:hover:bg-black/[.05]'}`}
    >
      <Icon size={16} className="text-accent-300 light:text-accent-700" />
      <span className="text-[10px] leading-tight text-slate-300 light:text-slate-700">{item.label}</span>
    </button>
  )
}

function Slot({ id, item, activeId, kind }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`min-w-0 rounded-lg transition ${isOver ? 'bg-accent-400/15 ring-1 ring-accent-300/50' : ''}`}>
      {item ? <Chip id={id} item={item} dragging={activeId === id} kind={kind} context="slot" /> : null}
    </div>
  )
}

export function SettingsMobileNav({ data, onSaveProfile }) {
  const [activeId, setActiveId] = useState(null)
  const moduleSettings = resolveModuleSettings(data.profile)
  const enabledOptional = orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k])

  const navDestinations = [MOBILE_MANDATORY_META.dashboard, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts, ...enabledOptional]
  const navSlots = resolveMobileNavSlots(data.profile, navDestinations.map((d) => d.key))

  const actionDestinations = [ADD_ACTION_META, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts, ...enabledOptional]
  const actionSlots = resolveQuickActionSlots(data.profile, actionDestinations.map((d) => d.key))

  // One merged registry so a destination that's valid for both areas (e.g. Accounts) shows up
  // once, not twice — each entry remembers which slot group(s) it's allowed to be dropped into.
  const registry = {}
  navDestinations.forEach((d) => { registry[d.key] = { ...(registry[d.key] || d), contexts: [...(registry[d.key]?.contexts || []), 'nav'] } })
  actionDestinations.forEach((d) => { registry[d.key] = { ...(registry[d.key] || d), contexts: [...(registry[d.key]?.contexts || []), 'action'] } })

  const findNavItem = (key) => registry[key]
  const findActionItem = (key) => registry[key]
  const placed = new Set([...navSlots, ...actionSlots])
  const pool = Object.values(registry).filter((d) => !placed.has(d.key))

  const save = (nextNav, nextAction) => onSaveProfile({ mobile_nav_settings: { slots: nextNav, quick_actions: nextAction } })

  const parseSlotId = (id) => {
    const navMatch = /^nav-slot-(\d)$/.exec(id)
    if (navMatch) return { group: 'nav', index: Number(navMatch[1]) }
    const qaMatch = /^qa-slot-(\d)$/.exec(id)
    if (qaMatch) return { group: 'action', index: Number(qaMatch[1]) }
    return null
  }

  const onDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const target = parseSlotId(over.id)
    if (!target) return
    const source = parseSlotId(active.id)

    let nextNav = [...navSlots]
    let nextAction = [...actionSlots]
    const slotsFor = (group) => (group === 'nav' ? nextNav : nextAction)

    if (source) {
      if (source.group === target.group && source.index === target.index) return
      const sourceArr = slotsFor(source.group)
      const targetArr = slotsFor(target.group)
      const sourceKey = sourceArr[source.index]
      const targetKey = targetArr[target.index]
      if (source.group !== target.group) {
        // Cross-group move: each key must actually be valid in the group it's moving into.
        if (!registry[targetKey]?.contexts.includes(source.group)) return
        if (!registry[sourceKey]?.contexts.includes(target.group)) return
      }
      sourceArr[source.index] = targetKey
      targetArr[target.index] = sourceKey
    } else {
      // Dragging a pool item onto a slot.
      const draggedKey = String(active.id).replace('pool-', '')
      if (!registry[draggedKey]?.contexts.includes(target.group)) return
      const targetArr = slotsFor(target.group)
      const displacedKey = targetArr[target.index]
      if (displacedKey === draggedKey) return
      if (LOCKED_KEYS.includes(displacedKey)) return
      targetArr[target.index] = draggedKey
    }
    save(nextNav, nextAction)
  }

  const navSlotEls = navSlots.map((key, i) => <Slot key={i} id={`nav-slot-${i}`} item={findNavItem(key)} activeId={activeId} kind="nav" />)
  const actionSlotEls = actionSlots.map((key, i) => <Slot key={i} id={`qa-slot-${i}`} item={findActionItem(key)} activeId={activeId} kind="action" />)

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Mobile nav</div>
      <div className="mt-1 text-[11px] text-slate-500">
        This is your phone screen. Drag anything from "Available" onto a highlighted spot, or drag two spots onto each other to swap them. Home always stays in the bottom nav, but you can move it to any of the 3 positions.
      </div>

      <DndContext onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        {/* One phone mockup — net worth card + quick actions up top, bottom nav down below,
            exactly as they're stacked in the real app. */}
        <div className="relative mx-auto mt-5 w-full max-w-[280px]">
          <div className="absolute -left-[2px] top-24 h-7 w-[3px] rounded-l-sm bg-white/15 light:bg-black/15" />
          <div className="absolute -left-[2px] top-36 h-11 w-[3px] rounded-l-sm bg-white/15 light:bg-black/15" />
          <div className="absolute -right-[2px] top-28 h-14 w-[3px] rounded-r-sm bg-white/15 light:bg-black/15" />
          <div className="rounded-[2.5rem] border border-white/15 light:border-black/15 bg-gradient-to-b from-white/[.05] to-transparent p-2 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.65)]">
            <div className="relative overflow-hidden rounded-[2.1rem] bg-[#080b12] light:bg-[#eef1f6]">
              <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />

              <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[9px] font-medium text-slate-300 light:text-slate-600">
                <span>9:41</span>
                <div className="flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={12} /></div>
              </div>

              <div className="px-4 pt-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Net worth</div>
                <div className="mt-1 text-2xl font-semibold text-white light:text-slate-900">₹••,••,•••</div>
                <div className="mt-4 grid grid-cols-3">{actionSlotEls}</div>
              </div>

              <div className="mt-5 space-y-2 px-4">
                <div className="h-3 w-2/3 rounded-full bg-white/[.05] light:bg-black/[.04]" />
                <div className="h-14 rounded-2xl bg-white/[.04] light:bg-black/[.03]" />
              </div>
              <div className="h-6" />

              <div className="border-t border-white/10 light:border-black/10 bg-black/40 light:bg-white/70 px-1 backdrop-blur">
                <div className="grid grid-cols-4">
                  {navSlotEls}
                  <div className="flex flex-col items-center gap-0.5 py-1.5 text-slate-500">
                    <MoreHorizontal size={15} />
                    <span className="text-[8px] leading-tight">More</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center pb-2 pt-1.5">
                <div className="h-1 w-24 rounded-full bg-white/25 light:bg-black/20" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs text-slate-500">Available</div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pool.map((item) => (
              <Chip key={item.key} id={`pool-${item.key}`} item={item} dragging={activeId === `pool-${item.key}`} context="pool" />
            ))}
            {pool.length === 0 && <div className="col-span-full text-xs text-slate-600">Everything's already placed.</div>}
          </div>
        </div>
      </DndContext>
    </div>
  )
}
