import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { Resource, ResourceCategory, ResourceDistribution } from '../types/resource';

const RESOURCES = 'resources';
const DISTRIBUTIONS = 'resourceDistributions';

export interface ResourceInput {
  name: string;
  category: ResourceCategory;
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
}

export const fetchAllResources = async (): Promise<Resource[]> => {
  const snapshot = await getDocs(query(collection(db, RESOURCES), orderBy('name')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Resource));
};

export const createResource = async (input: ResourceInput): Promise<string> => {
  const ref = await addDoc(collection(db, RESOURCES), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateResource = async (id: string, input: Partial<ResourceInput>): Promise<void> => {
  await updateDoc(doc(db, RESOURCES, id), { ...input, updatedAt: serverTimestamp() });
};

export const deleteResource = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, RESOURCES, id));
};

export interface DistributionInput {
  resourceId: string;
  quantity: number;
  district: string;
  distributionDate: string;
  notes?: string;
  recordedBy?: string;
}

/**
 * Records a distribution AND deducts the quantity from the resource's available stock in a
 * single transaction, so two officers recording at once can't over-distribute.
 */
export const recordDistribution = async (input: DistributionInput): Promise<void> => {
  const resourceRef = doc(db, RESOURCES, input.resourceId);
  const distributionRef = doc(collection(db, DISTRIBUTIONS));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(resourceRef);
    if (!snap.exists()) throw new Error('Resource no longer exists.');
    const resource = snap.data() as Omit<Resource, 'id'>;
    if (input.quantity > resource.availableQuantity) {
      throw new Error(`Only ${resource.availableQuantity} ${resource.unit} available.`);
    }
    tx.update(resourceRef, {
      availableQuantity: resource.availableQuantity - input.quantity,
      updatedAt: serverTimestamp(),
    });
    tx.set(distributionRef, {
      resourceId: input.resourceId,
      resourceName: resource.name,
      category: resource.category,
      unit: resource.unit,
      quantity: input.quantity,
      district: input.district,
      distributionDate: input.distributionDate,
      notes: input.notes ?? null,
      recordedBy: input.recordedBy ?? null,
      createdAt: serverTimestamp(),
    });
  });
};

export const fetchDistributions = async (): Promise<ResourceDistribution[]> => {
  const snapshot = await getDocs(query(collection(db, DISTRIBUTIONS), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ResourceDistribution));
};
