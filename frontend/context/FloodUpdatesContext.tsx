import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFloodStations, fetchLatestFloodReadings } from '../services/floodService';
import { FloodStation, FloodReading } from '../types/flood';

const CACHE_KEY = 'flood_updates_cache';

interface FloodCache {
  stations: FloodStation[];
  latestByStation: Record<string, FloodReading>;
  lastSuccessfulUpdate: number;
}

export interface FloodUpdatesContextValue {
  stations: FloodStation[];
  latestByStation: Record<string, FloodReading>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  cached: boolean;
  lastSuccessfulUpdate: number | null;
  refresh: () => Promise<void>;
}

export const FloodUpdatesContext = createContext<FloodUpdatesContextValue | null>(null);

export function FloodUpdatesProvider({ children }: { children: React.ReactNode }) {
  const [stations, setStations] = useState<FloodStation[]>([]);
  const [latestByStation, setLatestByStation] = useState<Record<string, FloodReading>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<number | null>(null);

  const isFetchingRef = useRef(false);

  const loadCache = async () => {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY);
      if (data) {
        const parsed: FloodCache = JSON.parse(data);
        setStations(parsed.stations);
        setLatestByStation(parsed.latestByStation);
        setLastSuccessfulUpdate(parsed.lastSuccessfulUpdate);
        setCached(true);
      }
    } catch (err) {
      console.warn('Failed to load flood cache', err);
    }
  };

  const saveCache = async (cacheData: FloodCache) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.warn('Failed to save flood cache', err);
    }
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const [stationsData, readingsData] = await Promise.all([
        fetchFloodStations(),
        fetchLatestFloodReadings(),
      ]);

      const readingsRecord: Record<string, FloodReading> = {};
      readingsData.forEach((reading) => {
        readingsRecord[reading.gauge] = reading;
      });

      setStations(stationsData);
      setLatestByStation(readingsRecord);
      const now = Date.now();
      setLastSuccessfulUpdate(now);
      setError(null);
      setCached(false);

      await saveCache({
        stations: stationsData,
        latestByStation: readingsRecord,
        lastSuccessfulUpdate: now,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch flood data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadCache();
      fetchData();
    };
    init();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = async () => {
    await fetchData(true);
  };

  return (
    <FloodUpdatesContext.Provider
      value={{
        stations,
        latestByStation,
        loading,
        refreshing,
        error,
        cached,
        lastSuccessfulUpdate,
        refresh,
      }}
    >
      {children}
    </FloodUpdatesContext.Provider>
  );
}
