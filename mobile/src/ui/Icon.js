import { cssInterop } from 'nativewind'
import { tw } from '../lib/tw'

// Lucide icons take a `color` prop, not CSS. This maps a Tailwind text-colour class onto it, so a
// web line like <Eye size={14} className="text-slate-400" /> ports as <Icon as={Eye} size={14} className="text-slate-400" />.
const registered = new WeakSet()
export function Icon({ as: Component, className = '', size = 16, strokeWidth, style }) {
  if (!registered.has(Component)) {
    cssInterop(Component, { className: { target: 'style', nativeStyleToProp: { color: true } } })
    registered.add(Component)
  }
  return <Component size={size} strokeWidth={strokeWidth} className={tw(className)} style={style} />
}
