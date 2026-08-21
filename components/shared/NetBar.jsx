import { Rectangle } from 'recharts'

// A plain fixed `radius` rounds the same two corners regardless of sign, which looks wrong for a
// bar that dips below the zero baseline — the rounded end lands at the baseline instead of the
// bar's actual tip. Round whichever end is the tip: top corners for a positive bar, bottom
// corners for a negative one, and colour to match (rose for outflow, emerald for inflow).
// Expects each data point to carry its value under a `net` key, e.g. <Bar dataKey="net" shape={<NetBar />} />.
export function NetBar({ x, y, width, height, payload }) {
  const isNeg = payload.net < 0
  const radius = isNeg ? [0, 0, 6, 6] : [6, 6, 0, 0]
  return <Rectangle x={x} y={y} width={width} height={height} radius={radius} fill={isNeg ? '#fb7185' : '#34d399'} />
}
