---
name: Personal Finance
description: A calm, dark, glass-panelled command centre for one person's real financial life.
colors:
  void: "#080b12"
  surface: "#101621"
  surface-raised: "#141a28"
  glass-fill: "rgba(255, 255, 255, 0.04)"
  glass-fill-strong: "rgba(255, 255, 255, 0.10)"
  glass-border: "rgba(255, 255, 255, 0.10)"
  glass-border-faint: "rgba(255, 255, 255, 0.05)"
  accent: "#d4af37"
  accent-bright: "#e0c25c"
  income: "#6ee7b7"
  expense: "#fda4af"
  pending: "#fcd34d"
  text-primary: "#f1f5f9"
  text-muted: "rgba(241, 245, 249, 0.6)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "24px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.glass-fill-strong}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.void}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  card-glass:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Personal Finance

## Overview

**Creative North Star: "The Quiet Vault"**

Personal Finance already has a real, consistent design language living in its code — near-black grounds, glass panels at 2–10% white opacity, a single signature accent color (Gold by default, user-configurable) used across the entire app, and soft pastel status colors instead of saturated primary hues. This DESIGN.md is that system written down for the first time, not a replacement for it. The direction going forward carries the same restraint: take the *structure* of premium glassy fintech UI (elevated glass cards, oversized hero numerals, orb/glow accents, smooth Framer Motion transitions) without importing its typical saturation — this stays a calm, precise daily-use tool for one person's real financial life, not a marketing surface performing wealth.

The vault metaphor is literal: information is presented at rest, legible and still, and reveals itself calmly rather than announcing itself. Depth comes from translucent layering, not drama. The single accent color is spent deliberately — on the primary action, the active nav state, key data points — never as decoration.

**Key Characteristics:**
- Near-black void with two tiers of glass panel above it, never a hard white or a saturated fill.
- One signature accent color (Gold by default, user-configurable) across the entire app — no per-module accent colors.
- Status meaning (income/expense/pending) carried by soft pastel tints, always at low opacity against the dark ground, never as solid fills.
- Generous, consistent rounding (12–24px) on every container; sharp corners appear nowhere.
- Motion as confirmation, not decoration — a pulse while data loads, a settle when it arrives.

## Colors

Three themes ship: **Dark** (the system described below, and the default), **Light**, and **Glass** — user-picked in Settings > Appearance and persisted per-user. Dark's surface color is translucent white over one of two near-black bases; Light mirrors the same structure (glass fill/border/status-tint rules) over a light ground instead; Glass is a third peer treatment, not a variant of either — see `glassy:` Tailwind classes throughout the app (`tailwind.config.js`) for where it diverges. The palette below documents the Dark theme's actual token values, which remain the reference/default; Light and Glass are real, shipped, equally-supported options, not experiments.

### Primary
- **Accent** (default `#d4af37`, Gold — a deliberate black-and-gold premium identity, switched from the original Vault Cyan): the one signature accent for the whole app — and, as of Settings > Appearance, user-configurable (Cyan is still offered as a preset for anyone who preferred it). The user picks any hex color (a curated preset or a custom picker); its hue/saturation drive the full `accent-50`…`accent-950` Tailwind scale via `--accent-h`/`--accent-s` on `<html>` (`lib/color.js`, `tailwind.config.js`), so every existing `accent-300`/`accent-400`/etc. class across the app repaints from that one choice — no per-component logic. Used for primary actions, active nav/tab state, focus rings, key figures worth drawing the eye to, and the rare accent glow (`shadow-accent-500/30` etc., used sparingly around 2 elements). Still never applied as a background fill larger than a button or badge, and still the *only* brand accent — no module gets a second one, regardless of which color the user picks. **Known trade-off:** gold's hue sits close to the Pending status tint below — a gold button and an amber "due soon" badge now read as near-cousins where Cyan kept them clearly apart. Accepted as the cost of this direction; if it causes real confusion, shift the Pending tint rather than the brand accent.
- **Accent Bright** (`#e0c25c`, accent-bright): hover/pressed state for accent elements only. Not a second accent color.

### Neutral
- **Void** (`#080b12`): the deepest background — the app shell itself.
- **Surface** (`#101621`): the base panel tone most screens sit on.
- **Surface Raised** (`#141a28`): a second, barely-lighter tier for panels that sit visually above Surface (e.g. a card inside a section).
- **Glass Fill** (`rgba(255,255,255,0.04)`): the default translucent card background — this, not a solid color, is how "a card" is expressed everywhere in this system.
- **Glass Fill Strong** (`rgba(255,255,255,0.10)`): hover states, active buttons, and small filled chips.
- **Glass Border** (`rgba(255,255,255,0.10)`): the standard 1px card/input border.
- **Glass Border Faint** (`rgba(255,255,255,0.05)`): dividers and quiet separators that shouldn't compete with a real border.
- **Text Primary** (`#f1f5f9`): all body and heading text on dark.
- **Text Muted** (`rgba(241,245,249,0.6)`): secondary labels, timestamps, helper text.

### Status (functional, not decorative — confirmed fixed, not open to redesign)
- **Income / Positive** (`#6ee7b7`, emerald): income, profit, completed/settled states.
- **Expense / Negative** (`#fda4af`, rose): expenses, losses, overdue states.
- **Pending** (`#fcd34d`, amber): due-soon, awaiting-action, in-progress states.

**The Tint, Never Fill Rule.** A status color is always applied as a low-opacity tint on text, border, and a 5%-opacity background wash together (see `CreditCardBillAlert`'s pattern: `border-rose-300/30 bg-rose-300/5 text-rose-200`) — never as a solid, high-opacity fill. This is what keeps three semantic colors from ever feeling like decoration next to the one true accent.

## Typography

**Display & Body Font:** system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) — no custom webfont is loaded today.

**Character:** a plain, high-legibility system stack doing all the work through weight and scale rather than personality — correct for a numbers-first daily tool, and consistent with the existing implementation (no font-family overrides found in the app beyond the system stack).

### Hierarchy
- **Display** (600 weight, `clamp(2rem, 6vw, 3rem)`, 1.1 line-height): hero figures — net worth, account/card balance, portfolio value. **This tier is currently under-used** (`text-3xl` dominates where a hero number appears; `text-6xl` appears only once in the whole app). Elevating this is the single highest-leverage move toward the "premium, glassy" target the reference screenshots point at — the hero number should be the loudest thing on any dashboard-style screen.
- **Title** (600 weight, `1.25rem`–`1.5rem`): section and card headers.
- **Body** (500 weight, `0.875rem`): the dominant text size across the app — labels, list rows, form fields.
- **Label** (600 weight, `0.75rem`, slight letter-spacing): status badges, table headers, small caps-style tags.
- **Micro-label** (400–600 weight, `0.6875rem` / `11px`): the app's real dominant helper-text size — timestamps, "Active"/status indicators, section sub-labels, hint text under a control. More common in practice than the `0.75rem` Label tier above; use it for anything smaller than body copy that isn't a tag or badge.

**The Numbers Lead Rule.** Any screen whose job is to answer "how much / how am I doing" leads with one oversized figure at Display scale before any chart, list, or secondary stat. A dashboard or module-summary screen where the biggest text on the page is a section header, not a number, has not committed to this system yet.

## Layout

Mobile-first by product requirement (confirmed in PRODUCT.md), single-page-app pattern: one root page switches between view components on client state rather than routing. Content sits in a scrollable column with `16–24px` outer padding; cards stack vertically with `8–12px` gaps on mobile. Bottom navigation owns the primary nav slot on mobile (already implemented); a sidebar takes over on desktop widths. No dedicated max-width reading column exists yet — this is a task-completion app, not a text-heavy one, so full-bleed-within-padding is the correct default over a centered narrow column.

## Elevation & Depth

This system is **tonal, not shadow-driven.** Depth is expressed almost entirely through layering translucent white over the near-black base (Glass Fill → Glass Fill Strong) and border presence (Glass Border), not `box-shadow`. Real shadows are rare and reserved for genuinely floating elements — dropdowns, modals, popovers (`shadow-lg`/`shadow-2xl` from the shared UI primitives) — never for a card sitting in normal flow.

### Named Rules
**The Glass-Over-Shadow Rule.** Reach for a lighter/stronger translucent fill before reaching for a shadow. A card gets weight from its border and fill opacity, not from a drop shadow underneath it.

**The Glow-Is-Rare Rule.** A soft accent-color glow (`shadow-accent-500/30` etc.) exists in the system today but only around two elements — treat it as a special-occasion accent for a genuinely primary action or hero element, not a default card treatment. This is the one place the reference screenshots' "neon glow" energy is allowed in, deliberately rationed.

## Shapes

Corners are generously rounded everywhere and never sharp: `12px` (`rounded-xl`) is the default for cards and buttons, `16px` for larger panels, `24px` (`rounded-3xl`) for hero/feature cards and phone-frame-style containers, and `full` for pills, avatars, and icon buttons. This scale is already the dominant pattern across the codebase (`rounded-xl` alone appears 300+ times) — preserve it rather than introducing a sharper or tighter radius language.

## Components

### Buttons
- **Shape:** `rounded-lg` (12px).
- **Primary:** `Glass Fill Strong` background, `Text Primary` text; the accent color is reserved for the hover/active state (`bg-accent`, dark text) rather than the resting state — this keeps it feeling earned rather than ambient.
- **Hover / Focus:** background shifts toward `Glass Fill Strong` or `accent`; focus ring in `accent`.
- **Ghost / Icon:** transparent at rest, `Glass Fill Strong` on hover, used for dismiss/secondary actions (see `CreditCardBillAlert`'s dismiss button).

### Cards / Containers ("Glass Card" — signature component)
- **Corner Style:** `rounded-xl` to `rounded-2xl` depending on hierarchy.
- **Background:** `Glass Fill` at rest.
- **Border:** `Glass Border` (1px), or `Glass Border Faint` for quieter internal groupings.
- **Elevation:** none by default — see Elevation & Depth.
- **Internal Padding:** `16px` standard, `24px` for a hero/feature card.

### Status Banner
- The pattern documented under Colors → Status: a status color applied as border-tint + 5%-opacity fill + tinted text together, at `rounded-xl`. This is the app's most distinctive recurring composite component (see `CreditCardBillAlert`, used identically for due-date and overdue alerts across modules).

### Navigation
- **Mobile:** bottom tab bar, already implemented; the active tab is the one place besides primary buttons where the accent color should appear at full strength.
- **Desktop:** sidebar, mirroring the same items and active-state treatment as the mobile bottom nav.

### Loading State
- Framer Motion is a real, actively-used dependency — the standard loading treatment is a **pulse animation** (a `Glass Fill` block breathing in opacity) rather than a spinner, matching the vault's "settle, don't announce" character (see `components/shared/LoadingScreen.jsx`). A hung/stuck load (no response within 12s) flips to a "taking longer than expected" state with a manual reload action, rather than pulsing forever — apply this pattern to any other long-running fetch that lacks a way out.

## Do's and Don'ts

### Do:
- **Do** treat the one signature accent color (whatever the user has picked, Gold by default) as the app's only accent everywhere — including any future module built from scratch. No module gets its own brand hue.
- **Do** lead dashboard-style and detail-summary screens with one oversized (Display-scale) figure before any chart or list.
- **Do** build depth with glass-fill/border layering first; reach for a real shadow only for genuinely floating UI (modals, dropdowns, popovers).
- **Do** keep the status-tint pattern (border + 5% fill + tinted text, never a solid fill) for every income/expense/pending signal, in every module.
- **Do** use Framer Motion for a pulse/breathing loading treatment once built, and for smooth transitions between states — motion should feel like settling, not bouncing.

### Don't:
- **Don't** introduce a second accent color for a specific module, card, or chart, even if a reference image shows one — the app committed to one signature accent.
- **Don't** raise status-color opacity to a solid fill; a red or green block reads as an alert-app or a spreadsheet, not this system.
- **Don't** add drop shadows to ordinary in-flow cards; that reads as a different, heavier design system than the one already in place.
- **Don't** push the accent glow (`shadow-accent-500/30` etc.) onto more than a small, deliberate set of elements — its rarity is what makes it register as premium rather than gimmicky.
