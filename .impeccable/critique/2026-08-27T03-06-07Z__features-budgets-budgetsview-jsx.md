---
target: Budgets desktop layout
total_score: 7
max_score: 12
na_heuristics: 1,2,3,5,7,9,10
p0_count: 2
p1_count: 1
timestamp: 2026-08-27T03-06-07Z
slug: features-budgets-budgetsview-jsx
---
Method: dual-agent (A: a5befbc88e3e47f30 · B: a725e72b03b73178b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 4 | Consistency and Standards | 2/4 | Hero card ignores the width-discipline pattern (`grid-cols-[repeat(auto-fit,minmax(220px,320px))]`) already used 3× lower on the same page — two composition languages on one screen. |
| 6 | Recognition Rather Than Recall | 3/4 | Icon+label pairing is solid and consistent with `HeroStatTile` conventions app-wide; docked half a point for desktop-only hover-revealed yearly-budget controls with no keyboard-focus equivalent. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Not cluttered — under-composed. Dead space beside the hero figure, an unboundedly-stretching 2-tile grid, and a fixed-pixel donut orphaned in a wide column all read as leftover space rather than intentional restraint. |
| 1,2,3,5,7,9,10 | — | n/a | Not implicated by a static, read-mostly desktop layout issue. |
| **Total** | | **7/12** | **58% — Acceptable** |

## Design Specificity Verdict

**LLM assessment**: This is a mobile-first stacked layout that was allowed to widen, not one authored for desktop. From the "Budgeted" hero figure through the stat-tile grid (`BudgetsView.jsx:106-138`), every element uses the identical class list at every breakpoint — the block is architecturally incapable of using extra horizontal space, it just gets wider margins around the same narrow content. Even the one place a `lg:` split exists (breakdown list + donut, line 172), the donut's actual rendered size is fixed in pixels (`h-56`, `outerRadius={78}`), so widening its column doesn't widen the chart. That's the precise mechanism behind "squeezed into leftover space."

**Deterministic scan**: `detect.mjs` returned zero findings (clean exit) — it doesn't have rules for missing responsive coverage, fixed-pixel chart dimensions, or computed contrast ratios, so this is a case where the mechanical scanner is silent but the desktop composition is genuinely unfinished. No false positives to reconcile since there were no findings.

**Visual overlays**: Not available — no browser automation tool is exposed in this environment. Findings below come from source review plus the screenshot you shared, not a live injected overlay.

**One correction worth noting**: the app's own shell (`app/page.js:2547`, `mx-auto max-w-[1480px]` + a 256px sidebar) caps this view's real content width at ~950–1100px even on an ultra-wide monitor — so this isn't infinite-runaway stretching, it's "unfinished within a bounded ~1000px," which is actually a more fixable problem than true unbounded stretch would be.

## Overall Impression

The card's *content* is fine — the issue is entirely that nothing here was designed to reflow at desktop width. Three sections lower on this exact same page (Other planned/Past/Yearly) already solved this with a capped `auto-fit` card grid; the highest-visibility card on the page (the current month) is the one place that pattern wasn't applied.

## What's Working

1. The status-tint composite pattern (border + 5% wash + tinted text) on the "Over by" pill and insight banners is exactly per DESIGN.md's Tint-Never-Fill rule.
2. The `auto-fit(minmax(220px,320px))` card-grid pattern used for Other planned/Past/Yearly months is a genuinely good, already-solved desktop answer — reuse it rather than inventing something new for the hero card.
3. The existing code comments (e.g. lines 140-143, on why insights got their own full-width row) show real layout reasoning already happened once in this file — it just needs extending upward.

## Priority Issues

**[P0] Hero block (Budgeted figure → Over-by pill → stat tiles) has no desktop layout at all** — `BudgetsView.jsx:106-138`
Why it matters: identical stacked-column classes at 375px and 1920px leave a large dead void beside the hero figure at desktop width — the single biggest visible symptom in your screenshot.
Fix: give this block an `lg:` flex/grid composition that puts the figure and the stat-tile cluster into deliberate, bounded regions instead of one full-width stack.
Suggested command: `/impeccable layout`

**[P0] Stat-tile grid stretches unboundedly** — `BudgetsView.jsx:121`
Why it matters: `grid grid-cols-2 gap-3` has no width ceiling, so each tile can reach ~700-800px wide with icon/label/value stuck in the corner — a near-empty box.
Fix: cap the tile cluster's width at desktop (`lg:max-w-sm`/`lg:w-80`) rather than letting it fill the card.
Suggested command: `/impeccable layout`

**[P1] Donut chart is pixel-fixed inside an elastic column** — `BudgetsView.jsx:196-206`
Why it matters: `h-56` container + fixed `innerRadius`/`outerRadius` never grow with the `1fr` column's real desktop width (≈450-480px) — this is the literal mechanism behind "squeezed into leftover space."
Fix: give the chart column a deliberate max-width/centering at `lg:`, and size the container taller so the chart reads as composed, not orphaned.
Suggested command: `/impeccable layout`

**[P2] Category-list progress bars have no width cap** — `BudgetsView.jsx:173,185`
Why it matters: at desktop width, `h-1.5` bars stretch to ~800-900px — thin stray lines rather than a considered data visualization.
Fix: cap the list column's width at `lg:`.
Suggested command: `/impeccable layout`

**[P2] Desktop-only hover-reveal controls have no keyboard-focus equivalent** — `BudgetsView.jsx:291-294`
Why it matters: yearly-budget Edit/Delete icons are `opacity-0` by default, shown only via `lg:group-hover:opacity-100` — a keyboard-only desktop user tabs onto functionally-present but invisible controls.
Fix: add `focus-within:opacity-100`/`focus-visible:opacity-100` alongside the existing hover variant.
Suggested command: `/impeccable audit`

**[P3] Icon-only buttons missing accessible names** — `BudgetsView.jsx:97,292,293`
Why it matters: delete-month and edit/delete-yearly buttons have no `title`/`aria-label`, unlike sibling icon buttons in the same file (line 84, 161) that do.
Fix: add `title`/`aria-label` matching the existing sibling pattern.
Suggested command: `/impeccable audit`

**[P3] `text-slate-500` under-delivers on DESIGN.md's own contrast intent** — `BudgetsView.jsx:107,231,241,254,270,298`
Why it matters: raw `text-slate-500` on small text computes to ~4.1:1 against the void background — below WCAG AA 4.5:1 — while DESIGN.md's own documented `text-muted` token computes to ~6.7:1. The spec already solved this; the code just isn't using it consistently.
Fix: swap `text-slate-500` for the muted-text convention already used elsewhere (e.g. `text-slate-400` reads ~7.7:1 and is already used correctly one line away at 183).
Suggested command: `/impeccable polish`

## Persona Red Flags

**Alex (Power User)**: Desktop-only hover-revealed edit/delete controls on Yearly budget cards (line 291-294) have no keyboard-focus equivalent — an efficient keyboard-first user tabbing through cards can't discover or reach these actions without a mouse.

**Sam (Accessibility-Dependent)**: Same finding compounds — the controls are invisible by default on desktop *and* unlabeled for a screen reader (no `aria-label`), so a screen-reader user gets no announcement that they exist at all until landing directly on the hidden button.

## Minor Observations

- `lg:grid-cols-[1.3fr_1fr]` (line 172) only has one breakpoint; no `xl:`/`2xl:` refinement across the 1024px→1480px-cap range the app shell actually allows, so extra width becomes pure chart-column whitespace rather than being redistributed.
- The real content-width ceiling is ~950-1100px (via `app/page.js`'s `max-w-[1480px]` shell + sidebar), not literal infinity — worth keeping in mind when picking `lg:max-w-*` values below so they're chosen relative to that real ceiling, not an assumed 1920px+ canvas.

## Questions to Consider

- Three other sections on this exact page already solved "don't let a card stretch infinitely." Why does the highest-visibility card on the screen skip that solved pattern?
- Is a single small donut chart enough content to justify a two-column claim at desktop width, or does "squeezed" really mean this card wants a third piece of content rather than trying to make one small chart fill leftover space?
