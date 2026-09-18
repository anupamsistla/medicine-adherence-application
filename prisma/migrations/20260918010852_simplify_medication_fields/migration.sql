-- AlterTable
ALTER TABLE "Medication" DROP COLUMN "doctorContact",
DROP COLUMN "doctorName",
DROP COLUMN "requiresPrescription",
ADD COLUMN     "prescriptionPath" TEXT;
