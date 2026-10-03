'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, CheckCheck, Coins, CreditCard, Inbox, Landmark, Mail, RefreshCw, Repeat, Target, UserPlus, Users } from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { useIsMobile } from '@/hooks/use-mobile'
import { relativeTime } from '@/lib/format'

const TYPE_ICON = {
  card_due: CreditCard, loan_due: Landmark, chit_fund_due: Coins, budget_overspend: Target,
  recurring_generated: Repeat, recurring_money_profile_generated: Repeat,
  pending_review_digest: Inbox, sms_detected: Inbox, app_update: RefreshCw,
  share_invite: UserPlus, share_accepted: Users, report_ready: Mail,
}

function NotificationList({ items, loaded, onOpenItem }) {
  if (loaded && items.length === 0) {
    return <EmptyState compact icon={Bell} title="You're all caught up" message="Reminders, detected transactions and invites will show up here." />
  }
  return (
    <ul className="space-y-1">
      {items.map((n) => {
        const Icon = TYPE_ICON[n.type] || Bell
        const unread = !n.read_at
        return (
          <li key={n.id}>
            <button type="button" onClick={() => onOpenItem(n)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 hover:light:bg-black/[.04] ${unread ? 'bg-accent-400/[.06]' : ''}`}>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.06] light:bg-black/[.05] text-slate-300 light:text-slate-600"><Icon size={15} /></div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${unread ? 'font-semibold text-white light:text-slate-900' : 'text-slate-300 light:text-slate-700'}`}>{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs leading-5 text-slate-400 light:text-slate-500">{n.body}</div>}
                <div className="mt-1 text-[11px] text-slate-500">{relativeTime(n.created_at)}</div>
              </div>
              {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-300" aria-label="Unread" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// `state` comes from useNotifications(), called once in the app shell and shared by every bell.
// `align` picks which edge of the bell the desktop dropdown lines up with.
export function NotificationBell({ state, onNavigate, align = 'right', className = '' }) {
  const { items, unread, loaded, reload, markRead, markAllRead } = state
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()
  const ref = useRef(null)
  const panelRef = useRef(null)
  // Desktop dropdown is portaled and fixed-positioned under the bell: the sidebar it sits in
  // scrolls (overflow-y-auto), which would otherwise clip anything wider than the sidebar.
  const [pos, setPos] = useState(null)
  const PANEL_W = 384

  useEffect(() => { if (open) reload() }, [open, reload])
  useEffect(() => {
    if (!open || isMobile || !ref.current) return
    const place = () => {
      const r = ref.current.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const wanted = align === 'left' ? r.left : r.right - PANEL_W
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(wanted, vw - PANEL_W - 8)) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, isMobile, align])
  useEffect(() => {
    if (!open || isMobile) return
    const onDocClick = (e) => { if (!ref.current?.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [open, isMobile])

  const openItem = (n) => {
    markRead(n.id)
    setOpen(false)
    if (n.link) window.location.assign(n.link)
    else if (n.view) onNavigate(n.view)
  }

  const markAllButton = unread > 0 && (
    <button type="button" onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-medium text-accent-300 light:text-accent-700 hover:underline">
      <CheckCheck size={14} />Mark all as read
    </button>
  )
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        title="Notifications"
        aria-expanded={open}
        className={`relative rounded-xl border p-2.5 transition ${open ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[#080b12] light:ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isMobile ? (
        <BottomSheet open={open} onOpenChange={setOpen} title="Notifications">
          {markAllButton && <div className="-mt-1 mb-2 flex justify-end">{markAllButton}</div>}
          <NotificationList items={items} loaded={loaded} onOpenItem={openItem} />
        </BottomSheet>
      ) : open && pos && createPortal(
        <div ref={panelRef} role="dialog" aria-label="Notifications" style={{ top: pos.top, left: pos.left, width: PANEL_W }} className="fixed z-50 rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
            <span className="text-sm font-semibold text-white light:text-slate-900">Notifications</span>
            {markAllButton}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <NotificationList items={items} loaded={loaded} onOpenItem={openItem} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
