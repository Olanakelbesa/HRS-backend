-- Add property types used by the rental seed and preference endpoints.
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SHARED_ROOM';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SERVICED_APARTMENT';

-- Store amenities as bilingual JSON objects instead of plain text arrays.
ALTER TABLE "Property"
  ALTER COLUMN "amenities" DROP DEFAULT,
  ALTER COLUMN "amenities" TYPE JSONB USING to_jsonb("amenities"),
  ALTER COLUMN "amenities" SET DEFAULT '[]'::jsonb;
