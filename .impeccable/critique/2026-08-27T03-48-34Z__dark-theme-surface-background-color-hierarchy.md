---
target: Dark theme surface/background color hierarchy
total_score: 5
max_score: 12
na_heuristics: 1,2,3,5,7,9,10
p0_count: 2
p1_count: 1
timestamp: 2026-08-27T03-48-34Z
slug: dark-theme-surface-background-color-hierarchy
---
# Critique: Dark Theme Surface/Background Color Hierarchy

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 4 | Consistency and Standards | 1 | App contradicts its own DESIGN.md on Surface Raised and Glass Fill rules |
| 6 | Recognition Rather Than Recall | 2 | Container/content/chrome distinctions no longer readable from color |
| 8 | Aesthetic and Minimalist Design | 2 | Good color, spent everywhere instead of where load-bearing |
| Total | | 5/12 (42%) | Poor |

## Design Specificity Verdict
Bulk find/replace swapped every card's translucent overlay for Surface Raised (#141a28), documented as a secondary tier only. Page background moved to undocumented #0c1018, which slipped under the design-system detector's tolerance threshold.

## Priority Issues
- P0: All card hierarchy tiers collapsed into one flat solid (StatCard.jsx + ~70 files)
- P0: Floating chrome signal (modals, nav) destroyed app-wide
- P1: Undocumented #0c1018 page background in 12 places incl. PWA manifest
- P2: Documented Surface (#101621) tier unused as elevation, only as input bg
- P3: Semantic void/surface/surface-raised Tailwind tokens defined but never used
