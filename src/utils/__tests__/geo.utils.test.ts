import { haversineDistanceKm, isWithinRadiusKm } from '../geo.utils';

describe('geo.utils', () => {
  describe('haversineDistanceKm', () => {
    it('returns 0 for the same coordinates', () => {
      expect(haversineDistanceKm(9.03, 38.74, 9.03, 38.74)).toBe(0);
    });

    it('computes a known distance between two points', () => {
      const distance = haversineDistanceKm(9.03, 38.74, 8.98, 38.76);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20);
    });
  });

  describe('isWithinRadiusKm', () => {
    it('returns true when points are within the radius', () => {
      expect(isWithinRadiusKm(9.03, 38.74, 9.031, 38.741, 5)).toBe(true);
    });

    it('returns false when points are outside the radius', () => {
      expect(isWithinRadiusKm(9.03, 38.74, 8.5, 38.0, 1)).toBe(false);
    });
  });
});
