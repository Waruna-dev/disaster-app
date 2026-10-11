import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ms } from '../lib/format';
import type { Activity, RescueAssignment, RescueRequest, RescueTeam, Resource, ResourceDistribution, Shelter, ShelterRequest, Warning } from '../lib/types';

interface DataState {
  shelters: Shelter[]; shelterRequests: ShelterRequest[]; teams: RescueTeam[]; rescueRequests: RescueRequest[]; resources: Resource[];
  distributions: ResourceDistribution[]; warnings: Warning[]; activities: Activity[]; assignments: RescueAssignment[];
  loading: boolean; permissionDenied: boolean;
}
const Ctx = createContext<DataState>(null as unknown as DataState);
export const useData = () => useContext(Ctx);

const SOURCES = ['shelters', 'shelterRequests', 'rescueTeams', 'rescueRequests', 'resources', 'resourceDistributions', 'warnings', 'activities', 'rescueAssignments'] as const;
const newest = <T extends { createdAt?: { toMillis?: () => number } | null }>(a: T[]) => [...a].sort((x, y) => ms(y.createdAt as never) - ms(x.createdAt as never));

/** Live Firestore listeners: every page updates in real time as citizens submit requests. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const unsubs = SOURCES.map((name) =>
      onSnapshot(collection(db, name),
        (snap) => {
          setData((d) => ({ ...d, [name]: snap.docs.map((x) => ({ id: x.id, ...x.data() })) }));
          setReady((r) => ({ ...r, [name]: true }));
        },
        (err) => {
          console.warn(`Firestore "${name}":`, err.code);
          if (err.code === 'permission-denied') setDenied(true);
          setReady((r) => ({ ...r, [name]: true }));
        }));
    return () => unsubs.forEach((u) => u());
  }, []);

  const value = useMemo<DataState>(() => {
    const g = <T,>(k: string) => (data[k] ?? []) as T[];
    return {
      shelters: [...g<Shelter>('shelters')].sort((a, b) => a.name.localeCompare(b.name)),
      shelterRequests: newest(g<ShelterRequest>('shelterRequests')),
      teams: [...g<RescueTeam>('rescueTeams')].sort((a, b) => a.name.localeCompare(b.name)),
      rescueRequests: newest(g<RescueRequest>('rescueRequests')),
      resources: [...g<Resource>('resources')].sort((a, b) => a.name.localeCompare(b.name)),
      distributions: newest(g<ResourceDistribution>('resourceDistributions')),
      warnings: newest(g<Warning>('warnings')),
      activities: newest(g<Activity>('activities')),
      assignments: newest(g<RescueAssignment>('rescueAssignments')),
      loading: SOURCES.some((s) => !ready[s]), permissionDenied: denied,
    };
  }, [data, ready, denied]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
