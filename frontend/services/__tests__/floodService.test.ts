import { fetchFloodStations, fetchLatestFloodReadings, getFloodStatus } from '../floodService';

declare var global: any;

// Mock global fetch
global.fetch = jest.fn();

describe('floodService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFloodStations', () => {
    it('fetches and maps flood stations correctly', async () => {
      const mockResponse = {
        features: [
          {
            attributes: {
              station: ' Colombo ',
              basin: ' Kelani ',
              Alert_Level: 4,
              Minor_Flood_Level: 5,
              Major_Flood_Level: 7,
              Unit: 'm'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const stations = await fetchFloodStations();
      
      expect(global.fetch as jest.Mock).toHaveBeenCalled();
      expect(stations).toHaveLength(1);
      expect(stations[0]).toEqual({
        station: 'Colombo',
        basin: 'Kelani',
        alertLevel: 4,
        minorFloodLevel: 5,
        majorFloodLevel: 7,
        unit: 'm'
      });
    });

    it('throws an error if fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      });

      await expect(fetchFloodStations()).rejects.toThrow('Failed to load flood stations');
    });
  });

  describe('fetchLatestFloodReadings', () => {
    it('fetches readings and deduplicates them by gauge', async () => {
      const mockResponse = {
        features: [
          {
            attributes: {
              gauge: 'Colombo',
              CreationDate: 1234567890,
              water_level: 4.5,
              basin: 'Kelani',
              alertpull: 4,
              minorpull: 5,
              majorpull: 7
            }
          },
          {
            // Duplicate gauge, should be ignored (because older in DESC order)
            attributes: {
              gauge: 'Colombo',
              CreationDate: 1234500000,
              water_level: 4.0,
              basin: 'Kelani'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const readings = await fetchLatestFloodReadings();
      
      expect(readings).toHaveLength(1);
      expect(readings[0].gauge).toBe('Colombo');
      expect(readings[0].waterLevel).toBe(4.5);
    });
  });

  describe('getFloodStatus', () => {
    it('returns minor when level is between minor and major', () => {
      const status = getFloodStatus(5.5, 4, 5, 7);
      expect(status).toBe('minor');
    });

    it('returns normal when level is below alert', () => {
      const status = getFloodStatus(3, 4, 5, 7);
      expect(status).toBe('normal');
    });
  });
});
