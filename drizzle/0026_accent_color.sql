-- The app's single global accent color (Settings > Appearance), stored as a hex string.
-- Default matches the existing hardcoded cyan-300 accent so no existing profile changes look.
ALTER TABLE "profiles" ADD COLUMN "accent_color" text NOT NULL DEFAULT '#67e8f9';
