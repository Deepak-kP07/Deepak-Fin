'use client'

import { AlertCircle, CheckCircle2, HeartPulse, XCircle } from 'lucide-react'
import { useAdminFetch } from '@/features/admin/useAdminFetch'

// A big gap here — most opted-in users NOT getting their report in the expected window — is
// exactly the shape of the cron/env-var breakage this session hit for real, so the threshold is
// deliberately strict: anything under 80% is treated as "something's wrong," not "eh, close enough."
function healthTone(sentRecently, optedIn) {
  if (optedIn === 0) return { icon: AlertCircle, tone: 'text-slate-400', label: 'Nobody opted in' }
  const ratio = sentRecently / optedIn
  if (ratio >= 0.8) return { icon: CheckCircle2, tone: 'text-emerald-300', label: 'Healthy' }
  if (ratio >= 0.4) return { icon: AlertCircle, tone: 'text-amber-300', label: 'Degraded' }
  return { icon: XCircle, tone: 'text-rose-300', label: 'Likely broken' }
}

function DeliveryCard({ title, window, optedIn, sentRecently }) {
  const { icon: Icon, tone, label } = healthTone(sentRecently, optedIn)
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}><Icon size={13} />{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{sentRecently}<span className="text-base font-normal text-slate-500"> / {optedIn} opted in</span></div>
      <div className="mt-1 text-xs text-slate-500">Got a report in the last {window}</div>
    </div>
  )
}

export function AdminHealthView({ onAuthExpired }) {
  const { data, error } = useAdminFetch('/api/admin/health', onAuthExpired)

  if (error) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>
  if (!data) return <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <HeartPulse size={16} className="text-slate-500" />Report delivery health
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DeliveryCard title="Weekly report" window="7 days" optedIn={data.weeklyReport.optedIn} sentRecently={data.weeklyReport.sentRecently} />
        <DeliveryCard title="Monthly report" window="30 days" optedIn={data.monthlyReport.optedIn} sentRecently={data.monthlyReport.sentRecently} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertCircle size={16} className="text-amber-300" />Kite integrations currently erroring
        </div>
        <div className="divide-y divide-white/[.06]">
          {data.kiteErrors.map((k) => (
            <div key={k.id} className="py-2.5">
              <div className="text-sm text-slate-300">{k.email}</div>
              <div className="mt-0.5 text-xs text-rose-300">{k.error}</div>
            </div>
          ))}
          {data.kiteErrors.length === 0 && <div className="py-4 text-sm text-slate-500">No known Kite errors right now.</div>}
        </div>
      </div>
    </div>
  )
}
