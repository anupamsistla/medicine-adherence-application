-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expiryAlertDaysBefore" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "lowStockThresholdPercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 15;
