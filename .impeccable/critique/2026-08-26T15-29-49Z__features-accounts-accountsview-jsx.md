---
target: Accounts module mobile view (AccountsView.jsx + AccountDetailView.jsx)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-26T15-29-49Z
slug: features-accounts-accountsview-jsx
---
Method: dual-agent (A: general-purpose · B: general-purpose)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good — MonthCursor, activity count, select-mode toolbar all confirm state clearly |
| 2 | Match System / Real World | 3 | Correct financial vocabulary, but the truncated subtitle ("De…") breaks language into a glitch |
| 3 | User Control and Freedom | 3 | Back/Cancel/deselect all present; bulk-delete undo not visible in these two files |
| 4 | Consistency and Standards | 1 | The card grid keeps a persistent edit icon the app's own sibling screens (Transactions ledger, this same detail page's activity list) just abandoned in favor of tap/long-press |
| 5 | Error Prevention | 1 | Edit icon sits ~26×26px next to a full-card tap target with no buffer — a real mis-tap setup |
| 6 | Recognition Rather Than Recall | 2 | Truncated metadata forces guessing; 2-column layout makes balance comparison memory-dependent instead of a single scan |
| 7 | Flexibility and Efficiency | 3 | Long-press multi-select is genuinely efficient; no search/sort for many-accounts case |
| 8 | Aesthetic and Minimalist Design | 2 | 6 elements packed into ~170px per mobile card — dense relative to the rest of this same module |
| 9 | Error Recovery | 3 | Empty state handled properly; no visible failed-load state in these files |
| 10 | Help and Documentation | 3 | Not really applicable at this scale; nothing demands missing in-context help |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

**Partially authored, partially generic — and the split is diagnostic.** The "Total balance" hero card and the detail page's stat row genuinely commit to DESIGN.md's "Numbers Lead" rule and tonal glass system. The **account card grid** is a generic icon-bubble-corner-action stat-tile pattern that doesn't know it's showing a real person's actual bank balances — it treats an account like a metric tile. The activity-list port (from the Transactions ledger pattern) is mechanically excellent and faithful, but applying an all-accounts ledger's density to a single account's scoped activity is a question the port didn't ask, just inherited.

**Deterministic scan (Assessment B):** `node detect.mjs --json` on both files — exit 0, zero findings. Nothing to flag as false positive; the detector is clean.

**Visual overlays:** not run — this screen requires an authenticated session against real financial data (no public/demo route), so live browser injection was deliberately skipped rather than logging into the user's live account. Judgment here is grounded in full source review plus the user's own two screenshots.

## Overall Impression

The module has one genuinely well-executed screen element (the Total Balance hero) sitting directly above one genuinely under-executed one (the 2-up account card grid), and the whiplash between "one big calm number" and "four small anxious ones" is very likely the real, un-articulated source of "it doesn't feel good" — not just the edit icon, though that's real too. The single biggest opportunity: the app already solved "scannable list of money-things on mobile" in the Transactions ledger. The account list doesn't reuse it, and should.

## What's Working

1. **The Total Balance hero card** — Display-scale figure, quiet label, Bank/Cash split underneath without competing for primacy. Correct execution of the Numbers Lead rule.
2. **The activity-list port is mechanically excellent** — reuses the exact long-press/select-mode machinery, category-colored icon bubbles, and description/subtitle convention verbatim from the proven Transactions pattern, and correctly drops the floating trash icon that made the "before" screenshot feel broken.
3. **The detail page's stat row** stacks to single-column on mobile, letting each number breathe — exactly the treatment the list screen's card grid is missing.

## Priority Issues

**[P0] Edit icon still on the mobile account card**
- Why it matters: explicitly, directly flagged by the user twice now; also breaks the consistency the app's own sibling screens just established (tap/long-press, no persistent icons), and sits close enough to the card's own full-tap target to cause real mis-taps.
- Fix: remove it from the mobile card entirely — editing already lives on the account's own detail page header, which is correct and sufficient.
- Suggested command: `/impeccable distill`

**[P0] 2-up density is the wrong call for account balances specifically**
- Why it matters: forces the balance figure down to a compressed size, competing with 5 other elements in ~170px — violates Numbers Lead at the one place (an account balance) it should apply almost as strongly as net worth. Financial figures favor a single vertical scan (recognition) over side-by-side comparison (recall).
- Fix: single-column, full-width row per account on mobile — icon + name/subtitle left, balance right-aligned, mirroring the ledger-row pattern already proven twice elsewhere in this codebase. Also resolves the truncation issue below by giving metadata room.
- Suggested command: `/impeccable layout`

**[P1] Truncated subtitle metadata reads as broken, not stylish**
- Why it matters: "De…" cutting off mid-word inside "Debit Card Linked" looks like the app failed to render rather than compacted intentionally — a bad first impression on a screen that's supposed to build trust with real money.
- Fix: the single-column fix above mostly resolves this by freeing width; independently, consider a small badge/icon for "debit card linked" instead of trailing text.
- Suggested command: `/impeccable clarify`

**[P1] Floating "+" FAB overlaps card content**
- Why it matters: the global quick-add-transaction FAB sits over the last card's "Opening" line on a short, unscrolled account list — real balance data gets physically obscured. Also questionable whether "add transaction" is even the right primary action to float over an Accounts screen.
- Fix: ensure the list/grid always reserves real bottom clearance regardless of scroll position (an explicit spacer sized to FAB height + margin, not just container padding).
- Suggested command: `/impeccable adapt`

**[P2] Category pill → plain-text subtitle is a real (if likely acceptable) trade-off**
- Why it matters: the new mobile activity row folds category into plain text colored only via a 16px icon glyph, versus the old legible colored pill — probably fine given a single account's activity is less category-diverse than the full ledger, but it was an inherited decision, not a deliberate one.
- Fix: confirm the trade-off is intentional; likely no change needed.
- Suggested command: `/impeccable polish` (final pass, once the above are resolved)

## Persona Red Flags

**Casey (distracted, one-handed mobile user):** the edit-icon/card-tap adjacency is exactly Casey's failure mode — a one-handed thumb reaching for the card clips the pencil icon instead, landing in an unwanted edit flow on a screen full of real money.

**Riley (stress-tester):** with 15+ accounts, the 2-up grid becomes a wall of dense, truncated cards with no search/sort. Riley is also most likely to bulk-select and delete transactions in the new select-mode toolbar — no visible confirmation/undo step for bulk delete in these two files is worth double-checking upstream.

**Jordan (confused first-timer):** "De…" has no way to be understood on a first visit — it just looks broken, which is a costly first impression specifically for a money app, where trust is the whole product.

## Minor Observations

- `AccountsView.jsx`'s subtitle line lacks a `light:` text-color override most sibling lines carry — likely harmless (slate-500 isn't redefined per-theme) but worth a quick confirm.
- `capitalize` is applied to the whole concatenated subtitle string rather than just the type word — could produce odd capitalization on lowercase bank names.
- DESIGN.md documents zero light-theme tokens anywhere — it's a dark-first spec with `light:` variants bolted on ad hoc through component code, not the system doc itself. Worth a future `/impeccable document` pass to catch it up.
- The detail page's activity row nests the trailing amount inside the tappable button, while the Transactions ledger keeps it as a sibling outside the button — functionally equivalent, but a small structural divergence between two near-identical components worth normalizing later.

## Questions to Consider

1. If the Total Balance hero is allowed to be big and calm, why does the very next thing — the accounts that number is made of — get shrunk into the densest treatment on the screen?
2. The app already solved "scannable list of money-things on mobile" in the Transactions ledger. Why doesn't the Accounts list just reuse that exact row pattern?
3. Is 2-up ever the right density for financial totals in this app, or was it borrowed from a "card grid looks modern" instinct rather than derived from what makes currency legible? If Investments or Credit Cards is tempted toward the same pattern next, this is the cautionary tale.
