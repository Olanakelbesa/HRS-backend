/**
 * Structured filters extracted from natural-language search queries.
 * Only price, beds, baths, location, and amenities are applied as SQL filters.
 * Semantic terms (modern, spacious, cheap vibe) are handled by vector similarity.
 */
export interface ParsedFilters {
  location?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  amenities?: string[];
  /** Parsed by LLM for transparency; not used in SQL. */
  style?: string | null;
}

const CHEAP_PATTERN = /\b(cheap|affordable|budget|low[- ]?cost|inexpensive|economical)\b/i;
const LUXURY_PATTERN = /\b(luxury|premium|high[- ]?end|expensive|upscale)\b/i;

/** Default ceiling when user says "cheap" but gives no numeric budget (ETB). */
const DEFAULT_CHEAP_MAX_PRICE = 40_000;

function hasValue<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

export function hasStructuredFilters(filters: ParsedFilters): boolean {
  return (
    hasValue(filters.location) ||
    hasValue(filters.maxPrice) ||
    hasValue(filters.minPrice) ||
    hasValue(filters.bedrooms) ||
    hasValue(filters.bathrooms) ||
    (Array.isArray(filters.amenities) && filters.amenities.length > 0)
  );
}

/**
 * Normalizes LLM output and fills gaps from the raw query.
 * Drops style from SQL — vector embeddings cover semantic descriptors.
 */
export function normalizeParsedFilters(query: string, filters: ParsedFilters): ParsedFilters {
  const normalized: ParsedFilters = {
    location: filters.location?.trim() || null,
    maxPrice: filters.maxPrice ?? null,
    minPrice: filters.minPrice ?? null,
    bedrooms: filters.bedrooms ?? null,
    bathrooms: filters.bathrooms ?? null,
    amenities: Array.isArray(filters.amenities)
      ? filters.amenities.map((a) => String(a).trim()).filter(Boolean)
      : [],
    style: filters.style?.trim() || null,
  };

  if (CHEAP_PATTERN.test(query) && normalized.maxPrice == null) {
    normalized.maxPrice = DEFAULT_CHEAP_MAX_PRICE;
  }
  if (LUXURY_PATTERN.test(query) && normalized.minPrice == null) {
    normalized.minPrice = 50_000;
  }

  return normalized;
}

/** Filters used when strict SQL pre-filtering returns no rows. */
export function relaxFilters(filters: ParsedFilters): ParsedFilters {
  return {
    maxPrice: filters.maxPrice ?? null,
    minPrice: filters.minPrice ?? null,
    bedrooms: filters.bedrooms ?? null,
    bathrooms: filters.bathrooms ?? null,
    amenities: filters.amenities ?? [],
    location: null,
    style: filters.style ?? null,
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
 * Semantic/style terms are intentionally excluded — pgvector handles those.
 */
export function buildFilterSql(filters: ParsedFilters): string {
  let filterSql = '';

  if (hasValue(filters.maxPrice)) {
    filterSql += ` AND (p.price->>'value')::numeric <= ${Number(filters.maxPrice)}`;
  }
  if (hasValue(filters.minPrice)) {
    filterSql += ` AND (p.price->>'value')::numeric >= ${Number(filters.minPrice)}`;
  }
  if (hasValue(filters.bedrooms)) {
    filterSql += ` AND p.bedrooms >= ${Number(filters.bedrooms)}`;
  }
  if (hasValue(filters.bathrooms)) {
    filterSql += ` AND p.bathrooms >= ${Number(filters.bathrooms)}`;
  }

  if (hasValue(filters.location)) {
    const loc = sqlLikeLiteral(filters.location);
    filterSql += ` AND (
      p.location::text ILIKE ${loc} OR
      p.address::text ILIKE ${loc} OR
      p.title::text ILIKE ${loc}
    )`;
  }

  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    for (const amenity of filters.amenities) {
      const pattern = sqlLikeLiteral(amenity);
      filterSql += ` AND p.amenities::text ILIKE ${pattern}`;
    }
  }

  return filterSql;
}
