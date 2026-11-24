'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// A password <input> with an eye button to show what was typed — the usual way to catch a typo
// before "invalid login". Takes the same props as <input>; `className` styles the input itself.
export function PasswordInput({ className = '', ...props }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="relative block">
      <input {...props} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${className} pr-12`} />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute bottom-0 right-1 top-2 flex w-10 items-center justify-center text-slate-400 transition hover:text-white">
        {shown ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  )
}
