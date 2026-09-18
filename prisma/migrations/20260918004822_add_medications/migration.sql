-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "times" TEXT[],
    "daysOfWeek" INTEGER[],
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "quantityAvailable" DOUBLE PRECISION NOT NULL,
    "amountPerDose" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "medicalCondition" TEXT,
    "importance" "Importance" NOT NULL DEFAULT 'MEDIUM',
    "doctorName" TEXT,
    "doctorContact" TEXT,
    "expiryDate" TIMESTAMP(3),
    "imagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_userId_idx" ON "Medication"("userId");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
