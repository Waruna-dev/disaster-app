import React from 'react';
import { Alert, Share, Linking } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEmergencyContacts } from '../../../hooks/useEmergencyContacts';
import { useLocationHelper } from '../../../hooks/useLocationHelper';
import { useFloodData } from '../../../hooks/useFloodData';
import { useUserFloodUpdates } from '../../../hooks/useUserFloodUpdates';
import { FloodUpdatesProvider } from '../../../context/FloodUpdatesContext';
import { NearbyServicesProvider, useNearbyServicesContext } from '../../../contexts/NearbyServicesContext';
import * as floodService from '../../../services/floodService';
import { asMock } from '../../helpers/firebaseMocks';
import { jsonResponse, makeReading, makeStation } from '../../helpers/factories';

jest.mock('../../../services/floodService', () => ({
  ...jest.requireActual('../../../services/floodService'),
  fetchFloodStations: jest.fn(),
  fetchLatestFloodReadings: jest.fn(),
  fetchFloodHistory: jest.fn(),
}));

const quiet = ['error', 'warn', 'info'] as const;
let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  spies = quiet.map((m) => jest.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => spies.forEach((s) => s.mockRestore()));

const KEY = '@floodguard_personal_emergency_contacts';

describe('useEmergencyContacts', () => {
  it('loads saved contacts from AsyncStorage', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([{ id: '1', name: 'Mum', category: 'Family', phone: '0712345678', createdAt: 1 }]));
    const { result } = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(result.current.isLoadingContacts).toBe(false));
    expect(result.current.contacts.map((c) => c.name)).toEqual(['Mum']);
  });

  it('ignores corrupt or non-array storage', async () => {
    await AsyncStorage.setItem(KEY, '{"not":"an array"}');
    const { result } = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(result.current.isLoadingContacts).toBe(false));
    expect(result.current.contacts).toEqual([]);
    expect(result.current.error).toBeNull();

    await AsyncStorage.setItem(KEY, 'not json');
    const second = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(second.result.current.isLoadingContacts).toBe(false));
    expect(second.result.current.error).toBe('Failed to load contacts');
  });

  it('adds and deletes contacts, persisting each change', async () => {
    const { result } = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(result.current.isLoadingContacts).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.addContact({ name: 'Dad', category: 'Family', phone: '0771234567' });
    });
    expect(res).toEqual({ success: true });
    const [added] = result.current.contacts;
    expect(added).toMatchObject({ name: 'Dad', id: expect.any(String), createdAt: expect.any(Number) });
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!)).toHaveLength(1);

    await act(async () => {
      res = await result.current.deleteContact(added.id);
    });
    expect(res).toEqual({ success: true });
    expect(result.current.contacts).toEqual([]);
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!)).toEqual([]);
  });

  it('reports a failed save', async () => {
    const { result } = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(result.current.isLoadingContacts).toBe(false));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    let res: any;
    await act(async () => {
      res = await result.current.addContact({ name: 'X', category: 'Other', phone: '0711111111' });
    });
    expect(res).toEqual({ success: false, error: 'Failed to save contact' });
  });

  it.failing('KNOWN BUG: two quick addContact calls (before a re-render) lose the first contact', async () => {
    const { result } = await renderHook(() => useEmergencyContacts());
    await waitFor(() => expect(result.current.isLoadingContacts).toBe(false));
    const { addContact } = result.current;
    await act(async () => {
      await Promise.all([
        addContact({ name: 'A', category: 'Family', phone: '0711111111' }),
        addContact({ name: 'B', category: 'Family', phone: '0722222222' }),
      ]);
    });
    expect(result.current.contacts).toHaveLength(2);
  });
});

describe('useLocationHelper', () => {
  it('returns a Google Maps link for the current position', async () => {
    const { result } = await renderHook(() => useLocationHelper());
    let link: string | null = null;
    await act(async () => {
      link = await result.current.getCurrentLocationMapLink();
    });
    expect(link).toBe('https://www.google.com/maps/search/?api=1&query=6.9271,79.8612');
    expect(result.current.isGettingLocation).toBe(false);
  });

  it('offers Settings when permission is denied', async () => {
    asMock(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as any);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as any);
    const { result } = await renderHook(() => useLocationHelper());
    let link: string | null = 'x';
    await act(async () => {
      link = await result.current.getCurrentLocationMapLink();
    });
    expect(link).toBeNull();
    expect(alert.mock.calls[0][0]).toBe('Permission Denied');
    (alert.mock.calls[0][2] as any)[1].onPress();
    expect(openSettings).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('alerts on GPS failure only when asked to', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    asMock(Location.getCurrentPositionAsync).mockRejectedValueOnce(new Error('no fix'));
    const { result } = await renderHook(() => useLocationHelper());
    await act(async () => {
      await result.current.getCurrentLocationMapLink(false);
    });
    expect(alert).not.toHaveBeenCalled();
    asMock(Location.getCurrentPositionAsync).mockRejectedValueOnce(new Error('no fix'));
    await act(async () => {
      await result.current.getCurrentLocationMapLink(true);
    });
    expect(alert).toHaveBeenCalledWith('Location Error', expect.any(String));
    alert.mockRestore();
  });

  it('ignores a second request while one is in flight', async () => {
    let resolve!: (v: any) => void;
    asMock(Location.getCurrentPositionAsync).mockReturnValueOnce(new Promise((r) => (resolve = r)) as any);
    const { result } = await renderHook(() => useLocationHelper());
    let first: Promise<string | null>;
    let second: string | null = 'x';
    await act(async () => {
      first = result.current.getCurrentLocationMapLink();
      second = await result.current.getCurrentLocationMapLink();
      resolve({ coords: { latitude: 1, longitude: 2 } });
      await first;
    });
    expect(second).toBeNull();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('shareLocation opens the share sheet with the link', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    const { result } = await renderHook(() => useLocationHelper());
    await act(async () => {
      await result.current.shareLocation();
    });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('query=6.9271,79.8612') }));
    share.mockRestore();
  });
});

describe('useFloodData', () => {
  const stations = asMock(floodService.fetchFloodStations);
  const latest = asMock(floodService.fetchLatestFloodReadings);
  const history = asMock(floodService.fetchFloodHistory);

  it('loads stations, indexes readings by gauge, defaults to Hanwella and loads its history', async () => {
    stations.mockResolvedValue([makeStation({ station: 'Glencourse' }), makeStation({ station: 'Hanwella' })]);
    latest.mockResolvedValue([makeReading({ gauge: 'Hanwella', waterLevel: 6 })]);
    history.mockResolvedValue([makeReading({ timestamp: 1 }), makeReading({ timestamp: 2 })]);
    const { result } = await renderHook(() => useFloodData());
    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    await waitFor(() => expect(result.current.history).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedStation).toBe('Hanwella');
    expect(result.current.latestByStation.Hanwella.waterLevel).toBe(6);
    expect(history).toHaveBeenCalledWith('Hanwella');
  });

  it('falls back to the first station when Hanwella is absent, and to null when none', async () => {
    stations.mockResolvedValue([makeStation({ station: 'Glencourse' })]);
    latest.mockResolvedValue([]);
    history.mockResolvedValue([]);
    const { result } = await renderHook(() => useFloodData());
    await waitFor(() => expect(result.current.selectedStation).toBe('Glencourse'));

    stations.mockResolvedValue([]);
    const empty = await renderHook(() => useFloodData());
    await waitFor(() => expect(empty.result.current.loading).toBe(false));
    expect(empty.result.current.selectedStation).toBeNull();
  });

  it('surfaces load errors and clears history on history failure', async () => {
    stations.mockRejectedValue(new Error('ArcGIS down'));
    latest.mockResolvedValue([]);
    const { result } = await renderHook(() => useFloodData());
    await waitFor(() => expect(result.current.error).toBe('ArcGIS down'));

    stations.mockResolvedValue([makeStation()]);
    history.mockRejectedValue(new Error('x'));
    await act(() => result.current.refresh());
    await waitFor(() => expect(result.current.error).toBeNull());
    await waitFor(() => expect(result.current.historyLoading).toBe(false));
    expect(result.current.history).toEqual([]);
  });

  it('polls every 5 minutes and stops on unmount', async () => {
    jest.useFakeTimers();
    stations.mockResolvedValue([makeStation()]);
    latest.mockResolvedValue([]);
    history.mockResolvedValue([]);
    const { unmount } = await renderHook(() => useFloodData());
    await act(async () => undefined);
    expect(stations).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(stations).toHaveBeenCalledTimes(2);
    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(stations).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe('FloodUpdatesContext / useUserFloodUpdates', () => {
  const stations = asMock(floodService.fetchFloodStations);
  const latest = asMock(floodService.fetchLatestFloodReadings);
  const wrapper = ({ children }: { children: React.ReactNode }) => <FloodUpdatesProvider>{children}</FloodUpdatesProvider>;

  it('throws outside the provider', async () => {
    await expect(renderHook(() => useUserFloodUpdates())).rejects.toThrow('must be used within a FloodUpdatesProvider');
  });

  it('fetches fresh data and caches it', async () => {
    stations.mockResolvedValue([makeStation()]);
    latest.mockResolvedValue([makeReading({ gauge: 'Hanwella' })]);
    const { result } = await renderHook(() => useUserFloodUpdates(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cached).toBe(false);
    expect(result.current.error).toBeNull();
    expect(Object.keys(result.current.latestByStation)).toEqual(['Hanwella']);
    const saved = JSON.parse((await AsyncStorage.getItem('flood_updates_cache'))!);
    expect(saved.stations).toHaveLength(1);
    expect(saved.lastSuccessfulUpdate).toBe(result.current.lastSuccessfulUpdate);
  });

  it('shows cached data flagged as cached when the network fails', async () => {
    await AsyncStorage.setItem(
      'flood_updates_cache',
      JSON.stringify({ stations: [makeStation()], latestByStation: { Hanwella: makeReading() }, lastSuccessfulUpdate: 123 })
    );
    stations.mockRejectedValue(new Error('offline'));
    latest.mockResolvedValue([]);
    const { result } = await renderHook(() => useUserFloodUpdates(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ cached: true, error: 'offline', lastSuccessfulUpdate: 123 });
    expect(result.current.stations).toHaveLength(1);
  });

  it('refresh() toggles refreshing and refetches', async () => {
    stations.mockResolvedValue([]);
    latest.mockResolvedValue([]);
    const { result } = await renderHook(() => useUserFloodUpdates(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.refresh();
    });
    expect(stations).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(false);
  });
});

describe('NearbyServicesContext', () => {
  const fetchMock = jest.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => <NearbyServicesProvider>{children}</NearbyServicesProvider>;
  const HERE = { latitude: 6.9271, longitude: 79.8612 };

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  const el = (id: number, tags: Record<string, string>, dLat = 0.001, extra: Record<string, unknown> = {}) => ({
    type: 'node',
    id,
    lat: HERE.latitude + dLat,
    lon: HERE.longitude,
    tags,
    ...extra,
  });

  it('throws outside the provider', async () => {
    await expect(renderHook(() => useNearbyServicesContext())).rejects.toThrow('within a NearbyServicesProvider');
  });

  it('flags denied location permission', async () => {
    asMock(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as any);
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(result.current.locationDenied).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses, filters, names, dedupes and sorts Overpass results by distance', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        elements: [
          el(1, { amenity: 'hospital', name: 'General Hospital' }, 0.02),
          el(2, { amenity: 'police', name: 'Kollupitiya', phone: '119' }, 0.005),
          el(3, { amenity: 'police', name: 'Police Mess' }),
          el(4, { amenity: 'police', name: 'Barracks', building: 'barracks' }),
          el(5, { amenity: 'fire_station', name: 'Fire HQ', access: 'private' }),
          el(6, { amenity: 'hospital' }), // nameless
          el(7, { amenity: 'fire_station', operator: 'Colombo MC', 'addr:street': 'Main St', 'addr:city': 'Colombo' }, 0.01),
          el(1, { amenity: 'hospital', name: 'General Hospital' }, 0.02), // exact dup
          el(8, { amenity: 'hospital', name: 'general  hospital', phone: '011' }, 0.0201), // semantic dup, better score
          { type: 'way', id: 9, center: { lat: HERE.latitude + 0.03, lon: HERE.longitude }, tags: { amenity: 'hospital', name: 'Way Hospital' } },
          { type: 'node', id: 10, tags: { amenity: 'hospital', name: 'No coords' } },
        ],
      })
    );
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    const s = result.current.services;
    expect(s.map((x) => x.name)).toEqual(['Kollupitiya Police Station', 'Colombo MC', 'general  hospital', 'Way Hospital']);
    expect(s[0]).toMatchObject({ type: 'police', phone: '119', address: 'Location available on map' });
    expect(s[1]).toMatchObject({ type: 'fire_station', address: 'Main St, Colombo' });
    expect(s[3].osmType).toBe('way');
    expect(s.map((x) => x.distanceKm)).toEqual([...s.map((x) => x.distanceKm)].sort((a, b) => a - b));
    expect(result.current.userLocation).toEqual(HERE);
    expect(result.current.error).toBeNull();
    const cache = JSON.parse((await AsyncStorage.getItem('@nearby_emergency_services_v2'))!);
    expect(cache.services).toHaveLength(4);
  });

  it('serves a fresh nearby cache without hitting the network', async () => {
    await AsyncStorage.setItem(
      '@nearby_emergency_services_v2',
      JSON.stringify({ services: [{ id: 'c', name: 'Cached' }], ...HERE, updatedAt: Date.now() - 60_000 })
    );
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(result.current.services[0].name).toBe('Cached');
    expect(result.current.isUsingCache).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries with GET on 406, then the 10 km radius when 5 km is empty', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, { status: 406 }))
      .mockResolvedValueOnce(jsonResponse({ elements: [] }))
      .mockResolvedValueOnce(jsonResponse({ elements: [el(1, { amenity: 'hospital', name: 'Far Hospital' }, 0.08)] }));
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
    expect(decodeURIComponent(fetchMock.mock.calls[2][1].body)).toContain('around:10000');
    expect(result.current.services.map((s) => s.name)).toEqual(['Far Hospital']);
  });

  it('falls back to the second endpoint, then reports an error when everything fails', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    jest.useRealTimers();
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('overpass.private.coffee');
    expect(result.current.error).toBe('Could not connect to emergency service databases.');
  });

  it('keeps stale cache visible (isUsingCache) when a refresh fails', async () => {
    await AsyncStorage.setItem(
      '@nearby_emergency_services_v2',
      JSON.stringify({ services: [{ id: 'c', name: 'Stale' }], ...HERE, updatedAt: Date.now() - 60 * 60_000 })
    );
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));
    jest.useFakeTimers();
    const { result } = await renderHook(() => useNearbyServicesContext(), { wrapper });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    jest.useRealTimers();
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(result.current.services[0].name).toBe('Stale');
    expect(result.current.isUsingCache).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
