import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg'

// Single-series bar chart (Recharts BarChart look): dashed grid, ₹Nk ticks, rounded tops, per-bar
// colour from `colorFor(row)`.
export function BarChart({ rows, valueKey, colorFor, height = 160, showMoney = true, maxBarSize = 28 }) {
  const [width, setWidth] = useState(0)
  const left = 44, bottom = 22, top = 8
  const values = rows.map((r) => r[valueKey])
  const hi = Math.max(0, ...values), lo = Math.min(0, ...values)
  const span = hi - lo || 1000
  const mag = Math.pow(10, Math.floor(Math.log10(span)))
  const max = hi > 0 ? Math.ceil(hi / mag) * mag : 0
  const min = lo < 0 ? Math.floor(lo / mag) * mag : 0
  const plotW = Math.max(0, width - left - 4), plotH = height - top - bottom
  const y = (v) => top + ((max - v) / ((max - min) || 1)) * plotH
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4)
  const slot = rows.length ? plotW / rows.length : 0
  const fmt = (v) => (showMoney ? `₹${(v / 1000).toFixed(0)}k` : '••••')
  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t) => <SvgText key={`t${t}`} x={left - 6} y={y(t) + 4} fontSize={12} fill="#94a3b8" textAnchor="end">{fmt(t)}</SvgText>)}
          {ticks.map((t) => <Line key={`g${t}`} x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="#ffffff11" strokeDasharray="3 3" />)}
          {rows.map((r, i) => {
            const v = r[valueKey]; if (!v) return null
            const w = Math.min(maxBarSize, slot * 0.6), x = left + slot * i + (slot - w) / 2
            const y0 = y(0), y1 = y(v), topY = Math.min(y0, y1), h = Math.abs(y0 - y1), rad = Math.min(6, w / 2, h)
            const d = v >= 0
              ? `M${x},${y0} V${topY + rad} Q${x},${topY} ${x + rad},${topY} H${x + w - rad} Q${x + w},${topY} ${x + w},${topY + rad} V${y0} Z`
              : `M${x},${y0} V${y1} H${x + w} V${y0} Z`
            return <Path key={i} d={d} fill={colorFor(r)} />
          })}
          {rows.map((r, i) => <SvgText key={`l${i}`} x={left + slot * i + slot / 2} y={height - 4} fontSize={12} fill="#94a3b8" textAnchor="middle">{r.label}</SvgText>)}
        </Svg>
      )}
    </View>
  )
}
