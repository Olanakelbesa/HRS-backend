import {
  hasMeaningfulPreferences,
  scorePropertyAgainstPreferences,
} from '../preferenceScoring';

describe('preferenceScoring', () => {
  describe('hasMeaningfulPreferences', () => {
    it('returns false for an empty preference object', () => {
      expect(hasMeaningfulPreferences({})).toBe(false);
    });

    it('returns true when price bounds are set', () => {
      expect(hasMeaningfulPreferences({ preferredPriceMax: 50_000 })).toBe(true);
    });

    it('returns true when preferred locations exist', () => {
      expect(
        hasMeaningfulPreferences({
          preferredLocations: [{ address: 'Bole' }],
        })
      ).toBe(true);
    });
  });

  describe('scorePropertyAgainstPreferences', () => {
    it('scores higher when price, type, and bedrooms match', () => {
      const property = {
        price: { value: 45_000, currency: 'ETB' },
        category: { en: 'Apartment' },
        bedrooms: 2,
        furnishingStatus: 'furnished',
        amenities: [{ en: 'WiFi' }],
        location: { city: 'Addis Ababa', neighborhood: 'Bole', lat: 9.0, lng: 38.75 },
        viewCount: 200,
      };

      const pref = {
        preferredPriceMin: 40_000,
        preferredPriceMax: 50_000,
        preferredType: 'APARTMENT',
        preferredBedrooms: 2,
        furnishStatus: 'furnished',
        preferredAmenities: ['wifi'],
        preferredLocations: [{ address: 'Bole', lat: 9.0, lng: 38.75 }],
      };

      const score = scorePropertyAgainstPreferences(property, pref);
      expect(score).toBeGreaterThan(200);
    });

    it('adds partial score for near-matching price', () => {
      const property = {
        price: { value: 34_000, currency: 'ETB' },
      };

      const pref = {
        preferredPriceMin: 40_000,
        preferredPriceMax: 50_000,
      };

      expect(scorePropertyAgainstPreferences(property, pref)).toBe(40);
    });

    it('converts USD prices to ETB for scoring', () => {
      const property = {
        price: { value: 800, currency: 'USD' },
      };

      const pref = {
        preferredPriceMin: 40_000,
        preferredPriceMax: 50_000,
      };

      expect(scorePropertyAgainstPreferences(property, pref)).toBe(90);
    });
  });
});
