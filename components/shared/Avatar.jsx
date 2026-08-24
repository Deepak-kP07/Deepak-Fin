'use client'

import { useEffect, useState } from 'react'

export function Avatar({ src, name, email, size = 36, rounded = 'rounded-xl', className = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const initials = (name || email || 'D').trim().slice(0, 1).toUpperCase()
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`shrink-0 border border-white/10 object-cover ${rounded} ${className}`}
        style={{ height: size, width: size }}
      />
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-accent-300 to-blue-600 font-semibold text-[#07101c] ${rounded} ${className}`}
      style={{ height: size, width: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
    </div>
  )
}
