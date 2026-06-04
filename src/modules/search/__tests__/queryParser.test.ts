import {
  computeConfidence,
  mergeParsedFilters,
  parseQueryLocally,
  sanitizeParsedFilters,
} from '../queryParser';

describe('queryParser', () => {
  describe('parseQueryLocally', () => {
    it('extracts bedrooms, location, amenities, and property type', () => {
      const filters = parseQueryLocally('2 bedroom apartment in Bole with wifi and parking');

      expect(filters.bedrooms).toBe(2);
      expect(filters.propertyType).toBe('apartment');
      expect(filters.location).toBe('Bole');
      expect(filters.amenities).toEqual(expect.arrayContaining(['wifi', 'parking']));
    });

    it('does not treat generic house requests as property type house', () => {
      const filters = parseQueryLocally('looking for a house near Kazanchis');

      expect(filters.propertyType).toBeNull();
      expect(filters.location).toBe('Kazanchis');
    });

    it('applies affordable price cap when no explicit price is given', () => {
      const filters = parseQueryLocally('affordable studio in Piassa');

      expect(filters.propertyType).toBe('studio');
      expect(filters.maxPrice).toBe(60_000);
      expect(filters.priceCurrency).toBe('ETB');
    });
  });

  describe('computeConfidence', () => {
    it('increases confidence as more filters are detected', () => {
      const low = computeConfidence(
        {
          location: null,
          bedrooms: null,
          minPrice: null,
          maxPrice: null,
          priceCurrency: 'ETB',
          currency: 'ETB',
          amenities: [],
          propertyType: null,
          keywords: [],
          confidence: 0,
        },
        'home'
      );

      const high = computeConfidence(
        {
          location: 'Bole',
          bedrooms: 2,
          minPrice: 10_000,
          maxPrice: 50_000,
          priceCurrency: 'ETB',
          currency: 'ETB',
          amenities: ['wifi'],
          propertyType: 'apartment',
          keywords: ['modern'],
          confidence: 0,
        },
        'modern 2 bedroom apartment in Bole'
      );

      expect(high).toBeGreaterThan(low);
      expect(high).toBeLessThanOrEqual(1);
    });
  });

  describe('sanitizeParsedFilters', () => {
    it('filters unknown amenities and normalizes property type', () => {
      const filters = sanitizeParsedFilters(
        {
          amenities: ['wifi', 'pool'],
          keywords: ['Modern'],
        },
        'modern apartment with wifi'
      );

      expect(filters.amenities).toEqual(['wifi']);
      expect(filters.propertyType).toBe('apartment');
      expect(filters.keywords).toContain('modern');
    });
  });

  describe('mergeParsedFilters', () => {
    it('prefers primary values and falls back where primary is empty', () => {
      const primary = parseQueryLocally('2 bedroom apartment');
      const fallback = parseQueryLocally('villa in Bole with gym');

      const merged = mergeParsedFilters(primary, fallback, '2 bedroom apartment');

      expect(merged.bedrooms).toBe(2);
      expect(merged.propertyType).toBe('apartment');
      expect(merged.location).toBe('Bole');
      expect(merged.amenities).toEqual(expect.arrayContaining(['gym']));
    });
  });
});
