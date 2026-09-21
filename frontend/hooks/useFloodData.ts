import { useCallback, useEffect, useState } from 'react';
import { FloodReading, FloodStation } from '../types/flood';
import { fetchFloodHistory, fetchFloodStations, fetchLatestFloodReadings } from '../services/floodService';

interface UseFloodDataResult {
  stations: FloodStation[];
  latestByStation: Record<string, FloodReading>;
  selectedStation: string | null;
  setSelectedStation: (station: string) => void;
  history: FloodReading[];
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Polls the Irrigation Department's public gauge feed (see services/floodService.ts) —
 * it's a plain REST API, not Firestore, so this refetches on an interval rather than
 * subscribing like the report hooks do.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STATION = 'Hanwella';

export function useFloodData(): UseFloodDataResult {
  const [stations, setStations] = useState<FloodStation[]>([]);
  const [latestByStation, setLatestByStation] = useState<Record<string, FloodReading>>({});
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [history, setHistory] = useState<FloodReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [stationList, latest] = await Promise.all([fetchFloodStations(), fetchLatestFloodReadings()]);
        if (cancelled) return;

        setStations(stationList);
        const byStation: Record<string, FloodReading> = {};
        latest.forEach((r) => {
          byStation[r.gauge] = r;
        });
        setLatestByStation(byStation);

        setSelectedStation((current) => {
          if (current) return current;
          const defaultStation = stationList.find((s) => s.station === DEFAULT_STATION);
          return defaultStation?.station ?? stationList[0]?.station ?? null;
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load flood data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedStation) return;
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const points = await fetchFloodHistory(selectedStation!);
        if (!cancelled) setHistory(points);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedStation, refreshTick]);

  return {
    stations,
    latestByStation,
    selectedStation,
    setSelectedStation,
    history,
    loading,
    historyLoading,
    error,
    refresh,
  };
}
