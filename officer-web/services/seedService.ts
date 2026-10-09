import { createShelter, deriveShelterStatus } from './shelterService';
import { createRescueTeam } from './rescueTeamService';
import { createResource } from './resourceService';
import { createWarning } from './alertService';
import { logActivity } from './activityService';

/** Inserts realistic Sri Lankan sample data so a fresh Firebase project has something to show. Officer-only (rules enforce admin). */
export async function seedDemoData(uid: string): Promise<number> {
  const shelters = [
    ['Kandy Central School', 'Kandy', 'Kandy, Central Province', 7.2906, 80.6337, 500, 350, ['Classrooms', 'Clean Water', 'Toilets']],
    ['Gampaha Sports Complex', 'Gampaha', 'Gampaha Town', 7.0873, 79.9925, 300, 300, ['Clean Water', 'Toilets', 'Electricity']],
    ['Matale University Hall', 'Matale', 'Matale Town', 7.4675, 80.6234, 200, 120, ['Classrooms', 'Kitchen', 'Medical Support']],
    ['Nuwara Eliya Stadium', 'Nuwara Eliya', 'Nuwara Eliya Town', 6.9497, 80.7891, 400, 250, ['Clean Water', 'Toilets', 'Accessibility (Disabled Friendly)']],
    ['Colombo District Hall', 'Colombo', 'Colombo 07', 6.9271, 79.8612, 600, 100, ['Classrooms', 'Clean Water', 'Electricity', 'Medical Support']],
    ['Kalutara Community Center', 'Kalutara', 'Kalutara South', 6.5854, 79.9607, 250, 230, ['Kitchen', 'Toilets']],
  ] as const;
  for (const [name, district, location, latitude, longitude, capacity, occ, facilities] of shelters) {
    await createShelter({ name, district, location, latitude, longitude, capacity, currentOccupancy: occ, facilities: [...facilities], status: deriveShelterStatus(capacity, occ) });
  }
  const teams = [
    ['Kandy Rescue Team', 'Search & Rescue', 'Kandy', 12, '2 Vehicles, Medical Kit, Rescue Tools', 'Available', 7.2906, 80.6337],
    ['Gampaha Medical Team', 'Medical Support', 'Gampaha', 8, 'Ambulance, Medical Supplies', 'On Mission', 7.0873, 79.9925],
    ['Matale Relief Team', 'Relief Distribution', 'Matale', 10, '2 Trucks', 'Available', 7.4675, 80.6234],
    ['Colombo Support Team', 'Logistics', 'Colombo', 15, '4 Trucks, Generators', 'Unavailable', 6.9271, 79.8612],
    ['Nuwara Eliya SAR', 'Search & Rescue', 'Nuwara Eliya', 9, '1 Vehicle, Rope Rescue Kit', 'Available', 6.9497, 80.7891],
  ] as const;
  for (const [name, type, district, members, equipment, status, latitude, longitude] of teams) {
    await createRescueTeam({ name, type, district, members, equipment, status, latitude, longitude, currentLocationLabel: district });
  }
  const resources = [
    ['Drinking Water', 'Food & Water', 'Bottles', 5000, 2500], ['Food Packs', 'Food & Water', 'Packs', 3000, 1250],
    ['Tents', 'Shelter Supplies', 'Tents', 500, 300], ['Medical Kits', 'Medical', 'Kits', 800, 150], ['Blankets', 'Clothing', 'Pieces', 1500, 900],
  ] as const;
  for (const [name, category, unit, totalQuantity, availableQuantity] of resources) {
    await createResource({ name, category, unit, totalQuantity, availableQuantity });
  }
  const inHours = (h: number) => new Date(Date.now() + h * 3600 * 1000);
  const warnings = [
    ['Flood Warning', 'flood', 'HIGH', 'Kandy, Matale', 7.35, 80.63, 3000, 'Rising river levels. Move to higher ground and avoid low-lying roads.'],
    ['Landslide Warning', 'landslide', 'MEDIUM', 'Nuwara Eliya', 6.95, 80.79, 2000, 'Heavy rain may trigger landslides on slopes. Stay alert.'],
    ['Strong Wind Advisory', 'flood', 'LOW', 'Gampaha', 7.09, 79.99, 1000, 'Strong winds expected. Secure loose objects.'],
  ] as const;
  for (const [title, hazardType, riskLevel, affectedArea, latitude, longitude, radius, message] of warnings) {
    await createWarning({ title, hazardType, riskLevel, affectedArea, latitude, longitude, radius, message, expiresAt: inHours(48), createdBy: uid });
  }
  await logActivity({ type: 'notification', title: 'Demo data loaded', detail: 'Sample shelters, teams, resources and alerts', status: 'Info', createdBy: uid });
  return shelters.length + teams.length + resources.length + warnings.length;
}
