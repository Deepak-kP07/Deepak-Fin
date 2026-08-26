---
score: 26
maxScore: 40
p0Count: 0
p1Count: 1
p2Count: 2
p3Count: 1
timestamp: 2026-08-26T10-14-37Z
slug: features-credit-cards-creditcardsview-jsx
---
# Critique — features/credit-cards/CreditCardsView.jsx (desktop, lg:+)

Score: 26/40 (65%). P1 (confirmed via DOM measurement, both assessments independently agree): hero has no lg: side-region — HeroStatTile boxes stretch from 313px to 541px wide between 1024-1920px while actual content stays ~60-90px, worst in the single-card case. P2: CTA gradient normalization was incomplete — CreditCardFlip.jsx:61, CreditCardDetailView.jsx:80, CardPayForm.jsx:54 still use the two-hue from-accent-300 to-blue-500. P2: utilisation color thresholds disagree between the hero (<=30/<=60/>60) and CreditCardFlip's own card face (<50/<80/>=80) — same metric, two different severity reads. P3: no sort/filter on card list (low priority, deferred). CreditCardFlip's own max-w-[340px] self-cap confirmed working correctly (no lone-card-stretch bug here, unlike the pre-fix Investments bug).

Resolution: add a per-card outstanding/limit breakdown as the hero's lg: side-region (same recipe as Investments' portfolio-mix bar); fix the 3 remaining blue-gradient instances; unify the utilisation-severity thresholds into one shared function.
