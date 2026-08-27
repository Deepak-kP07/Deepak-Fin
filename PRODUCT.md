# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: Deepak, the app's builder and owner, tracking his own comprehensive personal finances, mobile-first, on a daily basis. He is currently the sole real user. A Family/Company profile can now be shared with a real second person by email invite, at one of three permission tiers (read/edit/admin) — that person accepts using their own account and the shared profile then shows up for them too, gated to their tier. A single Lend/Borrow record can be shared the same way, at two tiers (read/admin — no edit tier, since logging a repayment stays owner-only) — useful for looping in the actual person a loan is with, or a third party helping track it. Every other module is still Deepak's own data alone; sharing is scoped to individual Family/Company profiles and Lend/Borrow records specifically, not account-wide access.

## Product Purpose

A unified, fully customisable view of the user's entire real financial life — from daily expenses across multiple bank accounts to investments, loans, credit cards, lending/borrowing, a combined view of family accounts, and budgeting reports, in mobile and desktop web alike (one PWA, same app on both). Covers: transactions, accounts, investments (Indian equities via Zerodha Kite + Yahoo Finance fallback), loans (EMI/interest tracking), scholarships/fees, lending and borrowing with people, Family/Company money management, credit cards, savings goals (Bucket List), personal financial principles (Money Rules), budgets, an encrypted credential vault, and cross-module insights. Success means the user can see accurate, live net worth and financial state at a glance and manage every real-world financial domain they actually have, without switching apps.

## Positioning

Not a generic mass-market budgeting app (e.g. Mint/YNAB). Its differentiator is deep, bespoke modeling of one real person's actual financial life — Indian-specific investment integration (Kite-linked live equity pricing), EMI/reducing-balance loan math, scholarship/fee tracking, family money management, and an encrypted credential vault — domains a generic budgeting app doesn't model at all. Confirmed accurate by the user.

## Operating Context

- Mobile-first by explicit design intent; used as a daily driver to log transactions and check the dashboard.
- Indian financial context: ₹ currency formatting with Indian digit grouping (e.g. ₹1,00,000), DD-MMM-YYYY dates, NSE/BSE equities via Kite/Yahoo.
- Single-page-app pattern today: one Next.js App Router page (`app/page.js`) switches between ~15 view components on client-side state; no per-module URL routes.
- All data reads/writes go through one aggregation endpoint (`/api/finance/summary`) plus per-module CRUD routes, backed by Supabase (Postgres) with RLS enforced via `auth.uid() = user_id` on every table.

## Capabilities and Constraints

- All modules are fully implemented end-to-end (UI + API + DB) — confirmed no mock/sample data anywhere.
- Three themes exist and are user-selectable: Dark, Light, and Glass — plus a user-configurable accent color. Not dark-only.
- **PWA is fully implemented**: installable, offline-capable (service worker + an IndexedDB mutation outbox that flushes on reconnect).
- Push notifications are built (Web Push, opt-in per user) alongside email notifications (welcome email, weekly/monthly financial reports) via Resend.
- Auth is real Supabase auth (`@supabase/ssr`, email/password and Google OAuth), session-scoped per user, RLS-enforced.
- Multi-user access beyond the primary user is now real and shipped, but narrowly scoped: a Family/Company profile or a Lend/Borrow record can be shared with one other real person by email invite, at defined permission tiers (Family/Company: read/edit/admin; Lend/Borrow: read/admin, no edit tier since logging a repayment stays owner-only). This is not account-wide multi-user access — every other module remains the primary user's data alone. Treat broader multi-user access as still a future possibility, not committed scope.

## Brand Commitments

- App name: "Personal Finance."
- Existing established visual identity (already implemented, not a proposal): the "Quiet Vault" glassy/premium aesthetic (see `DESIGN.md`), Framer Motion used for loading/pulse animations and transitions, one user-configurable accent color driving the whole app (never a per-module accent). Three themes (Dark/Light/Glass) are all real, shipped, standing options — not just Dark. These are standing constraints for future work, not open decisions.

## Evidence on Hand

- Live Supabase (Postgres) database with a real schema (31 tables), real RLS policies, and real triggers (`sync_account_balance()`, `handle_new_user()`) — confirmed working end-to-end, not mocked.
- Real third-party integrations: Zerodha Kite Connect (OAuth + live LTP quotes) and Yahoo Finance (fallback quotes for the same NSE/BSE symbols).
- No fabricated testimonials, pricing, or customer claims exist or should be invented — this is a personal tool, not a marketed product, unless that changes.

## Product Principles

1. Model the user's actual financial life faithfully — EMI math, Indian formatting, real integrations — rather than generic budgeting abstractions.
2. Every module's numbers must come from live data (Supabase), never mock or placeholder data.
3. Cross-module data must actually connect (e.g. a loan payment updates the linked account balance; a credit card bill payment clears outstanding and logs an expense) — the dashboard and module views must never show stale or disconnected numbers.
4. Design for a single trusted user today, without foreclosing on a small number of additional real users later.
5. Mobile-first: the primary daily-use surface is a phone, not desktop.
