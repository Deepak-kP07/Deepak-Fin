'use client'

import { useEffect, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { MODULE_KEYS, resolveModuleSettings } from '@/lib/moduleSettings'

const MODULE_INFO = {
  credit_cards: { label: 'Credit cards', description: 'Track cards, spends, and bill payments.' },
  investments: { label: 'Investments', description: 'Portfolios, holdings, SIPs, and other assets.' },
  loans: { label: 'Loans', description: 'EMIs, prepayments, and amortization.' },
  family_company: { label: 'Family / Company', description: 'Income, capital, and expenses for a family or company profile.' },
  lend_borrow: { label: 'Lend / Borrow', description: "Money you've lent or borrowed with people." },
  scholarships: { label: 'Scholarships', description: 'Scholarship batches received and payments made to college.' },
  budgets: { label: 'Budgets', description: 'Monthly plans, category breakdowns, and yearly budgets.' },
  bucket_list: { label: 'Bucket list', description: "The 30-day rule for things you're tempted to buy." },
  insights: { label: 'Insights', description: 'Charts and trends across your finances.' },
  pending_sms: { label: 'Pending', description: 'SMS-detected transactions awaiting your approval (Android app only).' },
}

function SortableModuleRow({ id, label, description, enabled, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3 ${isDragging ? 'opacity-60' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="shrink-0 touch-none rounded p-1 text-slate-500 hover:text-white hover:light:text-slate-900 active:cursor-grabbing" title="Drag to reorder"><GripVertical size={16} /></button>
      <div className="flex-1">
        <div className="text-sm text-white light:text-slate-900">{label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
      </div>
      <ToggleSwitch checked={enabled} onChange={onToggle} />
    </div>
  )
}

export function SettingsModules({ data, onSaveProfile }) {
  const resolved = resolveModuleSettings(data.profile)
  const savedOrder = [...MODULE_KEYS].sort((a, b) => resolved[a].order - resolved[b].order)
  // A drag reorder waits on a PATCH round-trip before `data.profile` (and so `savedOrder`) updates,
  // which without this would make the row snap back to its old spot and only jump to the new one
  // once the network call resolves. Rendering this local copy instead makes the drop feel instant;
  // it's cleared once the server's own order catches up and matches, so it can never go stale.
  const [localOrder, setLocalOrder] = useState(null)
  useEffect(() => { setLocalOrder(null) }, [data.profile?.module_settings])
  const orderedKeys = localOrder || savedOrder

  const save = (next) => onSaveProfile({ module_settings: next })
  const toggle = (key) => save({ ...resolved, [key]: { ...resolved[key], enabled: !resolved[key].enabled } })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const reordered = arrayMove(orderedKeys, orderedKeys.indexOf(active.id), orderedKeys.indexOf(over.id))
    setLocalOrder(reordered)
    const next = { ...resolved }
    reordered.forEach((key, i) => { next[key] = { ...resolved[key], order: i } })
    save(next)
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Modules</div>
      <div className="text-xs text-slate-500">Turn modules on or off, and drag to reorder them in the sidebar. Dashboard, Transactions, and Accounts are always on and always come first.</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedKeys} strategy={verticalListSortingStrategy}>
          <div className="mt-3 space-y-2">
            {orderedKeys.map((key) => (
              <SortableModuleRow key={key} id={key} label={MODULE_INFO[key]?.label || key} description={MODULE_INFO[key]?.description} enabled={resolved[key].enabled} onToggle={() => toggle(key)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
