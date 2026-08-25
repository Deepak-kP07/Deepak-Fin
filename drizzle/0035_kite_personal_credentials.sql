-- Each user's own Kite Connect app registration, replacing the shared KITE_API_KEY/SECRET env
-- vars — Zerodha's free/personal app tier only lets the registering account authenticate
-- through it, so a shared app can't actually onboard a second user.
ALTER TABLE "profiles" ADD COLUMN "kite_api_key" text;
ALTER TABLE "profiles" ADD COLUMN "kite_api_secret_encrypted" text;
