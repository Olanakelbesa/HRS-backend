import type { SupportedCurrency } from './currency';

export interface ExtractedPriceBounds {
  minPrice: number | null;
  maxPrice: number | null;
  priceCurrency: SupportedCurrency;
  /** True when query used less/greater/between etc. (not a bare number). */
  hasExplicitComparator: boolean;
}

function parseNumberToken(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function detectPriceCurrency(query: string): SupportedCurrency {
  if (/\$|usd\b|dollars?\b/i.test(query)) return 'USD';
  if (/\bbirr\b|\betb\b|\bbr\b/i.test(query)) return 'ETB';
  return 'ETB';
}

/**
 * Extracts min/max rent from natural language (ETB, USD, birr).
 * Comparators are parsed before bare amounts so "greater than 15000 birr" → minPrice, not maxPrice.
 */
export function extractPriceBounds(query: string): ExtractedPriceBounds {
  const priceCurrency = detectPriceCurrency(query);
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let hasExplicitComparator = false;

  const between = query.match(
    /\bbetween\s*([\d,]+)\s*(?:birr|etb|br|usd|\$)?\s*(?:and|to|-)\s*([\d,]+)\s*(?:birr|etb|br|usd)?/i,
  );
  if (between) {
    minPrice = parseNumberToken(between[1]);
    maxPrice = parseNumberToken(between[2]);
    hasExplicitComparator = true;
    return { minPrice, maxPrice, priceCurrency, hasExplicitComparator };
  }

  const minPatterns: RegExp[] = [
    /\b(?:greater than|greater|more than|more|over|above|at least|minimum|min|from)\s*([\d,]+)/i,
    /\b(?:starting at|starts at)\s*([\d,]+)/i,
    /\b([\d,]+)\s*(?:birr|etb)\s*(?:or more|and above|minimum|\+)/i,
    /\b(?:at least|minimum)\s*([\d,]+)\s*(?:birr|etb)/i,
  ];

  for (const pattern of minPatterns) {
    const match = query.match(pattern);
    if (match) {
      minPrice = parseNumberToken(match[1]);
      hasExplicitComparator = true;
      break;
    }
  }

  const maxPatterns: RegExp[] = [
    /\b(?:less than|less|under|below|upto|up to|at most|maximum|max)\s*([\d,]+)/i,
    /\b(?:no more than|not more than|within)\s*([\d,]+)/i,
    /\b([\d,]+)\s*(?:birr|etb)\s*(?:or less|max|maximum)/i,
    /\b(?:at most|maximum)\s*([\d,]+)\s*(?:birr|etb)/i,
  ];

  for (const pattern of maxPatterns) {
    const match = query.match(pattern);
    if (match) {
      maxPrice = parseNumberToken(match[1]);
      hasExplicitComparator = true;
      break;
    }
  }

  if (!hasExplicitComparator) {
    const usdMatch = query.match(/\$\s*([\d,]+)|\b([\d,]+)\s*(?:usd|dollars?)\b/i);
    if (usdMatch) {
      maxPrice = parseNumberToken(usdMatch[1] || usdMatch[2] || '');
      return {
        minPrice,
        maxPrice,
        priceCurrency: 'USD',
        hasExplicitComparator: false,
      };
    }

    const etbMatch = query.match(/\b([\d,]+)\s*(?:birr|etb)\b/i);
    if (etbMatch) {
      maxPrice = parseNumberToken(etbMatch[1]);
      return {
        minPrice,
        maxPrice,
        priceCurrency: 'ETB',
        hasExplicitComparator: false,
      };
    }
  }

  if (/\bbirr\b|\betb\b/i.test(query)) {
    return { minPrice, maxPrice, priceCurrency: 'ETB', hasExplicitComparator };
  }

  return { minPrice, maxPrice, priceCurrency, hasExplicitComparator };
}
