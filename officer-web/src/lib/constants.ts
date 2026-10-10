export const DISTRICT_COORDS: Record<string, [number, number]> = {
  Ampara: [7.30, 81.67], Anuradhapura: [8.31, 80.40], Badulla: [6.99, 81.06], Batticaloa: [7.71, 81.70], Colombo: [6.93, 79.86],
  Galle: [6.05, 80.22], Gampaha: [7.09, 79.99], Hambantota: [6.12, 81.12], Jaffna: [9.66, 80.01], Kalutara: [6.58, 79.96],
  Kandy: [7.29, 80.63], Kegalle: [7.25, 80.35], Kilinochchi: [9.40, 80.40], Kurunegala: [7.49, 80.37], Mannar: [8.98, 79.90],
  Matale: [7.47, 80.62], Matara: [5.95, 80.55], Monaragala: [6.87, 81.35], Mullaitivu: [9.27, 80.81], 'Nuwara Eliya': [6.97, 80.77],
  Polonnaruwa: [7.94, 81.00], Puttalam: [8.03, 79.83], Ratnapura: [6.68, 80.40], Trincomalee: [8.57, 81.23], Vavuniya: [8.75, 80.50],
};
export const DISTRICTS = Object.keys(DISTRICT_COORDS);
export const SHELTER_FACILITIES = ['Classrooms', 'Clean Water', 'Toilets', 'Medical Support', 'Kitchen', 'Electricity', 'Accessibility (Disabled Friendly)', 'Other'];
export const TEAM_TYPES = ['Search & Rescue', 'Medical Support', 'Relief Distribution', 'Logistics'] as const;
export const RESOURCE_CATEGORIES = ['Food & Water', 'Medical', 'Shelter Supplies', 'Clothing', 'Hygiene', 'Other'];
export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const SL_CENTER: [number, number] = [7.8731, 80.7718];
export const RISK_COLOR: Record<string, string> = { LOW: '#2E7D32', MEDIUM: '#F9A825', HIGH: '#E65100', CRITICAL: '#C62828' };
