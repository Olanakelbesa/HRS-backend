import { PropertyType, Prisma } from '@prisma/client';

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
 * Prisma JSON filter for Property.category ({ en, am }).
 */
export function buildCategoryWhere(categoryParam: string): Prisma.PropertyWhereInput['category'] {
  const label = resolveCategoryLabel(categoryParam);
  if (!label) return undefined;

  return {
    path: ['en'],
    equals: label,
  };
}
