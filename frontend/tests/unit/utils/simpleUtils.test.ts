import { isValidSriLankanPhoneNumber } from '../../../utils/phoneNumber';
import { normalizeReport } from '../../../utils/normalizeReport';
import { getWarningStatus } from '../../../utils/warningStatus';
import { getRelativeTimeString } from '../../../utils/floodFormatting';
import { getOptimizedAvatarUrl } from '../../../utils/cloudinaryUtils';
import { makeWarning, ts } from '../../helpers/factories';

describe('isValidSriLankanPhoneNumber', () => {
  it.each(['0712345678', '+94712345678', '94712345678', '0112345678'])('accepts %s', (n) => {
    expect(isValidSriLankanPhoneNumber(n)).toBe(true);
  });

  it.each([
    ['too short', '071234567'],
    ['too long', '07123456789'],
    ['spaces not stripped', '071 234 5678'],
    ['hyphens not stripped', '071-234-5678'],
    ['letters', '07123abcde'],
    ['wrong country code', '+95712345678'],
    ['missing leading 0', '712345678'],
    ['empty', ''],
  ])('rejects %s', (_label, n) => {
    expect(isValidSriLankanPhoneNumber(n)).toBe(false);
  });
});

describe('normalizeReport', () => {
  it('builds a nested location from flat latitude/longitude', () => {
    const r = normalizeReport('abc', { latitude: 6.9, longitude: 79.8, affectedArea: 'X' });
    expect(r.id).toBe('abc');
    expect(r.location).toEqual({ latitude: 6.9, longitude: 79.8 });
  });

  it('keeps an existing location object untouched', () => {
    const r = normalizeReport('abc', { location: { latitude: 1, longitude: 2 }, latitude: 9, longitude: 9 });
    expect(r.location).toEqual({ latitude: 1, longitude: 2 });
  });

  it('leaves location unset when coordinates are missing or non-numeric', () => {
    expect(normalizeReport('a', {}).location).toBeUndefined();
    expect(normalizeReport('a', { latitude: '6.9', longitude: '79.8' }).location).toBeUndefined();
    expect(normalizeReport('a', { latitude: 6.9 }).location).toBeUndefined();
  });

  it('treats 0,0 as a valid numeric coordinate', () => {
    expect(normalizeReport('a', { latitude: 0, longitude: 0 }).location).toEqual({ latitude: 0, longitude: 0 });
  });

  it('lets a stray `id` field inside the document override the doc id (spread order is { id, ...data })', () => {
    expect(normalizeReport('doc-id', { id: 'field-id' }).id).toBe('field-id');
  });
});

describe('getWarningStatus', () => {
  it('returns Cancelled regardless of expiry', () => {
    expect(getWarningStatus(makeWarning({ status: 'Cancelled', expiresAt: ts(Date.now() + 1e6) }))).toBe('Cancelled');
    expect(getWarningStatus(makeWarning({ status: 'Cancelled', expiresAt: ts(Date.now() - 1e6) }))).toBe('Cancelled');
  });

  it('reports an Active warning past its expiresAt as Expired', () => {
    expect(getWarningStatus(makeWarning({ status: 'Active', expiresAt: ts(Date.now() - 1000) }))).toBe('Expired');
  });

  it('keeps a future-dated Active warning Active', () => {
    expect(getWarningStatus(makeWarning({ status: 'Active', expiresAt: ts(Date.now() + 60_000) }))).toBe('Active');
  });

  it('treats a missing expiresAt as never expiring', () => {
    expect(getWarningStatus(makeWarning({ status: 'Active', expiresAt: null }))).toBe('Active');
  });

  it('maps a stored Expired status with a future expiry back to Active (status field is not consulted)', () => {
    expect(getWarningStatus(makeWarning({ status: 'Expired', expiresAt: ts(Date.now() + 60_000) }))).toBe('Active');
  });
});

describe('getRelativeTimeString', () => {
  const NOW = new Date('2026-10-09T12:00:00Z').getTime();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => jest.useRealTimers());

  it.each([
    [null, 'Update time unavailable'],
    [undefined, 'Update time unavailable'],
    [0, 'Update time unavailable'],
    [NaN, 'Update time unavailable'],
  ])('handles empty/invalid input %p', (input, expected) => {
    expect(getRelativeTimeString(input as number | null | undefined)).toBe(expected);
  });

  it.each([
    [10_000, 'Updated just now'],
    [60_000, 'Updated 1 minute ago'],
    [5 * 60_000, 'Updated 5 minutes ago'],
    [60 * 60_000, 'Updated 1 hour ago'],
    [3 * 3_600_000, 'Updated 3 hours ago'],
    [25 * 3_600_000, 'Updated yesterday'],
    [3 * 86_400_000, 'Updated 3 days ago'],
  ])('formats a timestamp %pms old', (ago, expected) => {
    expect(getRelativeTimeString(NOW - ago)).toBe(expected);
  });

  it('clamps future timestamps to "just now"', () => {
    expect(getRelativeTimeString(NOW + 3_600_000)).toBe('Updated just now');
  });
});

describe('getOptimizedAvatarUrl', () => {
  const base = { publicId: 'p', width: null, height: null, format: null, updatedAt: 0 };

  it('returns null with no image or url', () => {
    expect(getOptimizedAvatarUrl(null)).toBeNull();
    expect(getOptimizedAvatarUrl(undefined)).toBeNull();
    expect(getOptimizedAvatarUrl({ ...base, url: '', version: null })).toBeNull();
  });

  it('passes local picker URIs straight through', () => {
    expect(getOptimizedAvatarUrl({ ...base, url: 'file:///tmp/a.jpg', version: null })).toBe('file:///tmp/a.jpg');
    expect(getOptimizedAvatarUrl({ ...base, url: 'content://media/1', version: null })).toBe('content://media/1');
  });

  it('inserts face-crop transforms and the version into a Cloudinary URL', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v111/folder/me.jpg';
    expect(getOptimizedAvatarUrl({ ...base, url, version: 222 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_256,h_256,q_auto,f_auto/v222/folder/me.jpg'
    );
  });

  it('drops the old version segment when no version is recorded', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v111/me.jpg';
    expect(getOptimizedAvatarUrl({ ...base, url, version: null })).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_256,h_256,q_auto,f_auto/me.jpg'
    );
  });

  it('returns non-Cloudinary URLs unchanged', () => {
    expect(getOptimizedAvatarUrl({ ...base, url: 'https://example.com/me.png', version: 1 })).toBe('https://example.com/me.png');
  });
});
