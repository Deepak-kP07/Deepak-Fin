---
score: 25
maxScore: 40
p0Count: 0
p1Count: 2
p2Count: 1
p3Count: 2
timestamp: 2026-08-26T04-34-25Z
slug: features-investments-investmentsview-jsx
---
# Critique — features/investments/InvestmentsView.jsx (desktop, lg:+)

Score: 25/40 (63%). P1: hero has no lg: side-region, large void at 1440-1920px. P1 (confirmed via DOM measurement): auto-fit grids stretch a lone leftover card to full container width when exactly 1 portfolio/SIP exists. P2: "Largest holdings" shows a duplicate symbol combinedHoldings correctly merges. P3: floating FAB overlaps Combined Holdings ALLOC column; second accent hue on CTA; missing role="img"/aria-label on allocation bar.

Resolution: user chose to add a broker/portfolio-mix breakdown as the hero's lg: side-region (mirroring Dashboard's assets/liabilities composition bar). All other findings being fixed directly as correctness/polish items.
