import { useState } from 'react'
import { Text, View } from 'react-native'
import Svg, { Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg'
import { tw } from '../lib/tw'

// Native port of the Dashboard's Recharts cash-flow chart (app/page.js): grouped income/expense
// bars on a dashed grid with ₹Nk ticks (Dark/Light), or two glowing area lines (Glass).
const INCOME = '#34d399'
const EXPENSE = '#fb7185'
const TICK = '#94a3b8'

function niceMax(v) {
  if (v <= 0) return 4000 // empty chart: 0, 1k, 2k, 3k, 4k
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / mag) * mag
}

export function CashflowChart({ months, showMoney, glass, height = 160 }) {
  const [width, setWidth] = useState(0)
  const left = 44, bottom = 22, top = 8
  const max = niceMax(Math.max(...months.map((m) => Math.max(m.income, m.expense)), 0))
  const plotW = Math.max(0, width - left - 4), plotH = height - top - bottom
  const y = (v) => top + plotH - (v / max) * plotH
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max]
  const slot = months.length ? plotW / months.length : 0
  // ₹Nk like the web; one decimal when the step is under ₹1k so ticks never repeat.
  const fmt = (v) => (!showMoney ? '••••' : `₹${(v / 1000).toFixed(Math.abs(ticks[1] - ticks[0]) < 1000 && v % 1000 !== 0 ? 1 : 0)}k`)

  const areaPath = (key, closed) => {
    const pts = months.map((m, i) => [left + slot * i + slot / 2, y(m[key])])
    if (pts.length === 0) return ''
    let d = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    return closed ? `${d} L${pts[pts.length - 1][0]},${top + plotH} L${pts[0][0]},${top + plotH} Z` : d
  }

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="inc" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={INCOME} stopOpacity={0.45} /><Stop offset="1" stopColor={INCOME} stopOpacity={0} /></LinearGradient>
              <LinearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={EXPENSE} stopOpacity={0.4} /><Stop offset="1" stopColor={EXPENSE} stopOpacity={0} /></LinearGradient>
            </Defs>
            {ticks.map((t) => (
              <SvgText key={t} x={left - 6} y={y(t) + 4} fontSize={12} fill={TICK} textAnchor="end">{fmt(t)}</SvgText>
            ))}
            {!glass && ticks.map((t) => <Line key={`g${t}`} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="#ffffff11" strokeDasharray="3 3" />)}
            {!glass && months.map((m, i) => (
              <Line key={`v${m.key}`} x1={left + slot * i + slot / 2} x2={left + slot * i + slot / 2} y1={top} y2={top + plotH} stroke="#ffffff11" strokeDasharray="3 3" />
            ))}
            {glass ? (
              <>
                <Path d={areaPath('income', true)} fill="url(#inc)" />
                <Path d={areaPath('expense', true)} fill="url(#exp)" />
                <Path d={areaPath('income', false)} stroke={INCOME} strokeWidth={2.5} fill="none" />
                <Path d={areaPath('expense', false)} stroke={EXPENSE} strokeWidth={2.5} fill="none" />
              </>
            ) : months.map((m, i) => {
              const barW = Math.min(18, (slot - 10) / 2)
              const cx = left + slot * i + slot / 2
              const bar = (v, x, color) => {
                const h = Math.max(0, top + plotH - y(v))
                if (h <= 0) return null
                const r = Math.min(8, barW / 2, h)
                const yt = top + plotH - h
                return <Path key={color} d={`M${x},${top + plotH} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + barW - r} Q${x + barW},${yt} ${x + barW},${yt + r} V${top + plotH} Z`} fill={color} />
              }
              return [bar(m.income, cx - barW - 2, INCOME), bar(m.expense, cx + 2, EXPENSE)]
            })}
            {months.map((m, i) => (
              <SvgText key={`l${m.key}`} x={left + slot * i + slot / 2} y={height - 4} fontSize={12} fill={TICK} textAnchor="middle">{m.label}</SvgText>
            ))}
          </Svg>
        )}
      </View>
      <View className={tw('flex-row items-center justify-center gap-4', glass ? 'mt-1' : 'mt-1')}>
        <View className="flex-row items-center gap-1.5"><View className={tw(glass ? 'h-1.5 w-1.5' : 'h-2 w-2', 'rounded-full bg-emerald-400')} /><Text className="text-xs text-slate-400">{glass ? 'Income' : 'income'}</Text></View>
        <View className="flex-row items-center gap-1.5"><View className={tw(glass ? 'h-1.5 w-1.5' : 'h-2 w-2', 'rounded-full bg-rose-400')} /><Text className="text-xs text-slate-400">{glass ? 'Expense' : 'expense'}</Text></View>
      </View>
    </View>
  )
}
