import type { ParsedFilters } from './filters';

export const ALLOWED_AMENITIES = [
  'gym',
  'parking',
  'wifi',
  'furnished',
  'balcony',
  'security',
  'elevator',
] as const;

export const ALLOWED_PROPERTY_TYPES = ['apartment', 'villa', 'studio', 'house'] as const;

const KEYWORD_VOCAB = ['modern', 'cheap', 'spacious', 'new', 'luxury', 'affordable', 'cozy', 'bright'] as const;

const BEDROOM_PATTERN = /\b(\d+)\s*(?:bed(?:room)?s?|br)\b/i;
const PRICE_UNDER_PATTERN = /\b(?:under|below|less than|max|upto|up to)\s*([\d,]+)\b/i;
const PRICE_OVER_PATTERN = /\b(?:over|above|more than|min|from)\s*([\d,]+)\b/i;
const NEAR_LOCATION_PATTERN = /\b(?:near|in|around|at)\s+([a-z][a-z\s-]{1,40})/i;

const KNOWN_LOCATIONS = [
  'Addis Ababa',
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

const AMENITY_ALIASES: Record<string, (typeof ALLOWED_AMENITIES)[number]> = {
  gym: 'gym',
  parking: 'parking',
  wifi: 'wifi',
  'wi-fi': 'wifi',
  furnished: 'furnished',
  balcony: 'balcony',
  security: 'security',
  elevator: 'elevator',
  lift: 'elevator',
};

const PROPERTY_TYPE_ALIASES: Record<string, (typeof ALLOWED_PROPERTY_TYPES)[number]> = {
  apartment: 'apartment',
  apartments: 'apartment',
  villa: 'villa',
  villas: 'villa',
  studio: 'studio',
  studios: 'studio',
  house: 'house',
  houses: 'house',
};

function parseNumberToken(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function applyPriceRulesFromText(query: string, filters: ParsedFilters): void {
  const lower = query.toLowerCase();

  if (/\bmid[- ]?range\b/i.test(lower) && filters.maxPrice == null) {
    filters.maxPrice = 100_000;
  }
  if (/\baffordable\b/i.test(lower) && filters.maxPrice == null) {
    filters.maxPrice = 60_000;
  }
  if (/\bcheap\b/i.test(lower) && filters.maxPrice == null) {
    filters.maxPrice = 40_000;
  }
  if (/\bluxury\b/i.test(lower) && filters.minPrice == null) {
    filters.minPrice = 120_000;
  }

  const underMatch = query.match(PRICE_UNDER_PATTERN);
  if (underMatch && filters.maxPrice == null) {
    filters.maxPrice = parseNumberToken(underMatch[1]);
  }

  const overMatch = query.match(PRICE_OVER_PATTERN);
  if (overMatch && filters.minPrice == null) {
    filters.minPrice = parseNumberToken(overMatch[1]);
  }
}

function extractKeywords(query: string): string[] {
  const lower = query.toLowerCase();
  const found = new Set<string>();

  for (const word of KEYWORD_VOCAB) {
    if (lower.includes(word)) {
      found.add(word);
    }
  }

  return [...found];
}

export function computeConfidence(filters: ParsedFilters, query: string): number {
  let score = 0;

  if (filters.location) score += 0.3;
  if (filters.bedrooms != null) score += 0.2;
  if (filters.maxPrice != null || filters.minPrice != null) score += 0.2;
  if (filters.amenities.length > 0) score += 0.2;

  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) score += 0.1;

  return Math.min(1, Math.round(score * 100) / 100);
}

export function sanitizeParsedFilters(raw: Partial<ParsedFilters>, query: string): ParsedFilters {
  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities
        .map((a) => String(a).trim().toLowerCase())
        .filter((a): a is (typeof ALLOWED_AMENITIES)[number] =>
          (ALLOWED_AMENITIES as readonly string[]).includes(a),
        )
    : [];

  let propertyType: ParsedFilters['propertyType'] = null;
  if (raw.propertyType) {
    const normalized = String(raw.propertyType).trim().toLowerCase();
    if ((ALLOWED_PROPERTY_TYPES as readonly string[]).includes(normalized)) {
      propertyType = normalized as ParsedFilters['propertyType'];
    }
  }

  const filters: ParsedFilters = {
    location: raw.location?.trim() || null,
    bedrooms: raw.bedrooms != null ? Number(raw.bedrooms) : null,
    minPrice: raw.minPrice != null ? Number(raw.minPrice) : null,
    maxPrice: raw.maxPrice != null ? Number(raw.maxPrice) : null,
    amenities,
    propertyType,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
      : [],
    confidence:
      typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1
        ? Math.round(raw.confidence * 100) / 100
        : 0,
  };

  if (Number.isNaN(filters.bedrooms as number)) filters.bedrooms = null;
  if (Number.isNaN(filters.minPrice as number)) filters.minPrice = null;
  if (Number.isNaN(filters.maxPrice as number)) filters.maxPrice = null;

  applyPriceRulesFromText(query, filters);

  if (!filters.keywords.length) {
    filters.keywords = extractKeywords(query);
  }

  if (filters.confidence === 0) {
    filters.confidence = computeConfidence(filters, query);
  }

  return filters;
}

/**
 * Rule-based parser — mirrors the Gemini spec for offline / quota fallback.
 */
export function parseQueryLocally(query: string): ParsedFilters {
  const q = query.trim();
  const lower = q.toLowerCase();

  const filters: ParsedFilters = {
    location: null,
    bedrooms: null,
    minPrice: null,
    maxPrice: null,
    amenities: [],
    propertyType: null,
    keywords: [],
    confidence: 0,
  };

  const bedroomMatch = q.match(BEDROOM_PATTERN);
  if (bedroomMatch) {
    filters.bedrooms = parseNumberToken(bedroomMatch[1]);
  }

  if (/\bstudio\b/i.test(lower)) {
    filters.propertyType = 'studio';
    if (filters.bedrooms == null) {
      filters.bedrooms = 0;
    }
  }

  for (const [alias, canonical] of Object.entries(PROPERTY_TYPE_ALIASES)) {
    if (alias === 'studios' || alias === 'studio') continue;
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
      filters.propertyType = canonical;
      break;
    }
  }

  const amenitySet = new Set<(typeof ALLOWED_AMENITIES)[number]>();
  for (const [alias, canonical] of Object.entries(AMENITY_ALIASES)) {
    if (lower.includes(alias)) {
      amenitySet.add(canonical);
    }
  }
  filters.amenities = [...amenitySet];

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

  filters.keywords = extractKeywords(q);
  applyPriceRulesFromText(q, filters);

  filters.confidence = computeConfidence(filters, q);
  return filters;
}

/** Gemini output wins when set; local parser fills gaps. */
export function mergeParsedFilters(
  primary: ParsedFilters,
  fallback: ParsedFilters,
  query: string,
): ParsedFilters {
  return sanitizeParsedFilters(
    {
      location: primary.location?.trim() || fallback.location || null,
      bedrooms: primary.bedrooms ?? fallback.bedrooms ?? null,
      minPrice: primary.minPrice ?? fallback.minPrice ?? null,
      maxPrice: primary.maxPrice ?? fallback.maxPrice ?? null,
      amenities: primary.amenities.length > 0 ? primary.amenities : fallback.amenities,
      propertyType: primary.propertyType ?? fallback.propertyType ?? null,
      keywords: primary.keywords.length > 0 ? primary.keywords : fallback.keywords,
      confidence: primary.confidence > 0 ? primary.confidence : fallback.confidence,
    },
    query,
  );
}
