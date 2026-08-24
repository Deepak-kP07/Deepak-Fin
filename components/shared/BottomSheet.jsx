'use client'

import { Drawer } from 'vaul'
import { X } from 'lucide-react'

// The shared sheet shell for mobile — content that's a centered modal on desktop drops in from
// the bottom on mobile instead, matching how a native app presents secondary content. Styled as
// this app's "hero/feature card" tier (rounded-3xl, Surface Raised, Glass Border) per DESIGN.md,
// not the generic light-mode shadcn Drawer scaffold that ships unused in components/ui/drawer.jsx.
export function BottomSheet({ open, onOpenChange, title, children }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-white/10 bg-[#141a28] shadow-2xl outline-none">
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20" />
          <div className="flex items-center justify-between px-5 pt-3">
            <Drawer.Title className="text-base font-semibold text-white">{title}</Drawer.Title>
            <Drawer.Close className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><X size={16} /></Drawer.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
