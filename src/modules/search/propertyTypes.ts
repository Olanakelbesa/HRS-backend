import type { ParsedFilters } from './filters';

/** Category.en labels in the database (seed data). */
export const PROPERTY_TYPE_CATEGORY_LABELS: Record<
  NonNullable<ParsedFilters['propertyType']>,
  string
> = {
  apartment: 'apartment',
  villa: 'villa',
  studio: 'studio',
  house: 'house',
  penthouse: 'penthouse',
  condo: 'condo',
  'shared room': 'shared room',
  'serviced apartment': 'serviced apartment',
};

/** Longer phrases first so "penthouse" wins over "house". */
export const PROPERTY_TYPE_PARSE_ORDER: Array<{
  pattern: RegExp;
  type: NonNullable<ParsedFilters['propertyType']>;
}> = [
  { pattern: /\bserviced\s+apartments?\b/i, type: 'serviced apartment' },
  { pattern: /\bshared\s+rooms?\b/i, type: 'shared room' },
  { pattern: /\bpenthouses?\b/i, type: 'penthouse' },
  { pattern: /\bapartments?\b/i, type: 'apartment' },
  { pattern: /\bvillas?\b/i, type: 'villa' },
  { pattern: /\bcondos?\b/i, type: 'condo' },
  { pattern: /\bstudios?\b/i, type: 'studio' },
  { pattern: /\bhouses?\b/i, type: 'house' },
];

export function categoryLabelForPropertyType(
  propertyType: NonNullable<ParsedFilters['propertyType']>,
): string {
  return PROPERTY_TYPE_CATEGORY_LABELS[propertyType];
}
