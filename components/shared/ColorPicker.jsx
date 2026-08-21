import { PALETTE } from '@/lib/palette'

// Quick preset swatches plus a real native colour picker, so anything that needs an accent
// colour isn't limited to the 8 presets — click the swatch-with-a-plus to pick any colour.
export function ColorPicker({ value, onChange }) {
  const isPreset = PALETTE.includes(value)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} className={`h-8 w-8 rounded-full border-2 transition ${value === c ? 'border-white' : 'border-transparent'}`} style={{ background: c }} />
      ))}
      <label
        className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-semibold text-white/80 ${!isPreset ? 'border-white' : 'border-white/20'}`}
        style={{ background: !isPreset && value ? value : 'conic-gradient(from 0deg, #f87171, #facc15, #4ade80, #22d3ee, #818cf8, #f472b6, #f87171)' }}
        title="Custom colour"
      >
        {isPreset && '+'}
        <input type="color" value={value || '#a78bfa'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
    </div>
  )
}
