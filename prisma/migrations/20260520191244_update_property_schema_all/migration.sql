/*
  Warnings:

  - You are about to drop the column `furnishingType` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `rentTerms` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `viewsCount` on the `Property` table. All the data in the column will be lost.
  - The `address` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `area` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `amenities` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `category` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `location` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `price` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Property_price_idx";

-- DropIndex
DROP INDEX "Property_type_idx";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "furnishingType",
DROP COLUMN "rentTerms",
DROP COLUMN "type",
DROP COLUMN "viewsCount",
ADD COLUMN     "category" JSONB NOT NULL,
ADD COLUMN     "furnishingStatus" TEXT,
ADD COLUMN     "leaseTerms" JSONB,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "location",
ADD COLUMN     "location" JSONB NOT NULL,
DROP COLUMN "address",
ADD COLUMN     "address" JSONB,
DROP COLUMN "price",
ADD COLUMN     "price" JSONB NOT NULL,
DROP COLUMN "area",
ADD COLUMN     "area" JSONB,
DROP COLUMN "amenities",
ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
