/*
  Warnings:

  - Made the column `status` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Payment_paidAt_idx";

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "paidAt" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
