---
name: module-audit
description: Full-app audit of the Personal Finance app's modules (Dashboard, Transactions, Accounts, Investments, Loans, Scholarships, Lend/Borrow, Zopkit, Credit Cards, Bucket List, Money Rules) — checks cross-module data flow, formatting/UI consistency, duplicate code, API route auth/validation, security (RLS, secrets, input validation), and feature completeness. Use when the user asks to audit the app, check module consistency, find duplicate code, review API routes, run a security check, or verify feature completeness across modules.
---

# Module Audit

Five independent audits of this codebase. Each is self-contained research — run
them in parallel, then merge the results into one report.

## Modules in scope

Dashboard, Transactions, Accounts, Investments, Loans, Scholarships,
Lend/Borrow, Zopkit, Credit Cards, Bucket List, Money Rules.

## How to run this skill

1. Check the invocation argument:
   - No argument, or "all" → run all 5 audits.
   - A number (1-5) or a name (flow, duplicates, api, security, features) →
     run only that audit.
2. For each audit to run, spawn one `Agent` with `subagent_type: general-purpose`
   (or `Explore` for read-only ones — all of these are read-only) in a
   **single message with one tool-call block per audit** so they run in
   parallel. `run_in_background: false` is fine to wait on since the report
   can't be written until they're all back.
3. Each agent's prompt must be self-contained: paste in the full checklist for
   that audit (below), plus this instruction: *"This is a real Next.js app,
   not a hypothetical one. Actually read the files — don't guess. For every
   finding, cite the concrete file path and line number, and quote or
   describe the exact code. If a check passes, say so briefly; don't only
   report failures. Report back in a structured format matching the
   checklist, under 500 words per audit unless a table requires more."*
4. Once all spawned audits return, synthesize a single Markdown report with
   one section per audit, preserving the output formats specified below
   (tables where called for). Do not just concatenate the raw agent
   output — reconcile overlaps (e.g. duplicate-code findings from Audit 2
   often surface again in Audit 3's route review) and flag the highest-risk
   items from Audit 4 (Security) at the very top of the report regardless of
   which audit found them.
5. If the report is long and the user may want to keep or share it, offer to
   publish it as an Artifact (load `artifact-design` first) rather than
   dumping the full thing into chat.

---

## Audit 1 — Module Flow & Consistency

**Cross-module connections — does data actually flow?**
- Transaction added with category "Investment" → reflects in portfolio holdings?
- Loan payment logged → deducts from the linked account balance?
- Scholarship payment made → updates scholarship outstanding?
- Lend transaction added → creates a `lend_borrow` record AND deducts from account?
- Credit card spend logged → increases card outstanding AND logs as expense?
- Credit card bill paid → deducts from bank account AND clears card outstanding?
- Dashboard shows live numbers from all modules, or hardcoded/stale data?

**Consistency checks:**
- Money values formatted as ₹1,00,000 (Indian format) everywhere — no ₹100000 anywhere?
- Dates consistently DD-MMM-YYYY everywhere?
- Green = income/profit, red = expense/loss, amber = pending, consistently across all modules?
- Every list/table has an empty state with a helpful message?
- Every form has proper validation and error messages?
- Floating + FAB button visible on all pages?
- Bottom navigation highlights the correct active tab on every page?

## Audit 2 — Duplicate Code & Reusability

Scan all files and find:
- Same formatting function (Indian currency, date) written in multiple files → should be one shared utility.
- Same API fetch pattern repeated across modules → should be a shared hook or helper.
- Same UI components (cards, modals, forms, tables) built multiple times → should be shared components.
- Same calculation logic (interest, EMI, outstanding) duplicated → should be one shared function.
- Same auth check written in every API route instead of a middleware.

Output: list every duplicate with file locations, what's duplicated, and what the shared component/util should be named.

## Audit 3 — API Routes & Endpoints

- List all API routes in the app.
- Does every route check authentication before doing anything?
- Does every route validate the request body (required fields, correct types, no negative amounts)?
- Does every route handle errors and return proper status codes (200, 400, 401, 404, 500)?
- Any routes that expose data from other users (missing `user_id` filter)?
- Any unused/dead API routes?
- Any missing routes that a module needs but doesn't have?

Output: table with columns `Route | Method | Auth check? | Validation? | Issues found`.

## Audit 4 — Security

**Server vs client:**
- Is `SUPABASE_SERVICE_ROLE_KEY` only used in server-side API routes — never in any component, hook, or client-side file?
- Is the `NEXT_PUBLIC_` prefix only on variables safe to expose to the browser?
- Any `console.log` statements printing sensitive data (amounts, user IDs, tokens, API keys)?
- Is the Zerodha Kite API key only in server-side code?

**Supabase RLS:**
- Is RLS enabled on every table?
- Does every policy correctly filter by `auth.uid() = user_id`?
- Any tables missing RLS policies?

**Input validation:**
- Can someone submit a negative amount anywhere?
- Can someone submit an amount of 0 where it shouldn't be allowed?
- Can someone submit extremely large numbers (overflow)?
- Are text fields sanitized?

**Auth:**
- Is every page/route protected? Can someone reach any page without logging in?
- Are session tokens handled securely?
- Is there a proper logout that clears all session data?

**Financial calculation integrity:**
- Any loan/investment calculations happening client-side where they could be manipulated?
- Are final amounts validated server-side before being stored?
- Are transactions atomic — if an account balance update fails, does the transaction also fail?

## Audit 5 — Feature Completeness

For each module, check off whether every planned feature is actually built:

- **Transactions:** Add/edit/delete? Filters by date/account/category? Search? CSV export? CSV import? Monthly pie chart? Monthly bar chart?
- **Accounts:** Add/edit/delete? Balance auto-calculated from transactions? Transfer between accounts? Account-wise history?
- **Investments:** Multiple portfolios? Holdings CRUD? Live price via Kite API? Auto-refresh during market hours? SIP tracker? Excel import? Excel export? Cross-portfolio summary?
- **Loans:** EMI payment logging? Prepayment logging? Interest saved calculation? Reduce tenure vs reduce EMI option? Progress bar? Amortization schedule?
- **Scholarships:** Batch tracking? Payment to college logging? Outstanding calculation? Link to transactions?
- **Lend/Borrow:** Add record? Partial repayment? Status auto-update? Overdue alerts?
- **Zopkit:** Income/expense logging? Running balance? Monthly summary?
- **Credit Cards:** Add card? Log spend? Outstanding calculation? Utilisation %? Due date countdown? Pay bill flow?
- **Bucket List:** Add/edit/delete? Priority tags? Months-to-achieve calculation?
- **Money Rules:** Add/edit/delete? Toggle active? Drag to reorder? Shown on dashboard?
- **Dashboard:** Net worth? All account balances? Monthly chart? Portfolio P&L? Loan summary? Scholarship debt? Lent money pending? Zopkit balance? Savings rate?

Output: one checklist per module, ✓/✗/partial with a one-line note for anything not fully built.
