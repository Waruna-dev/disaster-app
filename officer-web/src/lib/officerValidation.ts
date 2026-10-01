
export type ShelterStatus =
  | 'Available'
  | 'Limited'
  | 'Full'
  | 'Closed';

export function getShelterStatus(
  capacity: number,
  occupancy: number,
  isClosed = false,
): ShelterStatus {
  if (isClosed || capacity <= 0) {
    return isClosed ? 'Closed' : 'Full';
  }

  if (occupancy >= capacity) {
    return 'Full';
  }

  if (occupancy / capacity >= 0.85) {
    return 'Limited';
  }

  return 'Available';
}

export type RescueTeamStatus =
  | 'Available'
  | 'On Mission'
  | 'Unavailable';

export function canAssignRescueTeam(
  teamStatus: RescueTeamStatus,
  affectedArea: string,
): boolean {
  return (
    teamStatus === 'Available' &&
    affectedArea.trim().length > 0
  );
}

export interface DistributionInput {
  availableStock: number;
  quantity: number;
}

export function validateDistribution(
  input: DistributionInput,
): string | null {
  const { availableStock, quantity } = input;

  if (!Number.isFinite(availableStock) || availableStock < 0) {
    return 'Invalid available stock';
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 'Quantity must be greater than zero';
  }

  if (quantity > availableStock) {
    return 'Insufficient stock';
  }

  return null;
}

export interface HazardAlertInput {
  title: string;
  message: string;
  affectedArea: string;
  expiryTime: number;
  now: number;
}

export function validateHazardAlert(
  alert: HazardAlertInput,
): string | null {
  if (!alert.title.trim()) {
    return 'Title is required';
  }

  if (!alert.message.trim()) {
    return 'Message is required';
  }

  if (!alert.affectedArea.trim()) {
    return 'Affected area is required';
  }

  if (
    !Number.isFinite(alert.expiryTime) ||
    !Number.isFinite(alert.now)
  ) {
    return 'Invalid expiry time';
  }

  if (alert.expiryTime <= alert.now) {
    return 'Expiry time must be in the future';
  }

  return null;
}
