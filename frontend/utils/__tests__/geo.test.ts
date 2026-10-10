import { haversineMeters, isValidCoordinate, computeCentroid, uniquePoints, convexHull, hashIds } from '../geo';

describe('geo utils', () => {
  describe('haversineMeters', () => {
    it('calculates distance between two points', () => {
      // Colombo to Kandy is approx 95km
      const colombo = { latitude: 6.9271, longitude: 79.8612 };
      const kandy = { latitude: 7.2906, longitude: 80.6337 };
      const distance = haversineMeters(colombo, kandy);
      
      expect(distance).toBeGreaterThan(90000);
      expect(distance).toBeLessThan(100000);
    });

    it('returns 0 for the same point', () => {
      const p = { latitude: 6.9, longitude: 79.8 };
      expect(haversineMeters(p, p)).toBe(0);
    });
  });

  describe('isValidCoordinate', () => {
    it('validates correct coordinates', () => {
      expect(isValidCoordinate(6.9, 79.8)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    it('rejects invalid coordinates', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate('6.9', 79.8)).toBe(false);
      expect(isValidCoordinate(NaN, 0)).toBe(false);
      expect(isValidCoordinate(Infinity, 0)).toBe(false);
    });
  });

  describe('computeCentroid', () => {
    it('computes the center of points', () => {
      const points = [
        { latitude: 0, longitude: 0 },
        { latitude: 2, longitude: 2 },
      ];
      expect(computeCentroid(points)).toEqual({ latitude: 1, longitude: 1 });
    });
  });

  describe('uniquePoints', () => {
    it('deduplicates extremely close points', () => {
      const points = [
        { latitude: 6.9271001, longitude: 79.8612001 },
        { latitude: 6.9271002, longitude: 79.8612002 }, // Should dedupe with 6 precision
        { latitude: 7.0, longitude: 80.0 }
      ];
      expect(uniquePoints(points)).toHaveLength(2);
    });
  });

  describe('convexHull', () => {
    it('returns the same points if less than 3', () => {
      const pts = [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }];
      expect(convexHull(pts)).toEqual(pts);
    });

    it('calculates the hull for a square of points', () => {
      const pts = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 2 },
        { latitude: 2, longitude: 2 },
        { latitude: 2, longitude: 0 },
        { latitude: 1, longitude: 1 }, // inner point
      ];
      const hull = convexHull(pts);
      expect(hull.length).toBe(4);
    });
  });

  describe('hashIds', () => {
    it('generates a stable short hash regardless of order', () => {
      const hash1 = hashIds(['a', 'b', 'c']);
      const hash2 = hashIds(['c', 'b', 'a']);
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });
  });
});
