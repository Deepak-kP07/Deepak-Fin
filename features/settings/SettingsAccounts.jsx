'use client'

import { useEffect, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Landmark } from 'lucide-react'

function SortableAccountRow({ account }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-3 py-2 ${isDragging ? 'opacity-60' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="shrink-0 touch-none rounded p-1 text-slate-500 hover:text-white hover:light:text-slate-900 active:cursor-grabbing" title="Drag to reorder"><GripVertical size={16} /></button>
      <Landmark size={14} className="text-slate-500" />
      <span className="text-sm text-white light:text-slate-900">{account.name}</span>
      <span className="text-xs capitalize text-slate-500">{account.type.replace('_', ' ')}</span>
    </div>
  )
}

export function SettingsAccounts({ data, onReorderAccounts }) {
  const savedAccounts = [...data.accounts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  // A drag reorder waits on a PATCH round-trip before `data.accounts` (and so savedAccounts)
  // updates, which without this would make the row snap back to its old spot and only jump to
  // the new one once the network call resolves. Rendering this local copy instead makes the drop
  // feel instant; it's cleared once the server's own order catches up, so it can't go stale.
  const [localAccounts, setLocalAccounts] = useState(null)
  useEffect(() => { setLocalAccounts(null) }, [data.accounts])
  const accounts = localAccounts || savedAccounts

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const ids = accounts.map((a) => a.id)
    const reordered = arrayMove(accounts, ids.indexOf(active.id), ids.indexOf(over.id))
    setLocalAccounts(reordered)
    onReorderAccounts(reordered)
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="text-sm font-semibold text-white light:text-slate-900">Accounts</div>
      <div className="text-xs text-slate-500">Drag to reorder how accounts appear in every dropdown across the app.</div>
      {accounts.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">No accounts yet</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={accounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-3 space-y-1.5">
              {accounts.map((a) => <SortableAccountRow key={a.id} account={a} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
