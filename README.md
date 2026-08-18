# Personal Finance

A single-user personal finance tracker — accounts, transactions, budgets, investments (with live NSE/BSE pricing via Zerodha Kite), loans, credit cards, scholarships, lend/borrow tracking, a bucket list, and money rules — built as one dashboard, no separate mobile app.

## Stack

- **Next.js 15** (App Router, plain JavaScript, no TypeScript)
- **Supabase** — Postgres + Auth (email/password and Google OAuth), accessed via `@supabase/supabase-js` and `@supabase/ssr`
- **Drizzle ORM** (`db/schema.js`) as the schema source of truth, with `drizzle-kit` for migrations
- **Tailwind CSS** for styling
- Frontend lives entirely in [app/page.js](app/page.js); the backend is a single catch-all route at [app/api/\[\[...path\]\]/route.js](app/api/%5B%5B...path%5D%5D/route.js)

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
| `KITE_API_KEY` / `KITE_API_SECRET` | Zerodha Kite Connect credentials, for live investment pricing (optional — falls back to Yahoo Finance) |

### Database

Schema is defined in [db/schema.js](db/schema.js). To apply schema changes:

```bash
npm run db:generate   # generate a new migration from schema.js changes
npm run db:push       # push schema.js directly to the database (dev convenience)
```

Row Level Security is enabled on every table (`auth.uid() = user_id`), and the app connects with the anon key so RLS is the actual enforcement layer, not just defense in depth.

## Deploying

`next.config.js` sets `output: 'standalone'`, so this is built for **container deployment**, not Vercel's zero-config path:

```bash
docker build -t personal-finance .
docker run -p 3000:3000 --env-file .env personal-finance
```
