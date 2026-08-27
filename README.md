# Personal Finance

A personal finance tracker — accounts, transactions, budgets, investments (with live NSE/BSE pricing via Zerodha Kite), loans, credit cards, scholarships, lend/borrow tracking, Family/Company money management, an encrypted credential vault, a bucket list, and money rules — built as one installable, offline-first, mobile-first PWA, no separate mobile app.

## Stack

- **Next.js 15** (App Router, plain JavaScript, no TypeScript)
- **Supabase** — Postgres + Auth (email/password and Google OAuth), accessed via `@supabase/supabase-js` and `@supabase/ssr`, with Row Level Security as the real enforcement layer
- **Drizzle ORM** (`db/schema.js`, 31 tables) as the schema source of truth, with `drizzle-kit` for migrations
- **Tailwind CSS** for styling, with a hand-built "Quiet Vault" design system (see `DESIGN.md`) and 3 themes (Dark / Light / Glass) plus a user-configurable accent color
- **Serwist** service worker (`app/sw.js`) for offline caching, an IndexedDB mutation outbox (`dexie`) for offline writes, and Web Push notifications
- **Resend** for transactional email (welcome email, weekly/monthly reports, share invites)
- Frontend lives mostly in [app/page.js](app/page.js) (single-page-app pattern) plus per-module components in `features/**`; the backend is a mix of dedicated per-resource routes under `app/api/finance/**` and a catch-all route at [app/api/\[\[...path\]\]/route.js](app/api/%5B%5B...path%5D%5D/route.js)

## Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

### Required environment variables (`.env`, never committed)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Direct Postgres connection string, used by Drizzle for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key — the app runs under RLS with this key, not the service-role key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, kept in reserve for admin-only operations (`lib/supabase/admin.js`) |
| `NEXT_PUBLIC_BASE_URL` | The app's own deployed origin |
| `KITE_API_KEY` / `KITE_API_SECRET` | App-owner fallback Zerodha Kite Connect credentials — users can also register their own per-user Kite app in Settings |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID, for Google sign-in |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend credentials — welcome email, weekly/monthly report emails, share invites |
| `VAULT_ENCRYPTION_KEY` | AES-256-GCM key (must decode to exactly 32 bytes) — encrypts Vault items and per-user Kite secrets |
| `CRON_SECRET` | Shared secret gating the 3 scheduled cron routes under `app/api/cron/` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys for browser push notifications |

### Database

Schema is defined in [db/schema.js](db/schema.js). To apply schema changes:

```bash
npm run db:generate   # generate a new migration from schema.js changes
npm run db:push       # push schema.js directly to the database (dev convenience)
```

Row Level Security is enabled on every table (`auth.uid() = user_id`), and the app connects with the anon key so RLS is the actual enforcement layer, not just defense in depth.

## Deploying

The app supports two deploy paths:

**Vercel** — `vercel.json` defines 3 cron schedules (notification checks every 30 minutes, weekly/monthly report emails). This is the intended primary target; deploy as you would any Next.js app on Vercel and set the environment variables above in the project settings.

**Container / self-hosted** — `next.config.js` also sets `output: 'standalone'`:

```bash
docker build -t personal-finance .
docker run -p 3000:3000 --env-file .env personal-finance
```

If self-hosting, you'll need to run the 3 cron jobs under `app/api/cron/` yourself on a schedule (they're plain authenticated routes, gated by `CRON_SECRET`).
