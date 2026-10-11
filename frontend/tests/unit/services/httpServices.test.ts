import * as FileSystem from 'expo-file-system/legacy';
import {
  fetchFloodStations,
  fetchLatestFloodReadings,
  fetchFloodHistory,
  fetchFloodEvents,
  getFloodStatus,
} from '../../../services/floodService';
import { geocodeAddress } from '../../../services/geocodeService';
import { uploadImage } from '../../../services/imageUploadService';
import { jsonResponse } from '../../helpers/factories';
import { asMock } from '../../helpers/firebaseMocks';

const fetchMock = jest.fn();
beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

const reading = (attrs: Record<string, unknown>) => ({
  attributes: {
    gauge: 'Hanwella ',
    basin: ' Kelani Ganga',
    water_level: 5.2,
    rain_fall: 1.5,
    alertpull: 7,
    minorpull: 8,
    majorpull: 10,
    CreationDate: 1_700_000_000_000,
    ...attrs,
  },
});

describe('floodService', () => {
  describe('getFloodStatus', () => {
    it.each([
      [11, 'major'],
      [10, 'major'],
      [8.5, 'minor'],
      [7, 'alert'],
      [6.99, 'normal'],
    ])('water level %p → %s', (level, status) => {
      expect(getFloodStatus(level, 7, 8, 10)).toBe(status);
    });

    it('is unknown with no water level or no thresholds at all', () => {
      expect(getFloodStatus(null, 7, 8, 10)).toBe('unknown');
      expect(getFloodStatus(NaN, 7, 8, 10)).toBe('unknown');
      expect(getFloodStatus(5, null, null, null)).toBe('unknown');
    });

    it('evaluates whichever thresholds are present', () => {
      expect(getFloodStatus(9, null, null, 8)).toBe('major');
      expect(getFloodStatus(9, 5, null, null)).toBe('alert');
      expect(getFloodStatus(1, 5, null, null)).toBe('normal');
    });
  });

  describe('fetchFloodStations', () => {
    it('maps, trims and drops nameless stations; non-finite thresholds become null', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          features: [
            { attributes: { station: ' Hanwella ', basin: 'Kelani ', Alert_Level: 7, Minor_Flood_Level: NaN, Major_Flood_Level: null, Unit: 'ft' } },
            { attributes: { station: '   ', basin: 'x' } },
            { attributes: { station: 'Glencourse' } },
          ],
        })
      );
      const out = await fetchFloodStations();
      expect(out).toEqual([
        { station: 'Hanwella', basin: 'Kelani', alertLevel: 7, minorFloodLevel: null, majorFloodLevel: null, unit: 'ft' },
        { station: 'Glencourse', basin: '', alertLevel: null, minorFloodLevel: null, majorFloodLevel: null, unit: 'm' },
      ]);
      expect(fetchMock.mock.calls[0][0]).toContain('/hydrostations/FeatureServer/0/query');
    });

    it('passes the abort signal through', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ features: [] }));
      const controller = new AbortController();
      await fetchFloodStations(controller.signal);
      expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });

    it('throws on HTTP error or an ArcGIS error payload', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500 }));
      await expect(fetchFloodStations()).rejects.toThrow('Failed to load flood stations');
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: 'Invalid query' } }));
      await expect(fetchFloodStations()).rejects.toThrow('Invalid query');
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: {} }));
      await expect(fetchFloodStations()).rejects.toThrow('Failed to load flood stations');
    });

    it('handles a payload with no features', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      expect(await fetchFloodStations()).toEqual([]);
    });
  });

  describe('fetchLatestFloodReadings', () => {
    it('keeps the first (newest) reading per gauge and skips invalid rows', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          features: [
            reading({ CreationDate: 3 }),
            reading({ CreationDate: 2 }),
            reading({ gauge: 'Glencourse', water_level: null }),
            reading({ gauge: 'Glencourse', CreationDate: 'not-a-number' }),
            reading({ gauge: '', CreationDate: 9 }),
            reading({ gauge: 'Glencourse', CreationDate: 1, rain_fall: NaN, alertpull: null }),
          ],
        })
      );
      const out = await fetchLatestFloodReadings();
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual({
        gauge: 'Hanwella',
        basin: 'Kelani Ganga',
        waterLevel: 5.2,
        rainFall: 1.5,
        alertLevel: 7,
        minorFloodLevel: 8,
        majorFloodLevel: 10,
        timestamp: 3,
      });
      expect(out[1]).toMatchObject({ gauge: 'Glencourse', rainFall: null, alertLevel: null });
    });

    it('accepts a water level of 0', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ features: [reading({ water_level: 0 })] }));
      expect((await fetchLatestFloodReadings())[0].waterLevel).toBe(0);
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 503 }));
      await expect(fetchLatestFloodReadings()).rejects.toThrow('Failed to load flood readings');
    });
  });

  describe('fetchFloodHistory', () => {
    it('returns readings oldest-first and SQL-escapes the gauge name', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ features: [reading({ CreationDate: 3 }), reading({ CreationDate: 1 })] }));
      const out = await fetchFloodHistory("O'Brien", 20);
      expect(out.map((r) => r.timestamp)).toEqual([1, 3]);
      const url = decodeURIComponent(fetchMock.mock.calls[0][0]);
      expect(url).toContain("where=gauge='O''Brien'");
      expect(url).toContain('resultRecordCount=20');
    });

    it('throws on an error payload', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: 'bad' } }));
      await expect(fetchFloodHistory('x')).rejects.toThrow('bad');
    });
  });

  describe('fetchFloodEvents', () => {
    it('filters server-side by date window and alert threshold', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-09T12:00:00Z'));
      fetchMock.mockResolvedValueOnce(jsonResponse({ features: [reading({})] }));
      const out = await fetchFloodEvents(2);
      jest.useRealTimers();
      expect(out).toHaveLength(1);
      const url = decodeURIComponent(fetchMock.mock.calls[0][0]);
      expect(url).toContain("CreationDate >= timestamp '2026-10-07 12:00:00'");
      expect(url).toContain('water_level >= alertpull');
    });

    it('throws on failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500 }));
      await expect(fetchFloodEvents()).rejects.toThrow('Failed to load flood events');
    });
  });
});

describe('geocodeService', () => {
  it('returns null for blank input without calling the network', async () => {
    expect(await geocodeAddress('   ')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses the first Nominatim result and URL-encodes the query', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ lat: '6.9271', lon: '79.8612' }, { lat: '0', lon: '0' }]));
    expect(await geocodeAddress(' Galle Rd & 5th Lane ')).toEqual({ latitude: 6.9271, longitude: 79.8612 });
    expect(fetchMock.mock.calls[0][0]).toContain('q=Galle%20Rd%20%26%205th%20Lane');
    expect(fetchMock.mock.calls[0][1].headers['User-Agent']).toBeTruthy();
  });

  it.each([
    ['no results', jsonResponse([])],
    ['non-array body', jsonResponse({ error: 'x' })],
    ['HTTP error', jsonResponse([], { status: 429 })],
    ['unparseable coordinates', jsonResponse([{ lat: 'abc', lon: '1' }])],
  ])('returns null on %s', async (_l, res) => {
    fetchMock.mockResolvedValueOnce(res);
    expect(await geocodeAddress('Colombo')).toBeNull();
  });

  it('returns null when the network throws', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await geocodeAddress('Colombo')).toBeNull();
  });
});

describe('imageUploadService', () => {
  const upload = asMock(FileSystem.uploadAsync);
  const body = { secure_url: 'https://res.cloudinary.com/x.jpg', public_id: 'floodguard/x', version: 12, width: 640, height: 480, format: 'jpg' };

  afterEach(() => {
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'test-preset';
  });

  it('uploads a report photo to the reports folder via unsigned multipart', async () => {
    upload.mockResolvedValueOnce({ status: 200, body: JSON.stringify(body), headers: {}, mimeType: null });
    const out = await uploadImage('file:///a.jpg');
    expect(out).toEqual({ url: body.secure_url, publicId: body.public_id, version: 12, width: 640, height: 480, format: 'jpg' });
    expect(upload).toHaveBeenCalledWith('https://api.cloudinary.com/v1_1/test-cloud/image/upload', 'file:///a.jpg', {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      parameters: { upload_preset: 'test-preset', folder: 'floodguard/reports' },
    });
  });

  it('uses the profile folder for avatars and nulls missing metadata', async () => {
    upload.mockResolvedValueOnce({ status: 201, body: JSON.stringify({ secure_url: 'u', public_id: 'p' }), headers: {}, mimeType: null });
    const out = await uploadImage('file:///me.jpg', 'profile');
    expect((upload.mock.calls[0][2] as { parameters: Record<string, string> }).parameters.folder).toBe('floodguard/profile-images');
    expect(out).toEqual({ url: 'u', publicId: 'p', version: null, width: null, height: null, format: null });
  });

  it('throws with the response body on a non-2xx status', async () => {
    upload.mockResolvedValueOnce({ status: 400, body: 'Upload preset not found', headers: {}, mimeType: null });
    await expect(uploadImage('file:///a.jpg')).rejects.toThrow('Failed to upload photo to Cloudinary: Upload preset not found');
  });

  it('refuses to upload when Cloudinary env vars are missing', async () => {
    delete process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    await expect(uploadImage('file:///a.jpg')).rejects.toThrow('Cloudinary environment variables are missing.');
    expect(upload).not.toHaveBeenCalled();
  });
});
