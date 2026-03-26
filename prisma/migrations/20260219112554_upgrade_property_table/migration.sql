/*
  Warnings:

  - The primary key for the `Property` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `ownerId` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amenities` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'PENDING', 'RENTED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'APARTMENT', 'CONDO', 'STUDIO', 'HOUSE');

-- AlterTable
ALTER TABLE "Property" DROP CONSTRAINT "Property_pkey",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "rentTerms" JSONB,
ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "viewsCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "PropertyType" NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "bedrooms" DROP NOT NULL,
ALTER COLUMN "bathrooms" DROP NOT NULL,
ALTER COLUMN "area" DROP NOT NULL,
ALTER COLUMN "area" SET DATA TYPE DOUBLE PRECISION,
DROP COLUMN "amenities",
ADD COLUMN     "amenities" JSONB NOT NULL,
ALTER COLUMN "furnishingType" DROP NOT NULL,
ALTER COLUMN "images" SET DEFAULT ARRAY[]::TEXT[],
ADD CONSTRAINT "Property_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Property_id_seq";

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_bedrooms_idx" ON "Property"("bedrooms");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_isDeleted_idx" ON "Property"("isDeleted");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
