import {
  addDoc, collection, deleteDoc, doc, runTransaction, serverTimestamp, Timestamp, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ActivityStatus, RescueRequestStatus, RescueTeamStatus, RescueTeamType, RiskLevel, Shelter, ShelterRequest, ShelterStatus } from './types';

/* ───────── activity log (powers dashboard + "Information Updated") ───────── */
export async function logActivity(a: { type: 'shelter' | 'rescue' | 'resource' | 'alert' | 'notification'; title: string; detail: string; location?: string | null; status: ActivityStatus; createdBy?: string | null }) {
  try { await addDoc(collection(db, 'activities'), { ...a, location: a.location ?? null, createdBy: a.createdBy ?? null, createdAt: serverTimestamp() }); }
  catch (e) { console.warn('logActivity failed', e); }
}

/* ───────── shelters ───────── */
export const deriveShelterStatus = (capacity: number, occupancy: number, closed = false): ShelterStatus => {
  if (closed) return 'Closed';
  if (capacity <= 0) return 'Full';
  const r = occupancy / capacity;
  return r >= 1 ? 'Full' : r >= 0.85 ? 'Limited' : 'Available';
};
export interface ShelterInput {
  name: string; district: string; location: string; latitude: number; longitude: number; capacity: number; currentOccupancy: number;
  facilities: string[]; status: ShelterStatus; notes?: string | null;
}
export const createShelter = (i: ShelterInput) => addDoc(collection(db, 'shelters'), { ...i, notes: i.notes ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateShelter = (id: string, i: Partial<ShelterInput>) => updateDoc(doc(db, 'shelters', id), { ...i, updatedAt: serverTimestamp() });
export const deleteShelter = (id: string) => deleteDoc(doc(db, 'shelters', id));

export const assignShelter = async (requestId: string, shelterId: string, shelterName: string, notes?: string) => {
  await runTransaction(db, async (tx) => {
    const requestRef = doc(db, 'shelterRequests', requestId);
    const shelterRef = doc(db, 'shelters', shelterId);
    const requestSnap = await tx.get(requestRef);
    const shelterSnap = await tx.get(shelterRef);

    if (!requestSnap.exists()) throw new Error('Shelter request no longer exists.');
    if (!shelterSnap.exists()) throw new Error('Selected shelter no longer exists.');

    const request = requestSnap.data() as ShelterRequest;
    const shelter = shelterSnap.data() as Shelter;
    if (request.status !== 'Pending') throw new Error('This request has already been processed.');
    if (shelter.status === 'Closed') throw new Error('This shelter is currently closed.');

    tx.update(requestRef, {
      status: 'Assigned',
      shelterId,
      shelterName,
      officerNotes: notes ?? null,
      updatedAt: serverTimestamp(),
    });
  });
};
export const setShelterRequestStatus = async (id: string, status: 'Rejected' | 'Completed', notes?: string) => {
  await runTransaction(db, async (tx) => {
    const requestRef = doc(db, 'shelterRequests', id);
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists()) throw new Error('Shelter request no longer exists.');

    const request = requestSnap.data() as ShelterRequest;
    if (status === 'Completed') {
      if (request.status !== 'Assigned') throw new Error('Only assigned requests can be marked as completed.');
      if (!request.shelterId) throw new Error('Assigned request is missing shelter details.');

      const shelterRef = doc(db, 'shelters', request.shelterId);
      const shelterSnap = await tx.get(shelterRef);
      if (!shelterSnap.exists()) throw new Error('Assigned shelter no longer exists.');

      const shelter = shelterSnap.data() as Shelter;
      const capacity = Math.max(0, Number(shelter.capacity) || 0);
      const currentOccupancy = Math.max(0, Number(shelter.currentOccupancy) || 0);
      const peopleCount = Math.max(0, Number(request.peopleCount) || 0);
      const nextOccupancy = currentOccupancy + peopleCount;
      if (nextOccupancy > capacity) throw new Error('This shelter does not have enough available capacity.');

      tx.update(shelterRef, {
        currentOccupancy: nextOccupancy,
        status: deriveShelterStatus(capacity, nextOccupancy, shelter.status === 'Closed'),
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(requestRef, {
      status,
      ...(notes !== undefined ? { officerNotes: notes } : {}),
      updatedAt: serverTimestamp(),
    });
  });
};

/* ───────── rescue teams / requests / assignments ───────── */
export interface TeamInput {
  name: string; type: RescueTeamType; district: string; members: number; equipment?: string | null; status: RescueTeamStatus;
  latitude: number; longitude: number; currentLocationLabel?: string | null;
}
export const createTeam = (i: TeamInput) => addDoc(collection(db, 'rescueTeams'), { ...i, equipment: i.equipment ?? null, currentLocationLabel: i.currentLocationLabel ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateTeam = (id: string, i: Partial<TeamInput>) => updateDoc(doc(db, 'rescueTeams', id), { ...i, updatedAt: serverTimestamp() });
export const deleteTeam = (id: string) => deleteDoc(doc(db, 'rescueTeams', id));

export const assignTeamToRequest = (id: string, teamId: string, teamName: string, notes?: string) =>
  updateDoc(doc(db, 'rescueRequests', id), { status: 'Assigned', teamId, teamName, officerNotes: notes ?? null, updatedAt: serverTimestamp() });
export const setRescueRequestStatus = (id: string, status: RescueRequestStatus, notes?: string) =>
  updateDoc(doc(db, 'rescueRequests', id), { status, ...(notes !== undefined ? { officerNotes: notes } : {}), updatedAt: serverTimestamp() });

export const createAssignment = (a: { teamId: string; teamName: string; area: string; notes?: string; createdBy?: string }) =>
  addDoc(collection(db, 'rescueAssignments'), { ...a, notes: a.notes ?? null, createdBy: a.createdBy ?? null, status: 'In Progress', createdAt: serverTimestamp() });
export const completeAssignment = (id: string) => updateDoc(doc(db, 'rescueAssignments', id), { status: 'Completed' });

/* ───────── resources ───────── */
export interface ResourceInput { name: string; category: string; unit: string; totalQuantity: number; availableQuantity: number }
export const createResource = (i: ResourceInput) => addDoc(collection(db, 'resources'), { ...i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateResource = (id: string, i: Partial<ResourceInput>) => updateDoc(doc(db, 'resources', id), { ...i, updatedAt: serverTimestamp() });
export const deleteResource = (id: string) => deleteDoc(doc(db, 'resources', id));

/** Records a distribution and deducts stock in ONE transaction so concurrent officers can't over-distribute. */
export async function recordDistribution(i: { resourceId: string; quantity: number; district: string; distributionDate: string; notes?: string; recordedBy?: string }) {
  const resRef = doc(db, 'resources', i.resourceId);
  const distRef = doc(collection(db, 'resourceDistributions'));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(resRef);
    if (!snap.exists()) throw new Error('Resource no longer exists.');
    const r = snap.data() as { name: string; category: string; unit: string; availableQuantity: number };
    if (i.quantity > r.availableQuantity) throw new Error(`Only ${r.availableQuantity} ${r.unit} available.`);
    tx.update(resRef, { availableQuantity: r.availableQuantity - i.quantity, updatedAt: serverTimestamp() });
    tx.set(distRef, {
      resourceId: i.resourceId, resourceName: r.name, category: r.category, unit: r.unit, quantity: i.quantity, district: i.district,
      distributionDate: i.distributionDate, notes: i.notes ?? null, recordedBy: i.recordedBy ?? null, createdAt: serverTimestamp(),
    });
  });
}

/* ───────── hazard warnings (same document shape the mobile app reads) ───────── */
export interface WarningInput {
  title: string; hazardType: string; riskLevel: RiskLevel; affectedArea: string; latitude: number; longitude: number; radius: number;
  message: string; expiresAt: Date; createdBy: string; createdByName?: string | null;
}
export const createWarning = (w: WarningInput) =>
  addDoc(collection(db, 'warnings'), {
    title: w.title, hazardType: w.hazardType, riskLevel: w.riskLevel, affectedArea: w.affectedArea, latitude: w.latitude, longitude: w.longitude,
    radius: w.radius, polygon: null, message: w.message, status: 'Active', createdBy: w.createdBy, createdByName: w.createdByName ?? null,
    sourceReportId: null, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(w.expiresAt),
  });
export const cancelWarning = (id: string) => updateDoc(doc(db, 'warnings', id), { status: 'Cancelled' });
export const deleteWarning = (id: string) => deleteDoc(doc(db, 'warnings', id));

/* ───────── demo data (Settings → Load Demo Data) ───────── */
export async function seedDemoData(uid: string): Promise<number> {
  const S: [string, string, string, number, number, number, number, string[]][] = [
    ['Kandy Central School', 'Kandy', 'Kandy, Central Province', 7.2906, 80.6337, 500, 350, ['Classrooms', 'Clean Water', 'Toilets']],
    ['Gampaha Sports Complex', 'Gampaha', 'Gampaha Town', 7.0873, 79.9925, 300, 300, ['Clean Water', 'Toilets', 'Electricity']],
    ['Matale University Hall', 'Matale', 'Matale Town', 7.4675, 80.6234, 200, 120, ['Classrooms', 'Kitchen', 'Medical Support']],
    ['Nuwara Eliya Stadium', 'Nuwara Eliya', 'Nuwara Eliya Town', 6.9497, 80.7891, 400, 250, ['Clean Water', 'Toilets', 'Accessibility (Disabled Friendly)']],
    ['Colombo District Hall', 'Colombo', 'Colombo 07', 6.9271, 79.8612, 600, 100, ['Classrooms', 'Clean Water', 'Electricity', 'Medical Support']],
    ['Kalutara Community Center', 'Kalutara', 'Kalutara South', 6.5854, 79.9607, 250, 230, ['Kitchen', 'Toilets']],
  ];
  for (const [name, district, location, latitude, longitude, capacity, occ, facilities] of S)
    await createShelter({ name, district, location, latitude, longitude, capacity, currentOccupancy: occ, facilities, status: deriveShelterStatus(capacity, occ) });
  const T: [string, RescueTeamType, string, number, string, RescueTeamStatus, number, number][] = [
    ['Kandy Rescue Team', 'Search & Rescue', 'Kandy', 12, '2 Vehicles, Medical Kit, Rescue Tools', 'Available', 7.2906, 80.6337],
    ['Gampaha Medical Team', 'Medical Support', 'Gampaha', 8, 'Ambulance, Medical Supplies', 'On Mission', 7.0873, 79.9925],
    ['Matale Relief Team', 'Relief Distribution', 'Matale', 10, '2 Trucks', 'Available', 7.4675, 80.6234],
    ['Colombo Support Team', 'Logistics', 'Colombo', 15, '4 Trucks, Generators', 'Unavailable', 6.9271, 79.8612],
    ['Nuwara Eliya SAR', 'Search & Rescue', 'Nuwara Eliya', 9, '1 Vehicle, Rope Rescue Kit', 'Available', 6.9497, 80.7891],
  ];
  for (const [name, type, district, members, equipment, status, latitude, longitude] of T)
    await createTeam({ name, type, district, members, equipment, status, latitude, longitude, currentLocationLabel: district });
  const R: [string, string, string, number, number][] = [
    ['Drinking Water', 'Food & Water', 'Bottles', 5000, 2500], ['Food Packs', 'Food & Water', 'Packs', 3000, 1250],
    ['Tents', 'Shelter Supplies', 'Tents', 500, 300], ['Medical Kits', 'Medical', 'Kits', 800, 150], ['Blankets', 'Clothing', 'Pieces', 1500, 900],
  ];
  for (const [name, category, unit, totalQuantity, availableQuantity] of R) await createResource({ name, category, unit, totalQuantity, availableQuantity });
  const W: [string, string, RiskLevel, string, number, number, number, string][] = [
    ['Flood Warning', 'flood', 'HIGH', 'Kandy, Matale', 7.35, 80.63, 3000, 'Rising river levels. Move to higher ground and avoid low-lying roads.'],
    ['Landslide Warning', 'landslide', 'MEDIUM', 'Nuwara Eliya', 6.95, 80.79, 2000, 'Heavy rain may trigger landslides on slopes. Stay alert.'],
    ['Strong Wind Advisory', 'flood', 'LOW', 'Gampaha', 7.09, 79.99, 1000, 'Strong winds expected. Secure loose objects.'],
  ];
  for (const [title, hazardType, riskLevel, affectedArea, latitude, longitude, radius, message] of W)
    await createWarning({ title, hazardType, riskLevel, affectedArea, latitude, longitude, radius, message, expiresAt: new Date(Date.now() + 48 * 3600e3), createdBy: uid });
  await logActivity({ type: 'notification', title: 'Demo data loaded', detail: 'Sample shelters, teams, resources and alerts', status: 'Info', createdBy: uid });
  return S.length + T.length + R.length + W.length;
}
