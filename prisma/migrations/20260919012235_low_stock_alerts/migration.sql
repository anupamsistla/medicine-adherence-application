-- AlterTable: add nullable first so existing rows aren't rejected
ALTER TABLE "Medication" ADD COLUMN "originalQuantity" DOUBLE PRECISION;
ALTER TABLE "Medication" ADD COLUMN "lowStockAlertSent" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing rows' current stock becomes their baseline
UPDATE "Medication" SET "originalQuantity" = "quantityAvailable" WHERE "originalQuantity" IS NULL;

-- Now enforce NOT NULL now that every row has a value
ALTER TABLE "Medication" ALTER COLUMN "originalQuantity" SET NOT NULL;
