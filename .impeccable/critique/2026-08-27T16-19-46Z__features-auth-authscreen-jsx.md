---
target: mobile landing page — headline + FlipCard
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 2
p1_count: 2
timestamp: 2026-08-27T16-19-46Z
slug: features-auth-authscreen-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Static hero, nothing async to fail |
| 2 | Match System / Real World | 3 | Strong card metaphor; network-mark dots don't read as a recognizable logo |
| 3 | User Control and Freedom | 3 | Flip toggles cleanly, keyboard-accessible |
| 4 | Consistency and Standards | 1 | The mock card literally prints "PERSONAL FINANCE" — the old brand name, still on-screen after the app-wide rename to "Personal Fin" — plus the card number clips |
| 5 | Error Prevention | 3 | Low-risk static surface |
| 6 | Recognition Rather Than Recall | 4 | Clear labels, no memory burden |
| 7 | Flexibility and Efficiency | n/a | Persuade-mode marketing surface |
| 8 | Aesthetic and Minimalist Design | 2 | Dense subhead, redundant sign-in link, clipped number, illegible chip detail |
| 9 | Error Recovery | 3 | No error states on this screen |
| 10 | Help and Documentation | n/a | Not applicable to a marketing surface |
| Total | | 22/32 | 69% — Acceptable, leaning Poor on flagged elements |

## Design Specificity Verdict

Split verdict. The FlipCard is genuinely authored for this product — a live preview of the real CreditCardFlip feature, not stock card art. The headline treatment is a competent but generic premium-SaaS template (oversized bold + accent second line + glow + fade-up subhead + pill CTA); the gold recolor is the only thing tying it to "Quiet Vault." Doesn't invoke the design system's own Numbers Lead Rule. At mobile widths it's held together by coincidental text-wrap rather than deliberate authorship.

Deterministic scan: detect.mjs --json returns zero findings (confirmed twice, including --no-config). Not equipped to catch layout/copy/content bugs like these.

## Overall Impression

Motion/interaction craft is genuinely good — the card is the actual product feature, not marketing filler, with one disciplined shared easing curve. But the hero doesn't survive close inspection at real device widths, and the single most-crafted element (the card) is the thing visibly broken.

## What's Working

1. FlipCard interaction design — real flip on hover/click/keyboard, correct aria-pressed/focus-visible handling.
2. One shared motion language (STACK_EASE reused across headline reveal and card entrance).
3. Visible engineering care — code comments document real bugs already found and fixed.

## Priority Issues

[P0] The mock card prints the old brand name. AuthScreen.jsx:100 — "PERSONAL FINANCE" leftover from before the app-wide "Personal Fin" rename (uppercase, missed by the earlier grep sweep). Fix: change to "PERSONAL FIN". Trivial, no design judgment needed.

[P0] The card's printed number clips mid-digit on every phone. AuthScreen.jsx:110/69 renders "•••• •••• •••• 4" — cut off by overflow-hidden at the 220px mobile card width; tracking-[0.16em] too wide for the ~180px interior. Fix: tighten tracking at mobile width or reduce font-size at the 220px breakpoint, verify at actual 220px render.

[P1] Headline breaks mid-phrase at narrow widths. Confirmed at 320px: wraps to "Your entire financial" / "life. One calm view." — splits "financial life." apart. Depends on wrap coincidence, not a forced break. Fix: force the intended line grouping on mobile the same way lg:block does on desktop.

[P1] Card cluster reads left-weighted, not centered. translate-x-[10.5%] translate-y-[7%] leaves the stack tighter to the left edge than the hero's own px-6 padding. Confirmed in 375x667 screenshot. Fix: compute the cluster's true bounding box (including absolute overhang) and center that.

[P2] Card micro-detail illegible at shipped mobile size. Chip's 6-cell grid reads as a flat rectangle at 220px; network-mark reads as ambiguous dots. Fix: increase chip-cell contrast/gap or simplify.

[P3] Trust line and module marquee fall below the fold on common short phones. At 375x667, "Private & secure — powered by Supabase" and the module ticker are cut off without scrolling. Fix: tighten vertical rhythm above the card, or place a lightweight trust badge near the CTA.

## Persona Red Flags

Jordan (first-timer): Parses a dense 32-word subhead before any visual proof. Taps the card (good discovery) then sees the number truncate and "PERSONAL FINANCE" instead of the app's actual name — trust dents on a precision-tracking product. May never scroll to the trust line on SE-class phones.

Casey (distracted mobile user): Headline/CTA glanceable at normal widths, but skews toward exactly the devices/zoom levels where the headline breaks mid-phrase. Least likely to wait out the ~2.2s card settle, so the most effort-intensive element is most likely seen mid-motion by the visitor who needs to be won fastest.

## Minor Observations

- Ambient mouse-parallax glow never fires on touch — dead interactivity for the primary mobile audience.
- Redundant identical-destination CTAs: header "Sign in" and "Already have an account? Sign in" both visible at once.
- Card's literal box-shadow is defensible as a floating-UI exception to Glass-Over-Shadow, but worth a deliberate call.

## Questions to Consider

- If the card's own number can't survive the card's own mask at the width it ships on mobile, was this ever screenshotted at a real 220px render?
- The copy promises "calm — a quick glance," yet the most crafted moment is a 2.2s settle animation likely still mid-motion when a quick-glance visitor has looked away. Is that investment aimed at the right persona?
