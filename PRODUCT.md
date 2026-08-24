# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: Deepak, the app's builder and owner, tracking his own comprehensive personal finances, mobile-first, on a daily basis. He is currently the sole real user. He has a stated intent to possibly extend access to a small, selected group of other people (family/close contacts) who would each use it for their own finances — not committed or built yet, but a known future direction, not a hypothetical to ignore. Today, Family/Company money is data Deepak records about others' finances under his own account, not separate logins for those people.

## Product Purpose

A comprehensive personal finance command center covering the user's entire real financial life in one place: transactions, accounts, investments (Indian equities via Zerodha Kite + Yahoo Finance fallback), loans (EMI/interest tracking), scholarships/fees, lending and borrowing with people, a startup expense ledger (Zopkit), credit cards, savings goals (Bucket List), personal financial principles (Money Rules), budgets, and cross-module insights. Success means the user can see accurate, live net worth and financial state at a glance and manage every real-world financial domain they actually have, without switching apps.

## Positioning

Not a generic mass-market budgeting app (e.g. Mint/YNAB). Its differentiator is deep, bespoke modeling of one real person's actual financial life — Indian-specific investment integration (Kite-linked live equity pricing), EMI/reducing-balance loan math, scholarship/fee tracking, family money management, and a startup ledger — domains a generic budgeting app doesn't model at all. Confirmed accurate by the user.

## Operating Context

- Mobile-first by explicit design intent; used as a daily driver to log transactions and check the dashboard.
- Indian financial context: ₹ currency formatting with Indian digit grouping (e.g. ₹1,00,000), DD-MMM-YYYY dates, NSE/BSE equities via Kite/Yahoo.
- Single-page-app pattern today: one Next.js App Router page (`app/page.js`) switches between ~15 view components on client-side state; no per-module URL routes.
- All data reads/writes go through one aggregation endpoint (`/api/finance/summary`) plus per-module CRUD routes, backed by Supabase (Postgres) with RLS enforced via `auth.uid() = user_id` on every table.

## Capabilities and Constraints

- 11 originally-scoped modules plus 3 bonus modules (Budgets, Insights, Profile/Settings) are fully implemented end-to-end (UI + API + DB) — confirmed no mock/sample data anywhere.
- Dark-only theme currently; no light mode exists yet despite a theme picker that implies one is coming — open/undecided whether to build light mode or drop the "coming soon" copy.
- PWA (installable, offline-capable) is not implemented yet — planned in original scope, not yet built.
- Push notifications are a stated intended capability, not yet built.
- Auth is real Supabase auth (`@supabase/ssr`), session-scoped per user, RLS-enforced — the technical foundation already supports adding more real users beyond the primary one, relevant to the "maybe extend to selected others" direction under Users.
- Multi-user access beyond the primary user is a stated future possibility, not committed near-term scope. Treat single-primary-user as the safe default for now, but don't make choices that would need to be undone if it expands.

## Brand Commitments

- App name: "Personal Finance."
- Existing established visual identity (already implemented, not a proposal): dark-only theme, glassy/premium aesthetic, Framer Motion used for loading/pulse animations. These are standing constraints for future work, not open decisions.

## Evidence on Hand

- Live Supabase (Postgres) database with a real schema (19 tables), real RLS policies, and real triggers (`sync_account_balance()`, `handle_new_user()`) — confirmed working end-to-end, not mocked.
- Real third-party integrations: Zerodha Kite Connect (OAuth + live LTP quotes) and Yahoo Finance (fallback quotes for the same NSE/BSE symbols).
- No fabricated testimonials, pricing, or customer claims exist or should be invented — this is a personal tool, not a marketed product, unless that changes.

## Product Principles

1. Model the user's actual financial life faithfully — EMI math, Indian formatting, real integrations — rather than generic budgeting abstractions.
2. Every module's numbers must come from live data (Supabase), never mock or placeholder data.
3. Cross-module data must actually connect (e.g. a loan payment updates the linked account balance; a credit card bill payment clears outstanding and logs an expense) — the dashboard and module views must never show stale or disconnected numbers.
4. Design for a single trusted user today, without foreclosing on a small number of additional real users later.
5. Mobile-first: the primary daily-use surface is a phone, not desktop.
