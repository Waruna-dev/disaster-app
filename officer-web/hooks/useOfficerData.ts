import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Shelter, ShelterRequest } from '../types/shelter';
import { RescueTeam, RescueRequest } from '../types/rescueTeam';
import { Resource, ResourceDistribution } from '../types/resource';
import { Warning } from '../types/alert';
import { Activity, fetchRecentActivities } from '../services/activityService';
import { RescueAssignment, fetchAssignments } from '../services/rescueAssignmentService';

const load = async <T,>(name: string, order?: string): Promise<T[]> => {
  try {
    const q = order ? query(collection(db, name), orderBy(order, 'desc')) : collection(db, name);
    const snap = await getDocs(q as any);
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as T));
  } catch (e) {
    console.warn(`useOfficerData: could not load ${name}`, e);
    return [];
  }
};

export interface OfficerData {
  shelters: Shelter[]; shelterRequests: ShelterRequest[]; teams: RescueTeam[]; rescueRequests: RescueRequest[];
  resources: Resource[]; distributions: ResourceDistribution[]; warnings: Warning[]; activities: Activity[];
  assignments: RescueAssignment[];
}
const EMPTY: OfficerData = {
  shelters: [], shelterRequests: [], teams: [], rescueRequests: [], resources: [], distributions: [], warnings: [], activities: [], assignments: [],
};

/** One-shot load of everything the dashboard, reports and sidebar badges need. Call refresh() after writes. */
export function useOfficerData() {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<OfficerData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const canReadOfficerData = !authLoading && !!user && (userProfile as (typeof userProfile & { role?: string }) | null)?.role === 'admin';

  const refresh = useCallback(async () => {
    const [shelters, shelterRequests, teams, rescueRequests, resources, distributions, warnings, activities, assignments] = await Promise.all([
      load<Shelter>('shelters'), load<ShelterRequest>('shelterRequests', 'createdAt'), load<RescueTeam>('rescueTeams'),
      load<RescueRequest>('rescueRequests', 'createdAt'), load<Resource>('resources'),
      load<ResourceDistribution>('resourceDistributions', 'createdAt'), load<Warning>('warnings', 'createdAt'),
      fetchRecentActivities(30).catch(() => [] as Activity[]), fetchAssignments().catch(() => [] as RescueAssignment[]),
    ]);
    setData({ shelters, shelterRequests, teams, rescueRequests, resources, distributions, warnings, activities, assignments });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canReadOfficerData) {
      setLoading(authLoading);
      return;
    }
    refresh();
  }, [authLoading, canReadOfficerData, refresh]);
  return { ...data, loading, refresh };
}
