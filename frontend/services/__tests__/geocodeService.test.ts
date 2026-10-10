import { geocodeAddress } from '../geocodeService';

declare var global: any;

global.fetch = jest.fn();

describe('geocodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    it('returns null for an empty address', async () => {
      const result = await geocodeAddress('   ');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns latitude and longitude for a valid address', async () => {
      const mockResponse = [
        { lat: '6.9271', lon: '79.8612' }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await geocodeAddress('Colombo');
      expect(global.fetch).toHaveBeenCalled();
      expect(result).toEqual({ latitude: 6.9271, longitude: 79.8612 });
    });

    it('returns null if fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
      
      const result = await geocodeAddress('InvalidPlace');
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));
      
      const result = await geocodeAddress('ErrorPlace');
      expect(result).toBeNull();
    });
  });
});
