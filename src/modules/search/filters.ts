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
const BEDROOM_PATTERN = /\b(\d+)\s*(?:bed(?:room)?s?|br)\b/i;
const BATHROOM_PATTERN = /\b(\d+)\s*bath(?:room)?s?\b/i;
const PRICE_UNDER_PATTERN = /\b(?:under|below|less than|max|upto|up to)\s*([\d,]+)\b/i;
const PRICE_OVER_PATTERN = /\b(?:over|above|more than|min|from)\s*([\d,]+)\b/i;
const NEAR_LOCATION_PATTERN = /\b(?:near|in|around|at)\s+([a-z][a-z\s-]{1,40})/i;

/** Default ceiling when user says "cheap" but gives no numeric budget (ETB). */
const DEFAULT_CHEAP_MAX_PRICE = 40_000;

/** Common Addis Ababa areas for local parsing when Gemini is unavailable. */
const KNOWN_LOCATIONS = [
  'Bole Medhanialem',
  'Bole',
  'Kazanchis',
  'Piassa',
  'Mexico Square',
  'Summit',
  'Saris',
  'Bisrate Gabriel',
  'Megenagna',
  'CMC',
  'Gerji',
  'Ayat',
  'Hayat',
  'Arat Kilo',
  'Piazza',
  'Lideta',
  'Kirkos',
  'Arada',
  'Yeka',
  'Gullele',
  'Kolfe',
  'Akaky Kaliti',
  'Nifas Silk-Lafto',
] as const;

const AMENITY_KEYWORDS: Record<string, string> = {
  wifi: 'wifi',
  wi-fi: 'wifi',
  gym: 'gym',
  parking: 'parking',
  pool: 'pool',
  elevator: 'elevator',
  lift: 'elevator',
  balcony: 'balcony',
  furnished: 'furnished',
  generator: 'generator',
  security: 'security',
  cctv: 'cctv',
};

function parseNumberToken(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Rule-based query parser used when Gemini is unavailable or rate-limited.
 */
export function parseQueryLocally(query: string): ParsedFilters {
  const q = query.trim();
  const lower = q.toLowerCase();
  const filters: ParsedFilters = {
    location: null,
    maxPrice: null,
    minPrice: null,
    bedrooms: null,
    bathrooms: null,
    amenities: [],
    style: null,
  };

  const bedroomMatch = q.match(BEDROOM_PATTERN);
  if (bedroomMatch) {
    filters.bedrooms = parseNumberToken(bedroomMatch[1]);
  }

  const bathroomMatch = q.match(BATHROOM_PATTERN);
  if (bathroomMatch) {
    filters.bathrooms = parseNumberToken(bathroomMatch[1]);
  }

  const underMatch = q.match(PRICE_UNDER_PATTERN);
  if (underMatch) {
    filters.maxPrice = parseNumberToken(underMatch[1]);
  }

  const overMatch = q.match(PRICE_OVER_PATTERN);
  if (overMatch) {
    filters.minPrice = parseNumberToken(overMatch[1]);
  }

  if (CHEAP_PATTERN.test(q) && filters.maxPrice == null) {
    filters.maxPrice = DEFAULT_CHEAP_MAX_PRICE;
  }
  if (LUXURY_PATTERN.test(q) && filters.minPrice == null) {
    filters.minPrice = 50_000;
  }

  const amenities = new Set<string>();
  for (const [keyword, canonical] of Object.entries(AMENITY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      amenities.add(canonical);
    }
  }
  filters.amenities = [...amenities];

  const sortedLocations = [...KNOWN_LOCATIONS].sort((a, b) => b.length - a.length);
  for (const area of sortedLocations) {
    if (lower.includes(area.toLowerCase())) {
      filters.location = area;
      break;
    }
  }

  if (!filters.location) {
    const nearMatch = q.match(NEAR_LOCATION_PATTERN);
    if (nearMatch) {
      const candidate = nearMatch[1]
        .replace(/\b(with|and|having|that|under|below)\b.*$/i, '')
        .trim();
      if (candidate.length >= 2) {
        filters.location = candidate
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }

  return filters;
}

/** Prefer Gemini values when present; fill gaps from local parsing. */
export function mergeParsedFilters(primary: ParsedFilters, fallback: ParsedFilters): ParsedFilters {
  return {
    location: primary.location?.trim() || fallback.location || null,
    maxPrice: primary.maxPrice ?? fallback.maxPrice ?? null,
    minPrice: primary.minPrice ?? fallback.minPrice ?? null,
    bedrooms: primary.bedrooms ?? fallback.bedrooms ?? null,
    bathrooms: primary.bathrooms ?? fallback.bathrooms ?? null,
    amenities:
      Array.isArray(primary.amenities) && primary.amenities.length > 0
        ? primary.amenities
        : fallback.amenities ?? [],
    style: primary.style?.trim() || fallback.style || null,
  };
}

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
