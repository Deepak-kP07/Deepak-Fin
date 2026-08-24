---
target: the landing page (AuthScreen.jsx)
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
timestamp: 2026-08-23T05-15-52Z
slug: features-auth-authscreen-jsx
---
Method: dual-agent (A: a7e2d8e6280b90e5b · B: aadb080ddceace0e6)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "Working…"/"Redirecting…" button-text swaps are adequate |
| 2 | Match System / Real World | 3 | "Supabase RLS" as marketing-tile copy is backend jargon in consumer-facing text |
| 3 | User Control and Freedom | 2 | No "Forgot password?" affordance anywhere |
| 4 | Consistency and Standards | 2 | Off-palette blue/violet + ad hoc hex backgrounds not in DESIGN.md's tokens |
| 5 | Error Prevention | 2 | No show/hide password toggle; validation is submit-time only |
| 6 | Recognition Rather Than Recall | 3 | Labels stay above inputs, not placeholder-as-label |
| 7 | Flexibility and Efficiency | n/a | Not meaningfully applicable to a 2-field auth form |
| 8 | Aesthetic and Minimalist Design | 2 | Desktop hero panel is disproportionate overhead for "sign in" |
| 9 | Error Recovery | 2 | Amber tint reused for both real errors and success-ish messages |
| 10 | Help and Documentation | n/a | Not meaningfully applicable here |
| **Total** | | **19/32 (59%)** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Not authored for its actual context. PRODUCT.md is explicit — one trusted user, no acquisition funnel, no stranger-trust problem to solve. Yet the desktop panel runs the full generic-SaaS-landing-page playbook (sparkle badge, "Build wealth with intention.", a 3-tile feature-proof grid) — interchangeable with Mint/YNAB/Copilot, and never mentions what actually differentiates this app (EMI math, scholarships, Kite-linked equities, family money). It's performing trust for an audience that doesn't exist.

**Deterministic scan**: 1 finding, exit code 2. `detect.mjs` independently flagged the exact same line the LLM review called out for a different reason:

```json
{
  "antipattern": "gradient-text",
  "severity": "warning",
  "category": "slop",
  "file": "features/auth/AuthScreen.jsx",
  "line": 70,
  "description": "Gradient text is decorative rather than meaningful — a common AI tell"
}
```
No false positives — genuine, verifiable pattern.

**Visual overlays**: Not available. No browser automation or screenshot tool is exposed in this session (only `WebFetch`, which can't render, screenshot, or inject scripts) — Assessment B confirmed this via tool search before reporting the gap, rather than fabricating results. No user-visible overlay exists; this critique is source-only.

## Where A and B converge

Line 70 — the gradient-text headline — is the one place both an independent LLM read and a deterministic pattern scanner landed on the same line for related reasons: the LLM calls it an off-system color violation (blue/violet where only cyan is allowed), the detector calls it a generic "AI slop" tell. Two different methods, same line, reinforcing it as the single highest-confidence issue on the screen. Everything else the detector could catch (1 rule, narrow scope) is silent — the deeper problems here (missing password recovery, weak focus states, tonal mismatch, error/success color conflation) are structurally outside what a static class-pattern scanner can see; only the LLM review surfaces those.

## Overall Impression

The actual form — email/password, progressive Name-field disclosure, error handling, Google OAuth — is competently built and mostly on-system. The problem is almost entirely the desktop hero panel: it's a well-executed *generic* SaaS pitch bolted onto an app that has no one to pitch, and in doing so it's the one place in the whole codebase that breaks the one-accent rule you just spent this session enforcing everywhere else.

## What's Working

1. Progressive disclosure of the Name field in signup mode — real, disciplined intrinsic-load handling, not decoration.
2. The error banner reuses the app's actual status-tint composite (border + 5% fill + tinted text) instead of inventing new chrome.
3. Clean mobile fallback — the hero panel is `hidden` below `lg`, so the real daily-use surface (mobile, per PRODUCT.md) degrades to a plain, appropriate logo + form.

## Priority Issues

**[P1] Off-system accent colors on the very first screen** — `from-accent-200 via-blue-300 to-violet-300` (headline gradient), `from-accent-300 to-blue-500` (primary CTA), `bg-violet-500/10` (decorative blur) all introduce blue/violet, explicitly barred by DESIGN.md's one-accent rule — confirmed independently by the detector at line 70.
**Fix**: solid `text-white` (or solid accent) headline, `bg-accent`/`bg-glass-fill-strong` button per the documented button spec.
**Suggested command**: `/impeccable harden`

**[P1] Generic SaaS hero panel misaligned with product reality** — Sparkles badge, aspirational headline, 3-stat proof tiles are Persuade-mode furniture for a product with no funnel and one known user.
**Fix**: replace pitch framing with something authored for this app, or drop the sell entirely and let the panel be calm brand context.
**Suggested command**: `/impeccable adapt`

**[P1] Primary CTA button ignores DESIGN.md's own button spec** — the spec reserves cyan for hover/active, not resting state ("keeps cyan feeling earned"); here it's a permanent gradient at rest.
**Fix**: Glass-Fill-Strong background at rest, accent on hover only.
**Suggested command**: `/impeccable harden`

**[P2] No password-recovery path** — login, signup, and Google OAuth exist, but zero "Forgot password?" link. For the actual owner locked out of their own finance data, this is a real dead end.
**Suggested command**: `/impeccable harden`

**[P2] Error banner conflates real errors with soft/success messages** — a failed login and a "check your inbox" confirmation both render in the same amber (pending) tint; DESIGN.md reserves rose for negative states. A real auth failure should read as a stop, not a nudge.
**Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Jordan (first-timer / future invitee)**: "Supabase RLS" as feature-tile copy assumes technical literacy an invited family member won't have; the headline promises generic "wealth"/"intention" but never says what this actually tracks.

**Casey (mobile — the real daily-use persona per PRODUCT.md)**: none of the desktop polish reaches Casey; no `autofocus` on the email field costs an extra tap before the keyboard appears, on the single most-repeated interaction in the app.

**Sam (accessibility)**: all three inputs use `outline-none` with only a subtle `focus:border-accent-300/60` opacity shift as the focus indicator — a weak signal for keyboard users tabbing through on a near-black background.

**Deepak (project-specific — the sole real user)**: no show/hide password toggle costs real friction typing on a phone daily with no way to verify input; "Sign in securely" is stranger-reassurance copy that doesn't apply to him.

## Minor Observations

`rounded-[32px]` on the outer shell isn't in DESIGN.md's radius scale. "Deepak" as the Name-field placeholder would look odd shown to an actual future invitee. The "Account created, check your inbox" copy itself is genuinely well-written plain language.

## Questions to Consider

1. With no acquisition funnel, what is the marketing panel actually *for* — would it be stronger echoing the calm vault behind it instead of pitching a stranger?
2. Would a more honest version greet the one real person by name rather than persuade an anonymous visitor?
3. Blue/violet just showed up on the very first screen — is the one-accent rule actually enforced anywhere else you haven't checked?
