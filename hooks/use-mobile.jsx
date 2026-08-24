import * as React from "react"

// Matches the app's own lg: breakpoint (1024px) — the single line the whole shell already
// splits desktop/mobile presentation on (sidebar vs. bottom nav, etc.), not Tailwind's default
// md: (768px), which would open a seam where the shell already reads "desktop" but a form here
// still renders as a mobile sheet.
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
