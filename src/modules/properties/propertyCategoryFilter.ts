import { PropertyType, Prisma } from '@prisma/client';
import prisma from '../../config/database';

/** Maps API enum values to category.en labels stored in the database. */
export const PROPERTY_TYPE_TO_CATEGORY_LABEL: Record<PropertyType, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  CONDO: 'Condo',
  STUDIO: 'Studio',
  HOUSE: 'House',
  SHARED_ROOM: 'Shared Room',
  SERVICED_APARTMENT: 'Serviced Apartment',
  PENTHOUSE: 'Penthouse',
};

const LABEL_BY_LOWER = Object.fromEntries(
  Object.values(PROPERTY_TYPE_TO_CATEGORY_LABEL).map((label) => [label.toLowerCase(), label])
);

/**
 * Resolve a query category param (enum or display label) to the stored category.en value.
 */
export function resolveCategoryLabel(categoryParam: string): string | null {
  const trimmed = categoryParam.trim();
  if (!trimmed) return null;

  const enumKey = trimmed.toUpperCase().replace(/\s+/g, '_') as PropertyType;
  if (PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey]) {
    return PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey];
  }

  return LABEL_BY_LOWER[trimmed.toLowerCase()] ?? null;
}

/**
 * All lowercase variants that may appear in category.en (seed labels, enum strings, etc.).
 */
export function getCategoryMatchVariants(categoryParam: string): string[] {
  const trimmed = categoryParam.trim();
  if (!trimmed) return [];

  const variants = new Set<string>();
  const enumKey = trimmed.toUpperCase().replace(/\s+/g, '_') as PropertyType;
  const label = PROPERTY_TYPE_TO_CATEGORY_LABEL[enumKey];

  if (label) {
    variants.add(label.toLowerCase());
    variants.add(enumKey.toLowerCase());
    variants.add(label);
    variants.add(enumKey);
  }

  const resolved = resolveCategoryLabel(trimmed);
  if (resolved) {
    variants.add(resolved.toLowerCase());
    variants.add(resolved);
  }

  variants.add(trimmed.toLowerCase());
  variants.add(trimmed);

  return [...variants];
}

/**
 * Find property IDs whose category.en matches the requested type.
 * Uses SQL JSON extraction (same approach as semantic search filters).
 */
export async function findPropertyIdsByCategory(categoryParam: string): Promise<string[] | null> {
  const variants = getCategoryMatchVariants(categoryParam);
  if (variants.length === 0) return null;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "Property"
    WHERE "isDeleted" = false
      AND LOWER(TRIM(category->>'en')) IN (${Prisma.join(variants.map((v) => v.toLowerCase()))})
  `;

  return rows.map((row) => row.id);
}

/**
 * Prisma JSON filter for Property.category ({ en, am }).
 * Kept for callers that only need a where fragment.
 */
export function buildCategoryWhere(categoryParam: string): Prisma.PropertyWhereInput | undefined {
  const variants = getCategoryMatchVariants(categoryParam);
  if (variants.length === 0) return undefined;

  return {
    OR: variants.map((value) => ({
      category: {
        path: ['en'],
        equals: value,
      },
    })),
  };
}
