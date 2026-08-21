export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080b12]">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-2xl border-2 border-cyan-300/15 border-t-cyan-300" style={{ animationDuration: '900ms' }} />
        <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <span>Loading your financial space</span>
        <span className="flex gap-0.5">
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }} />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }} />
          <span className="h-1 w-1 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  )
}
