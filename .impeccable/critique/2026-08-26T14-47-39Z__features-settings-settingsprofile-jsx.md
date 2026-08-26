---
target: features/settings/SettingsProfile.jsx
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 1
timestamp: 2026-08-26T14-47-39Z
slug: features-settings-settingsprofile-jsx
---
Method: dual-agent (A: design-review · B: detector-scan)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Only a "Saving…" label; no success/failure confirmation |
| 2 | Match System / Real World | 1 | Raw Google-hosted image URL shown as an editable text field |
| 3 | User Control and Freedom | 2 | No revert/cancel; no real "change photo" affordance |
| 4 | Consistency and Standards | 1 | Only settings section with no title/header, breaking the pattern every sibling establishes |
| 5 | Error Prevention | 2 | Age has min/max but no inline feedback; URL field accepts anything |
| 6 | Recognition Rather Than Recall | 3 | Labels are plain and clear |
| 7 | Flexibility and Efficiency | 2 | No direct "tap avatar to change" interaction |
| 8 | Aesthetic and Minimalist Design | 1 | Avatar under-scaled for its role; URL field is pure clutter |
| 9 | Error Recovery | 2 | No visible error state on malformed URL or failed save |
| 10 | Help and Documentation | 2 | One micro-label stands in for real guidance |
| **Total** | | **18/40** | **Poor — significant improvement needed** |

## Design Specificity Verdict

**LLM assessment:** Reads as a generic settings-form template that happens to sit inside a distinctive "Quiet Vault" system, not authored for it. Every sibling section (Appearance, Guardrails) opens with a title + one-line explainer and groups controls into a purposeful visual metaphor. Profile has none of that — just four label/input pairs in a grid. The one element that should feel most personal (the user's own photo) renders at 84px, smaller than the theme-preview tiles next to it. Exposing `profile.avatar_url` as raw editable text is the clearest tell: it leaks a Google CDN implementation detail into a surface meant to feel calm and considered.

**Deterministic scan:** `detect.mjs` returned zero findings (clean, exit 0) on both `SettingsProfile.jsx` and `SettingsShell.jsx` — no mechanical violations (contrast, spacing tokens, banned patterns). This confirms the problem here is compositional/IA, not a rule violation the detector catches.

**Visual overlays:** Not available — no authenticated browser session for this app (live Supabase-gated production DB, no test credentials). Judged from source + the user's own screenshot instead.

## Overall Impression

Functionally solid (clean state sync, correct reuse of the shared `Avatar` component and input tokens), but visually and structurally it's the weakest page in Settings — no header, an undersized identity element, and a field that actively should not exist. The fix is mostly subtraction and re-proportioning, not new complexity.

## What's Working
1. Correctly reuses the app's card/input token language (glass border, rounded-2xl, accent focus ring) — nothing here needs new design tokens.
2. `Avatar` component already handles fallback-to-initials gracefully if an image fails.
3. Form state is simple and predictable — one sync effect, one save handler, easy to build on.

## Priority Issues

**[P0] Raw Avatar URL field exposes an internal implementation detail with no user value.**
Why it matters: A first-time user sees a `googleusercontent.com` URL and has no idea whether to touch it — it's a Google-auth artifact, not a setting.
Fix: Remove the text input entirely; avatar stays driven by `avatar_url` internally, never shown as a string.
Suggested command: /impeccable distill

**[P0] Avatar is under-scaled for what should be the page's emotional anchor.**
Why it matters: At 84px it's smaller than a theme swatch — the one truly personal element on the page reads as an afterthought.
Fix: Scale it up significantly (112–140px+) and make it the visual lead of the card, per DESIGN.md's "one dominant element" precedent.
Suggested command: /impeccable layout

**[P1] No section header/explainer — the only settings page missing one.**
Why it matters: Breaks the pattern every sibling page (Appearance, Guardrails, Modules) establishes; Profile reads like a stray form dropped into a designed shell.
Fix: Add a title + one-line subtext matching sibling sections.
Suggested command: /impeccable layout

**[P2] No save confirmation or error feedback.**
Why it matters: User has no idea if "Save profile" actually worked.
Fix: Surface the existing `Toast` component on success/failure.
Suggested command: /impeccable polish

**[P3] Read-only Email row shares visual weight with editable fields.**
Why it matters: Invites a tap that does nothing.
Fix: Mute it further so its non-interactivity is legible at a glance.
Suggested command: /impeccable polish

## Persona Red Flags

**Jordan (confused first-timer):** Sees a text field full of a raw `googleusercontent.com` URL on first visit to Settings and doesn't know whether to touch it, delete it, or leave it alone.

**Casey (distracted mobile user):** On a small screen, the tiny avatar next to two stacked full-width inputs makes the "who am I" identity element easy to skim past — nothing invites a quick single-tap "update my photo" action.

## Minor Observations
- Age input has no unit/context hint and no inline validation display.
- No "required" vs "optional" field marking anywhere on the form.

## Questions to Consider
- Is there any real case where hand-entering an avatar URL is the only path to a photo (e.g. non-Google signup) — and if so, should that live behind an "advanced" affordance instead of the default view?
- Should avatar editing eventually be upload-based rather than URL-based, matching the system's "calm and precise" character?
