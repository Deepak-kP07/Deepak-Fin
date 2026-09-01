'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { MotionConfig, motion, useMotionValue, useTransform } from 'framer-motion'
import { createClient } from '@/lib/supabase/browser'
import { isNativePlatform, listenForNativeGoogleCallback, startNativeGoogleSignIn } from '@/lib/auth/nativeGoogleAuth'
import {
  ArrowLeft, Banknote, ChevronRight, CreditCard, Eye, EyeOff, Landmark, LayoutDashboard,
  LineChart, Repeat, ShieldCheck, Sparkle, Wifi,
} from 'lucide-react'

// SHA-256 hex digest of the nonce we hand to Google — Google puts this hash in the ID token's
// `nonce` claim, and Supabase's signInWithIdToken is handed the original (unhashed) value to
// verify against it. Without this round trip Supabase rejects the token.
async function sha256Hex(value) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// crypto.randomUUID() is a newer addition to the Web Crypto API than crypto.subtle/getRandomValues
// — some Android WebViews (and any non-secure-context load) implement one but not the other. This
// used to be a bare `crypto.randomUUID()` call, which threw on those browsers and killed the whole
// setup effect before initialize()/renderButton() ever ran, silently leaving the Google button dead
// — that's the "first attempt does nothing" behavior that made sign-in feel like it needed two tries.
function randomNonce() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  if (typeof crypto.getRandomValues === 'function') {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
}

// The 6 most universally-recognizable modules (out of the 11 the app actually ships —
// PROJECT_CONTEXT.md §5) — shown on the landing marquee as a representative sample, not the
// full list. The subhead names the real total so nothing here overstates or understates it.
const TOP_MODULES = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Transactions', icon: Repeat },
  { label: 'Investments', icon: LineChart },
  { label: 'Loans', icon: Banknote },
  { label: 'Credit Cards', icon: CreditCard },
  { label: 'Accounts', icon: Landmark },
]

const wordFade = { hidden: { opacity: 0, y: 22, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }
const HEADLINE = [['Your', 'entire', 'financial', 'life.'], ['One', 'calm', 'view.']]
const GRAIN_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// The front/back faces of the interactive card, and the front-only faces of the static peek
// cards behind it. All rendered in CSS (no image assets exist for this — see DESIGN.md):
// graphite metal gradient, brushed sheen, embossed chip. `bg-[#08090c]` on the outer face is
// deliberate — it's the opaque backing that stops one stacked card's content bleeding through
// another's translucent gradient (a real bug from an earlier pass on this page).
function CardFace({ back = false, revealed = false, onToggleReveal }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[20px] bg-[#08090c]"
      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : undefined }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg, #3d3423 0%, #201b12 50%, #08090c 100%)' }} />
      <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(120deg, transparent 25%, rgba(212,175,55,.16) 42%, transparent 58%)' }} />
      <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/10" />
      {back ? (
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="h-8 w-full rounded-[3px] bg-black/70" />
          <div>
            <div className="text-[8px] font-medium tracking-[0.2em] text-white/40">CARD NUMBER</div>
            <div className="font-mono text-[11px] tracking-[0.08em] text-white/90 sm:text-sm sm:tracking-[0.16em]">
              {revealed ? '4242 4242 4242 4242' : <>••••&nbsp;••••&nbsp;••••&nbsp;4821</>}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[8px] font-medium tracking-[0.2em] text-white/40">EXPIRES</div>
                  <div className="font-mono text-xs text-white/80">{revealed ? '12/30' : '••/••'}</div>
                </div>
                <div>
                  <div className="text-[8px] font-medium tracking-[0.2em] text-white/40">CVV</div>
                  <div className="font-mono text-xs text-white/80">{revealed ? '123' : '•••'}</div>
                </div>
              </div>
              {onToggleReveal && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleReveal() }}
                  aria-label={revealed ? 'Hide card details' : 'Show card details'}
                  aria-pressed={revealed}
                  className="rounded-full border border-white/10 bg-black/30 p-1.5 text-white/60 transition hover:bg-black/50 hover:text-white"
                >
                  {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
            </div>
            <div className="mt-3 text-[10px] leading-4 text-white/40">Preview only — sign up to add and track your real cards.</div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold tracking-[0.22em] text-white/60">PERSONAL FIN</span>
            <Wifi size={16} className="rotate-90 text-white/40" />
          </div>
          <div className="h-8 w-10 rounded-[6px] bg-gradient-to-br from-yellow-200 via-yellow-300 to-yellow-500 shadow-inner">
            <div className="grid h-full grid-cols-3 grid-rows-2 gap-[2px] p-[3px]">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-[1px] bg-yellow-800/50" />)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] tracking-[0.08em] text-white/90 sm:text-sm sm:tracking-[0.16em]">
              ••••&nbsp;••••&nbsp;••••&nbsp;4821
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-[8px] font-medium tracking-[0.2em] text-white/40">CARDHOLDER</div>
                <div className="text-xs font-semibold tracking-wide text-white/90">DEEPAK KP</div>
              </div>
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="h-5 w-5 rounded-full bg-accent-300/90" />
                <span className="h-5 w-5 rounded-full bg-white/60" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Split deliberately: CARD_DIMENSIONS carries no position class, so EchoLayer/GlassLayer below
// can pair it with `absolute` safely. CARD_SIZE (position: relative + these same dimensions) is
// only for the one normal-flow element that establishes the stack's actual size — mixing
// `relative` into an `absolute` element's className was a real bug here: Tailwind's stylesheet
// order made `relative` win over `absolute`, so the two layers were rendering in normal
// document flow (stacked vertically) instead of overlaid on the card at all.
const CARD_DIMENSIONS = 'aspect-[85/54] w-[220px] shrink-0 rounded-[20px] sm:w-[260px] lg:w-[320px]'
const CARD_SIZE = `relative ${CARD_DIMENSIONS}`

// The settle curve every one of the three stack layers arrives on: a confident, decelerating
// arrival (matches the flip and the headline word-reveal elsewhere on this screen), staggered
// so the deck reads as converging rather than fading in together.
const STACK_EASE = [0.16, 1, 0.3, 1]

// A lighter card peeking out from behind the real one, offset down-right — the "another card
// underneath" cue from the reference. Content-free (see the module docstring below). Enters
// tilted deep in 3D space (rotateX/rotateY, pulled back on z) and settles flat into its resting
// offset, so the opening moment reads as a real deck of cards coming to rest, not a fade-in.
function EchoLayer() {
  return (
    <motion.div
      className={`absolute inset-0 origin-top-left overflow-hidden rounded-[20px] bg-[#08090c] ${CARD_DIMENSIONS}`}
      initial={{ x: '-32%', y: '68%', z: -160, rotate: -16, rotateX: 30, rotateY: -22, opacity: 0 }}
      animate={{ x: '15%', y: '18%', z: 0, rotate: 4, rotateX: 0, rotateY: 0, opacity: 0.55 }}
      transition={{ delay: 1, duration: 0.9, ease: STACK_EASE }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg, #4a4234 0%, #211c14 55%, #0a0b0e 100%)' }} />
      <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/10" />
    </motion.div>
  )
}

// A ghost/glass card behind the real one, mostly occupying the open space up-left of it with
// only one corner tucked underneath — the ethereal "third layer" cue from the reference. It is
// genuinely translucent (a flat low-opacity fill plus a soft corner sheen, deliberately no
// backdrop-blur: a blurred layer sitting behind an opaque card blurs nothing, but keeping the
// glass look free of blur is also just correct — the reference's ghost card reads as glass
// through faint fill and a border, not through blurring what's behind it) and carries only the
// chrome a glass card would have (network mark, contactless icon, a small sparkle), never text.
//
// This used to render in front of the real card with `backdrop-blur` turned on, which is what
// caused the "mush" bug across earlier rounds: a blurred, in-front layer blurs whatever's behind
// it, so any overlap with the real card also blurred the real card's content. Moving it behind
// the real card (see FlipCard's render order) makes that failure mode structurally impossible —
// the real card is always opaque and always paints last, so it's never blurred by anything.
//
// x/y use percentages, not px: this layer is exactly CARD_DIMENSIONS (same responsive size as
// the real card), so a fixed-px offset shrinks to almost nothing as a fraction of the card at
// larger breakpoints. A percentage offset stays proportional at every width.
function GlassLayer() {
  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 origin-bottom-right overflow-hidden rounded-[20px] border border-white/10 bg-white/[.035] ${CARD_DIMENSIONS}`}
      initial={{ x: '110%', y: '-130%', z: -160, rotate: 14, rotateX: -30, rotateY: 24, opacity: 0 }}
      animate={{ x: '-36%', y: '-32%', z: 0, rotate: -4, rotateX: 0, rotateY: 0, opacity: 1 }}
      transition={{ delay: 1.22, duration: 0.95, ease: STACK_EASE }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.07) 0%, transparent 55%)' }} />
      <div className="relative flex items-center justify-between p-5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <Sparkle size={12} className="text-white/50" />
          <span className="flex -space-x-2">
            <span className="h-5 w-5 rounded-full bg-white/60" />
            <span className="h-5 w-5 rounded-full bg-white/30" />
          </span>
        </div>
        <Wifi size={14} className="rotate-90 text-white/40" />
      </div>
    </motion.div>
  )
}

// The one interactive element in the hero: hover, click, or press Enter/Space to flip, revealing
// a clearly-labeled preview back (masked number/expiry/CVV, no real data — see CardFace). Same
// 3D-flip technique as the app's real CreditCardFlip.jsx (perspective + backface-hidden +
// rotateY), so the very first thing a visitor can touch behaves exactly like the feature it's
// previewing. The eye icon lives only on the back — the front never reveals anything — and stops
// its click from bubbling so it never accidentally triggers another flip underneath it.
//
// Hover and click are independent triggers, not aliases: `hovering` flips it while the pointer
// is over the card and reverts the moment it leaves (a quick preview); `pinned` is the click
// toggle and persists past mouse-leave (what touch and keyboard get, since neither has hover).
// The card shows its back whenever either is true, so hovering previews it and clicking locks it
// — clicking again while hovered still un-pins, it just stays flipped until the pointer leaves.
function FlipCard() {
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const flipped = pinned || hovering
  const toggleFlip = () => setPinned((p) => !p)
  // The echo/glass layers below overhang this box asymmetrically — glass sits 36%/32% past the
  // left/top edge, echo only 15%/18% past the right/bottom — so the flex parent centering this
  // element's own box (which doesn't include the absolutely-positioned overhang) actually left/
  // up-biases the whole visual cluster. This nudges it back so the cluster itself, not just the
  // untranslated box, sits centered — mobile/tablet only; desktop's row layout has room either
  // way and was left as designed.
  return (
    <div className="relative m-10 translate-x-[10.5%] translate-y-[7%] sm:m-20 lg:m-24 lg:translate-x-0 lg:translate-y-0" style={{ perspective: '1500px' }}>
      <EchoLayer />
      <GlassLayer />
      <motion.div
        role="button" tabIndex={0} aria-pressed={flipped} aria-label="Flip card to preview the back"
        onClick={toggleFlip} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleFlip())}
        onHoverStart={() => setHovering(true)} onHoverEnd={() => setHovering(false)}
        initial={{ y: -60, z: -160, rotateX: 26, rotateY: 0, opacity: 0 }}
        animate={{ y: 0, z: 0, rotateX: 0, rotateY: 0, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.95, ease: STACK_EASE }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`${CARD_SIZE} cursor-pointer select-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.75)] outline-none focus-visible:ring-2 focus-visible:ring-accent-300/50`}
      >
        <div
          className="card-flip-inner relative h-full w-full transition-transform duration-700 ease-out"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          <CardFace />
          <CardFace back revealed={revealed} onToggleReveal={() => setRevealed((r) => !r)} />
        </div>
      </motion.div>
    </div>
  )
}

function ModuleMarquee() {
  return (
    <div className="relative w-[260px] overflow-hidden sm:w-[320px] lg:w-[380px] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-2" aria-hidden="true">
        {[...TOP_MODULES, ...TOP_MODULES].map((m, i) => (
          <div key={i} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-xs text-slate-300">
            <m.icon size={12} className="text-accent-300" />{m.label}
          </div>
        ))}
      </div>
      <span className="sr-only">Top modules: {TOP_MODULES.map((m) => m.label).join(', ')}.</span>
    </div>
  )
}

export function AuthScreen({ onAuth, initialError, initialMode = 'landing', initialEmail = '' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [feedback, setFeedback] = useState(initialError ? { type: 'error', message: initialError } : null)
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleScriptReady, setGoogleScriptReady] = useState(false)
  // Read after mount, not during render, so the server-rendered markup (which never knows it'll
  // end up in a native shell) matches the client's first paint — avoids a hydration mismatch.
  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setIsNative(isNativePlatform()) }, [])
  const googleButtonRef = useRef(null)
  const googleNonceRef = useRef(null)
  const heroX = useMotionValue(0)
  const heroY = useMotionValue(0)
  const glowX = useTransform(heroX, [-1, 1], [-20, 20])
  const glowY = useTransform(heroY, [-1, 1], [-20, 20])
  const onHeroMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    heroX.set(((event.clientX - rect.left) / rect.width) * 2 - 1)
    heroY.set(((event.clientY - rect.top) / rect.height) * 2 - 1)
  }

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setFeedback(null)
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Please check your details and try again.')
      if (mode === 'signup' && !data.access_token) {
        setFeedback({ type: 'notice', message: 'Account created. Check your inbox to confirm your email, then sign in.' })
        setMode('login')
      } else {
        onAuth(data.user)
      }
    } catch (caught) { setFeedback({ type: 'error', message: caught.message }) } finally { setBusy(false) }
  }

  // Renders Google's own "Continue with Google" button (its click flow runs entirely on this
  // page's origin via Google Identity Services), rather than Supabase's signInWithOAuth, which
  // redirects through the Supabase project's own domain — that's what put the raw
  // "<project-ref>.supabase.co" address in front of users on Google's account chooser. The ID
  // token that button produces is handed to Supabase directly, with no redirect involved.
  useEffect(() => {
    if (isNative || !googleScriptReady || mode === 'landing') return
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || !window.google?.accounts?.id || !googleButtonRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const nonce = randomNonce()
        const hashedNonce = await sha256Hex(nonce)
        if (cancelled || !googleButtonRef.current) return
        googleNonceRef.current = nonce
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            setFeedback(null); setGoogleBusy(true)
            try {
              const supabase = createClient()
              const { data, error: idTokenError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: googleNonceRef.current,
              })
              if (idTokenError) throw idTokenError
              fetch('/api/auth/google_welcome', { method: 'POST' }).catch(() => {})
              onAuth(data.user)
            } catch (caught) {
              setFeedback({ type: 'error', message: caught.message }); setGoogleBusy(false)
            }
          },
        })
        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          // filled_black — Google's own dark-mode button variant. This screen is always dark
          // (theme isn't known pre-login), and 'outline' is white-only, which is exactly the
          // glaring white box that stood out against the rest of this page.
          type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'continue_with', logo_alignment: 'left',
          width: Math.min(400, Math.round(googleButtonRef.current.offsetWidth || 320)),
        })
      } catch (caught) {
        // Setup failing silently is exactly what made this look like it needed a second attempt —
        // the button would sit there dead with no explanation. Surface it instead.
        if (!cancelled) setFeedback({ type: 'error', message: `Google sign-in couldn't load (${caught.message}). Try refreshing, or sign in with email instead.` })
      }
    })()
    return () => { cancelled = true }
  }, [isNative, googleScriptReady, mode])

  // Native-only: listen for the OS handing the OAuth redirect back to the app (see
  // lib/auth/nativeGoogleAuth.js) — no-op on web (isNativePlatform() guards it internally too).
  useEffect(() => {
    if (!isNative) return
    return listenForNativeGoogleCallback(
      (user) => { setGoogleBusy(false); fetch('/api/auth/google_welcome', { method: 'POST' }).catch(() => {}); onAuth(user) },
      (err) => { setGoogleBusy(false); setFeedback({ type: 'error', message: err.message }) }
    )
  }, [isNative])

  const nativeGoogleSignIn = async () => {
    setFeedback(null); setGoogleBusy(true)
    try { await startNativeGoogleSignIn() } catch (err) { setGoogleBusy(false); setFeedback({ type: 'error', message: err.message }) }
  }

  const goToAuth = (nextMode) => { setFeedback(null); setMode(nextMode) }

  return (
    <MotionConfig reducedMotion="user">
      {/* Native Android draws edge-to-edge behind the status bar/notch by default (mandatory
          since Android 15) — safe-area-inset-top is 0 on the web/PWA (no visual change there),
          so this is scoped padding, not a global body-level one, matching how the bottom nav
          already handles safe-area-inset-bottom (app/page.js). */}
      <main className="relative h-[100dvh] overflow-hidden bg-[#080b12]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: GRAIN_URL }} />

        {mode === 'landing' ? (
          /* Below `lg:` the stacked headline + CTAs + card mockup + module marquee + trust line
             don't fit one mobile viewport the way they do in the desktop row layout — with
             `overflow-hidden` that overflow used to clip silently, letting the card mockup and
             marquee land on top of each other instead of just running off-screen. Scrolling
             internally on mobile (matching the app's own mobile-first requirement) keeps every
             element in normal document flow; `lg:overflow-hidden` restores the desktop's
             intentional single-screen, no-scroll composition once content actually fits. */
          <div onMouseMove={onHeroMouseMove} className="relative flex h-full flex-col overflow-y-auto px-6 py-5 sm:px-10 sm:py-6 lg:overflow-hidden lg:px-14 lg:py-7">
            <motion.div
              className="pointer-events-none absolute -left-40 -top-20 h-[32rem] w-[32rem] rounded-full bg-accent-400/[.12] blur-3xl"
              style={{ x: glowX, y: glowY }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-semibold">
                <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
                <span>Personal Fin</span>
              </div>
              <button onClick={() => goToAuth('login')} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[.08]">
                Sign in
              </button>
            </div>

            {/* `min-h-0 flex-1` and `justify-center` are desktop-only (`lg:`) now. Both assume this
                row's content fits in the space left after the header and trust line — true on
                desktop's wide row layout, false once the headline, CTAs, card mockup, and module
                marquee stack into one mobile column. Forcing that stack into a `flex-1` box let it
                overflow the box's own bottom edge without pushing the trust-line sibling below it
                down, so the marquee visually landed on top of the trust line. Letting this row size
                to its natural content height on mobile (plain block flow) fixes that structurally;
                the hero's own `overflow-y-auto` (see above) scrolls the rest into view. */}
            <div className="relative mx-auto my-auto flex w-full max-w-[1100px] flex-col items-center justify-start gap-6 lg:my-0 lg:min-h-0 lg:flex-1 lg:flex-row lg:justify-between lg:gap-12">
              <div className="order-2 max-w-xl text-center lg:order-none lg:text-left">
                {/* Each HEADLINE array is forced onto its own line at every width (not just
                    desktop) so the two groups can never merge onto one wrapped line — the earlier
                    "flow as one paragraph, tuned to land on two lines" approach depended on the
                    browser's wrap landing exactly on the array boundary at one specific viewport
                    width, and broke differently (mid-phrase, mixing white and gold text on one
                    line) at others. The mobile size is capped low enough that "Your entire
                    financial life." itself doesn't need to wrap a second time down to a 320px
                    viewport (measured, not guessed — see PR notes). */}
                <h1 className="text-[clamp(1.5rem,8vw,2.25rem)] font-semibold leading-[1.15] tracking-[-.02em] text-white lg:text-[clamp(3.5rem,5vw,5.25rem)] lg:leading-[1.0] lg:tracking-[-.04em]">
                  {HEADLINE.map((line, li) => (
                    <motion.span
                      key={li}
                      className={`block ${li === 1 ? 'text-accent-200' : ''}`}
                      initial="hidden" animate="show"
                      variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: li * 0.26 } } }}
                    >
                      {line.map((word, wi) => (
                        <motion.span key={wi} variants={wordFade} className="mr-[0.26em] inline-block">{word}</motion.span>
                      ))}
                    </motion.span>
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
                  className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-400 lg:mx-0"
                >
                  One unified view of your money, fully customizable — the same experience on mobile and web.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.5 }}
                  className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
                >
                  <button onClick={() => goToAuth('signup')} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.10] px-5 py-3 font-semibold text-white transition hover:border-accent-300 hover:bg-accent-300 hover:text-[#07101c]">
                    Create free account<ChevronRight size={16} />
                  </button>
                  <button onClick={() => goToAuth('login')} className="text-sm font-medium text-slate-400 transition hover:text-white">
                    Already have an account? Sign in
                  </button>
                </motion.div>
              </div>

              <motion.div
                className="order-1 mt-6 flex shrink-0 flex-col items-center gap-4 lg:order-none lg:mt-0"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }}
              >
                <FlipCard />
                <ModuleMarquee />
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="relative flex h-full items-center justify-center overflow-y-auto p-6">
            <div className="w-full max-w-sm">
              <button onClick={() => goToAuth('landing')} className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white">
                <ArrowLeft size={15} />Back
              </button>
              <div className="mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-white">{mode === 'login' ? 'Welcome back' : 'Start your money journey'}</h2>
                <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to your private finance space.' : 'Create your secure personal finance space.'}</p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                {mode === 'signup' && (
                  <label className="block text-sm text-slate-300">Name
                    <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-accent-300/60 focus:ring-2 focus:ring-accent-300/30" placeholder="Your name" />
                  </label>
                )}
                <label className="block text-sm text-slate-300">Email
                  <input required autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-accent-300/60 focus:ring-2 focus:ring-accent-300/30" placeholder="you@example.com" />
                </label>
                <label className="block text-sm text-slate-300">Password
                  <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-accent-300/60 focus:ring-2 focus:ring-accent-300/30" placeholder="••••••••" />
                </label>
                {feedback && (
                  <div className={`rounded-xl border px-4 py-3 text-sm leading-5 ${feedback.type === 'error' ? 'border-rose-300/20 bg-rose-300/10 text-rose-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
                    {feedback.message}
                  </div>
                )}
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.10] px-4 py-3.5 font-semibold text-white transition hover:border-accent-300 hover:bg-accent-300 hover:text-[#07101c] disabled:opacity-60">
                  {busy ? 'Working…' : mode === 'login' ? 'Sign in securely' : 'Create account'}<ChevronRight size={17} />
                </button>
              </form>
              <div className="my-8 flex items-center gap-3 text-xs text-slate-600"><div className="h-px flex-1 bg-white/10" />OR<div className="h-px flex-1 bg-white/10" /></div>
              {isNative ? (
                // Google Identity Services (below) doesn't work inside an embedded Android
                // WebView — see lib/auth/nativeGoogleAuth.js. A plain button + a Custom Tab
                // stands in for it here instead of the GIS-rendered one.
                <button onClick={nativeGoogleSignIn} disabled={googleBusy} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.10] px-4 py-3.5 font-semibold text-white transition hover:border-accent-300 hover:bg-accent-300 hover:text-[#07101c] disabled:opacity-60">
                  {googleBusy ? 'Waiting for Google…' : 'Continue with Google'}
                </button>
              ) : (
                <>
                  <div ref={googleButtonRef} aria-busy={googleBusy} className="flex min-h-[52px] w-full justify-center [&>div]:!w-full" />
                  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <p className="mt-2 text-center text-xs text-rose-300">Google sign-in isn't configured yet.</p>
                  )}
                  <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleScriptReady(true)} />
                </>
              )}
              <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setFeedback(null) }} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/5">
                {mode === 'login' ? 'Create a new account' : 'I already have an account'}
              </button>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300" />Your data is protected by Supabase Auth</div>
            </div>
          </div>
        )}
      </main>
    </MotionConfig>
  )
}
