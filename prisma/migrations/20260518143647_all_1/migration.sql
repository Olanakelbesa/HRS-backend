-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VerificationDocument" ADD COLUMN     "note" TEXT;
