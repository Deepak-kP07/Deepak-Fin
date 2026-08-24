-- New default accent color (gold, premium black-and-gold identity). Only changes the column
-- default for future rows — existing profiles keep whatever accent_color they already have.
ALTER TABLE "profiles" ALTER COLUMN "accent_color" SET DEFAULT '#d4af37';
