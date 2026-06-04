import {
  buildCategoryWhere,
  getCategoryMatchVariants,
  resolveCategoryLabel,
} from '../propertyCategoryFilter';

describe('propertyCategoryFilter', () => {
  describe('resolveCategoryLabel', () => {
    it('maps enum values to stored labels', () => {
      expect(resolveCategoryLabel('APARTMENT')).toBe('Apartment');
      expect(resolveCategoryLabel('SHARED_ROOM')).toBe('Shared Room');
    });

    it('maps display labels case-insensitively', () => {
      expect(resolveCategoryLabel('villa')).toBe('Villa');
      expect(resolveCategoryLabel('Serviced Apartment')).toBe('Serviced Apartment');
    });

    it('returns null for unknown categories', () => {
      expect(resolveCategoryLabel('castle')).toBeNull();
      expect(resolveCategoryLabel('')).toBeNull();
    });
  });

  describe('getCategoryMatchVariants', () => {
    it('includes enum and label variants', () => {
      const variants = getCategoryMatchVariants('APARTMENT');

      expect(variants).toEqual(
        expect.arrayContaining(['apartment', 'Apartment', 'APARTMENT'])
      );
    });
  });

  describe('buildCategoryWhere', () => {
    it('builds an OR filter for category matches', () => {
      const where = buildCategoryWhere('CONDO');

      expect(where?.OR).toEqual(
        expect.arrayContaining([
          { category: { path: ['en'], equals: 'Condo' } },
          { category: { path: ['en'], equals: 'condo' } },
        ])
      );
    });

    it('returns undefined for empty category input', () => {
      expect(buildCategoryWhere('')).toBeUndefined();
    });
  });
});
