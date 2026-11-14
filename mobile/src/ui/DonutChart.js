import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

// Native port of the Transactions category pie (Recharts Pie, innerRadius 40%, outerRadius 76%,
// tapped slice "explodes" outward like renderExplodedPieSlice).
function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0)
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`
}

export function DonutChart({ data, activeIndex = -1, onSlicePress, height = 288 }) {
  const [width, setWidth] = useState(0)
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const size = Math.min(width, height)
  const cx = width / 2, cy = height / 2
  const outer = (size / 2) * 0.76, inner = (size / 2) * 0.4
  let angle = -Math.PI / 2
  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const sweep = (d.value / total) * Math.PI * 2
            const a0 = angle, a1 = angle + sweep
            angle = a1
            const active = i === activeIndex
            const mid = (a0 + a1) / 2, off = active ? 8 : 0
            const path = arc(cx + off * Math.cos(mid), cy + off * Math.sin(mid), inner, active ? outer + 6 : outer, a0, Math.max(a0 + 0.0001, a1 - (data.length > 1 ? 0.002 : 0)))
            return <Path key={i} d={path} fill={d.color} onPress={() => onSlicePress?.(i)} />
          })}
        </Svg>
      )}
    </View>
  )
}
