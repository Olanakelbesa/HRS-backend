import { sanitizeParsedFilters } from './queryParser';

/**
 * Structured filters from the Smart House Rental query parser.
 * SQL filters: location, price, bedrooms, amenities, propertyType.
 * Keywords are semantic — handled by vector similarity on the full query.
 */
export interface ParsedFilters {
  location: string | null;
  bedrooms: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  amenities: string[];
  propertyType: 'apartment' | 'villa' | 'studio' | 'house' | null;
  keywords: string[];
  confidence: number;
}

function hasValue<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

export function hasStructuredFilters(filters: ParsedFilters): boolean {
  return (
    hasValue(filters.location) ||
    hasValue(filters.maxPrice) ||
    hasValue(filters.minPrice) ||
    filters.bedrooms != null ||
    filters.amenities.length > 0 ||
    hasValue(filters.propertyType)
  );
}

/** Re-run sanitization after merge (price rules + confidence). */
export function finalizeParsedFilters(query: string, filters: ParsedFilters): ParsedFilters {
  return sanitizeParsedFilters(filters, query);
}

/** Filters used when strict SQL pre-filtering returns no rows. */
export function relaxFilters(filters: ParsedFilters): ParsedFilters {
  return {
    ...filters,
    location: null,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function sqlLikeLiteral(value: string): string {
  return `'%${escapeLikePattern(value)}%'`;
}

/**
 * Builds SQL AND clauses for hybrid search pre-filtering.
 */
export function buildFilterSql(filters: ParsedFilters): string {
  let filterSql = '';

  if (hasValue(filters.maxPrice)) {
    filterSql += ` AND (p.price->>'value')::numeric <= ${Number(filters.maxPrice)}`;
  }
  if (hasValue(filters.minPrice)) {
    filterSql += ` AND (p.price->>'value')::numeric >= ${Number(filters.minPrice)}`;
  }

  if (filters.bedrooms != null) {
    if (filters.bedrooms === 0 || filters.propertyType === 'studio') {
      filterSql += ` AND (p.bedrooms = 0 OR p.category::text ILIKE '%studio%')`;
    } else {
      filterSql += ` AND p.bedrooms >= ${Number(filters.bedrooms)}`;
    }
  }

  if (hasValue(filters.propertyType) && filters.bedrooms !== 0) {
    const pt = sqlLikeLiteral(filters.propertyType);
    filterSql += ` AND p.category::text ILIKE ${pt}`;
  }

  if (hasValue(filters.location)) {
    const loc = sqlLikeLiteral(filters.location);
    filterSql += ` AND (
      p.location::text ILIKE ${loc} OR
      p.address::text ILIKE ${loc} OR
      p.title::text ILIKE ${loc}
    )`;
  }

  for (const amenity of filters.amenities) {
    const pattern = sqlLikeLiteral(amenity);
    filterSql += ` AND p.amenities::text ILIKE ${pattern}`;
  }

  return filterSql;
}
