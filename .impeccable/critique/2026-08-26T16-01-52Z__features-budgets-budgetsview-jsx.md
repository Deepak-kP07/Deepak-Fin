---
target: Budgets view — user screenshot, GUARDRAILS header/hero card/category list
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-26T16-01-52Z
slug: features-budgets-budgetsview-jsx
---
Method: dual-agent (A: design-review agent · B: detector+browser-evidence agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Overspend severity never escalates past the `pct>=100` threshold — 100% over and 600% over render identically. |
| 2 | Match System / Real World | 3 | Plain ₹ language fits; "GUARDRAILS" eyebrow promises alarm-grade urgency the visuals under-deliver. |
| 3 | User Control and Freedom | 3 | Dismissible insights persist correctly per-line; delete confirmations aren't visible in these two files to verify further. |
| 4 | Consistency and Standards | 1 | Category dot (decorative, per-category color) sits beside a status-colored bar on the same row — two unrelated color systems in one widget; `HeroStatTile` also drops the border `StatCard` keeps for the same kind of tile. |
| 5 | Error Prevention | 2 | Confirmed live: the floating "+" add button and fixed bottom nav overlap the insight cards' "Adjust budget"/dismiss row on mobile once the list runs long — real mis-tap risk, not just a screenshot artifact. |
| 6 | Recognition Rather Than Recall | 3 | Icon/label pairing is solid (Lock/Close, Unlock/Reopen); eye-toggle relies on icon direction + tooltip only, no text. |
| 7 | Flexibility and Efficiency | 3 | Export, show/hide amounts, inline "Adjust budget" CTA are efficient shortcuts for a returning user. |
| 8 | Aesthetic and Minimalist Design | 2 | "Over by ₹X" is stated twice in one card (sub-line, then again in the stat tile) while two unrelated color systems compete underneath. |
| 9 | Error Recovery | 1 | The surface's whole job is flagging overspend; at 6x over, the headline uses only plain tinted text — weaker than the app's own Status Banner pattern used one section below in the same file. |
| 10 | Help and Documentation | 3 | The insights banner generates real contextual guidance ("trending over — at this pace, ~₹X by month end"), functioning as inline help. |
| **Total** | | **23/40** | **Acceptable** — the surface's core job (alarm communication) is its weakest area. |

## Design Specificity Verdict

**LLM assessment**: Not a generic dashboard skin — Indian ₹ grouping, "Guardrails" as deliberate category copy, correct Display-scale hero-number treatment, real shared components (`HeroStatTile`, `EmptyState`) all read as authored for this product. But it's under-committed in the one place that's this surface's entire reason to exist: severity communication. The insights banner two sections down correctly implements DESIGN.md's own Status Banner pattern (border + 5%-wash + tinted text); the hero card's headline overspend figure — the single most important number on the page — does not. That's a self-inconsistency within one file, not a generic-template problem.

**Deterministic scan**: `detect.mjs --json` on both files returned exit code 0, zero findings (`[]`), re-confirmed with `--no-config`/`--no-design-system` and cross-checked against `.impeccable/config.json`'s ignore list (neither file is suppressed). The detector's rule set doesn't currently catch severity-escalation, color-system-collision, or fixed-element-overlap issues — every priority issue below came from the LLM review and live browser evidence, not the automated scan. No false positives to report; there was nothing to second-guess.

**Visual overlays**: No browser-injected overlay was run (this target needed authenticated, seeded data rather than a static page, so Assessment B used a full isolated dev-server + Playwright pass instead of the detector's live-injection flow). In its place, real screenshots were captured at 1440px/390px, both themes, with realistic seeded data (some categories over 100%, one at 0%) — evidence is direct visual description, not an in-page overlay. Confirmed independently: the light-mode `HeroStatTile` pair does have a visible (if soft-edged, borderless) fill against the card background — less "invisible" than the user's screenshot suggested, but still lacking the crisp boundary `StatCard` gets elsewhere in the app. Also confirmed independently and not in the original complaint: on mobile, the fixed "+" add button and bottom nav bar visually overlap the last insight card's action row once three or more insights stack — a genuine interaction hazard, not just a screenshot quirk.

## Overall Impression

The bones are right — Display-scale hero number, real contextual insights, a working responsive split — but the page never commits to being an *alarm*. Everything downstream of "you are ₹2,50,686 over" reads with the same calm weight as "you are on track," which is backwards for a page whose own eyebrow says GUARDRAILS. The single biggest opportunity is making the hero card's own overspend state as visually loud as the insight banner directly beneath it already is.

## What's Working

1. **`pct` is clamped defensively at the data layer** (`lib/budgets.js`) — it prevents real layout breakage, and progress bars never visually overflow their track even at 350%+ over budget.
2. **The insights banner is a textbook-correct Status Banner** (`border-amber-300/25 bg-amber-300/5 text-amber-200`) — proof the Tint-Never-Fill pattern is already known and available in this exact file, just not applied to the more important figure above it.
3. **The `lg:` two-column split for insights/breakdown** is real responsive craft, with a code comment explaining why, not a naive full-width stack.

## Priority Issues

**[P0] The headline overspend figure uses a weaker treatment than the app's own Status Banner pattern, and severity never escalates.**
- **Why it matters**: This is explicitly a "GUARDRAILS" surface. At 6x over budget, its own hero figure reads no more urgent than a 5%-over state — the tool fails at the exact moment it matters most, and a stronger pattern already exists two lines away in the same file (the insights banner) and in `CreditCardBillAlert.jsx`.
- **Fix**: Apply border + 5%-wash + tinted-text to the "Over by" line and its stat tile once `remaining < 0`. Consider one further visual step past ~150-200% over (still a tint, never a solid fill) so 6x over reads distinctly worse than "barely over."
- **Suggested command**: `/impeccable colorize`

**[P1] Two unrelated color systems collide on every category row.**
- **Why it matters**: The leading dot is the category's own decorative color (arbitrary, assigned on category creation); the bar underneath is status-driven by spend %. A category can be 350% over and still show a "friendly" purple dot — on a page whose only job is "which of these is a problem," the user has to read text on every row instead of scanning color.
- **Fix**: Drop the decorative dot on this status-driven view — let status color alone carry meaning here. Keep category color for management screens where it's actually load-bearing.
- **Suggested command**: `/impeccable polish`

**[P1] The floating add button and bottom nav overlap the insight cards' action row on mobile.**
- **Why it matters**: Confirmed live at 390px with 3 stacked insight cards: the "+" FAB and the fixed bottom nav bar sit on top of the last card's "Adjust budget"/dismiss controls once the insight list runs long. That's a real mis-tap risk on exactly the buttons a user in an over-budget state is most likely to reach for.
- **Fix**: Add bottom padding/clearance on this view sized to the fixed nav + FAB height (the same clearance pattern already used in `AccountsView.jsx`'s `pb-16` fix for the same class of overlap), or cap/scroll the insight list so it can't grow tall enough to reach the fixed elements.
- **Suggested command**: `/impeccable layout`

**[P2] `HeroStatTile` has no border and duplicates the headline figure.**
- **Why it matters**: The tile has a soft, borderless fill (`bg-white/[.04]` / `bg-black/[.03]`) nested inside an already-faint parent card — it reads as loose floating text rather than a crisp card boundary, unlike `StatCard` elsewhere in the app which keeps a hairline border for the same kind of tile. Separately, the second tile ("Over by") just restates the figure already shown one line above it, spending a slot on repetition instead of new information.
- **Fix**: Add a hairline border to `HeroStatTile` matching `StatCard`'s convention. Replace the duplicate "Over by" tile with a non-redundant figure — days left in the month, or daily burn rate to stay on track.
- **Suggested command**: `/impeccable polish`

**[P3] Header action row is undifferentiated and cramped.**
- **Why it matters**: Export, "Plan a month," and the eye-toggle share identical visual weight in one row with no signal for which action is primary — matches the user's own "cramped and plain" read of the screenshot.
- **Fix**: Give the primary action real hierarchy (Glass Fill Strong / hover-to-accent per DESIGN.md's button-primary spec); demote Export to a lighter or icon-only affordance.
- **Suggested command**: `/impeccable layout`

## Persona Red Flags

**Alex (power user, scanning for status fast)**: Sees "Over by ₹2,50,686" stated twice in one card before reaching anything new. Can't scan the category list by color alone — dot and bar carry uncorrelated meanings, forcing a text read on every row, defeating the point of a glanceable list. Zero-spend categories render identical progress-bar chrome to active lines, just clamped to 0 width — no visual difference between "not started" and "haven't checked yet."

**Sam (accessibility-dependent, light-mode contrast)**: The `HeroStatTile` pair has no visible border in either theme — reads as loose text, not a bounded card, at low vision or high zoom. Status meaning is carried by hue alone on the progress bars (no icon or pattern redundancy), unlike `CreditCardBillAlert`'s icon+border+text reinforcement — a colorblind user gets a single thin color cue and nothing else.

**Casey (distracted mobile user, one-handed)**: The exact controls Casey would reach for in an over-budget panic — "Adjust budget," the dismiss ×, the "+" FAB — visually collide once three insights stack on a real phone screen. A quick one-handed tap near the bottom of the list risks hitting the wrong fixed element.

## Minor Observations

- Zero-spend categories (`Loan/Debt`, `software licence` in the user's original screenshot) get the full progress-bar UI instead of a distinct "not started" state.
- The progress track (`bg-white/5`) has no `light:` override in either `BudgetsView.jsx` or `BudgetMonthDetailView.jsx` — worth a contrast check, though it read acceptably in the captured light-mode screenshots.
- The eye-toggle button has no visible text label, relying on icon direction + tooltip only.

## Questions to Consider

1. If this is a "guardrails" tool, what should actually happen visually at 2x, 4x, 6x over budget — should the hero card itself escalate, the way a real alarm would, rather than a single tint threshold?
2. Does the category dot's decorative color earn its place on this specific status-driven view, or only on category-management screens where "how it looks" (not "how it's doing") is the point?
3. Is repeating "Over by ₹X" twice in one card building confidence, or filling a slot that could carry a genuinely new number — days left in the month, daily burn rate to stay on track?
