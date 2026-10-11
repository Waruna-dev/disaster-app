import { Timestamp } from 'firebase/firestore';

export const RESOURCE_CATEGORIES = ['Food & Water', 'Medical', 'Shelter Supplies', 'Clothing', 'Hygiene', 'Other'] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

// `resources/{id}`
export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

// `resourceDistributions/{id}`
export interface ResourceDistribution {
  id: string;
  resourceId: string;
  resourceName: string;
  category?: string | null;
  unit: string;
  quantity: number;
  district: string;
  distributionDate: string; // YYYY-MM-DD
  notes?: string | null;
  recordedBy?: string | null;
  createdAt: Timestamp | null;
}
