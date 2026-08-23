-- Swap the "image link" field for a "product link" instead — a link to where the item can
-- actually be bought (e.g. the Amazon/Flipkart page), not a photo URL. Renaming (not drop+add)
-- keeps any value already there.
ALTER TABLE "bucket_list" RENAME COLUMN "image_url" TO "product_url";
