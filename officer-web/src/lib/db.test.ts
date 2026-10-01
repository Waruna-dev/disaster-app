
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock functions before importing db.ts.
const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { fromDate: vi.fn() },
  updateDoc: vi.fn(),
  get: vi.fn(),
  txUpdate: vi.fn(),
  txSet: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  deleteDoc: mocks.deleteDoc,
  doc: mocks.doc,
  runTransaction: mocks.runTransaction,
  serverTimestamp: mocks.serverTimestamp,
  Timestamp: mocks.Timestamp,
  updateDoc: mocks.updateDoc,
}));

vi.mock('./firebase', () => ({
  db: { testDatabase: true },
}));

import {
  deriveShelterStatus,
  assignShelter,
  createShelter,
  updateShelter,
  deleteShelter,
  createTeam,
  updateTeam,
  deleteTeam,
  createAssignment,
  completeAssignment,
  createResource,
  updateResource,
  deleteResource,
  recordDistribution,
  createWarning,
  cancelWarning,
  deleteWarning,
} from './db';

const snapshot = (data: Record<string, unknown> | null) => ({
  exists: () => data !== null,
  data: () => data,
});

beforeEach(() => {
  vi.clearAllMocks();

  mocks.collection.mockImplementation(
    (_db: unknown, name: string) => ({ name }),
  );

  mocks.doc.mockImplementation(
    (...args: unknown[]) => {
      if (args.length === 3) {
        return {
          collection: args[1],
          id: args[2],
        };
      }

      const ref = args[0] as { name?: string };
      return {
        collection: ref?.name,
        id: 'generated-document-id',
      };
    },
  );

  mocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');

  mocks.Timestamp.fromDate.mockImplementation(
    (date: Date) => ({ convertedDate: date }),
  );

  mocks.addDoc.mockResolvedValue({
    id: 'created-document-id',
  });

  mocks.updateDoc.mockResolvedValue(undefined);
  mocks.deleteDoc.mockResolvedValue(undefined);

  mocks.get.mockResolvedValue(snapshot(null));
  mocks.txUpdate.mockReset();
  mocks.txSet.mockReset();

  mocks.runTransaction.mockImplementation(
    async (_db: unknown, callback: (tx: unknown) => unknown) =>
      callback({
        get: mocks.get,
        update: mocks.txUpdate,
        set: mocks.txSet,
      }),
  );
});

// =====================================================
// 1. SHELTER MANAGEMENT
// =====================================================

describe('Shelter Management', () => {
  it('SH-01: returns Available for low occupancy', () => {
    expect(deriveShelterStatus(100, 50)).toBe('Available');
  });

  it('SH-02: returns Limited at 85% occupancy', () => {
    expect(deriveShelterStatus(100, 85)).toBe('Limited');
  });

  it('SH-03: returns Full at 100% occupancy', () => {
    expect(deriveShelterStatus(100, 100)).toBe('Full');
  });

  it('SH-04: returns Closed for a closed shelter', () => {
    expect(deriveShelterStatus(100, 50, true)).toBe('Closed');
  });

  it('SH-05: creates a shelter in Firestore', async () => {
    await createShelter({
      name: 'Matara School',
      district: 'Matara',
      location: 'Matara Town',
      latitude: 5.9485,
      longitude: 80.5353,
      capacity: 100,
      currentOccupancy: 20,
      facilities: ['Water', 'Toilets'],
      status: 'Available',
    });

    expect(mocks.addDoc).toHaveBeenCalled();
    const savedData = mocks.addDoc.mock.calls[0][1];

    expect(savedData.name).toBe('Matara School');
    expect(savedData.capacity).toBe(100);
    expect(savedData.currentOccupancy).toBe(20);
  });

  it('SH-06: updates an existing shelter', async () => {
    await updateShelter('shelter-1', {
      currentOccupancy: 40,
    });

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shelter-1' }),
      expect.objectContaining({
        currentOccupancy: 40,
      }),
    );
  });

  it('SH-07: deletes a shelter', async () => {
    await deleteShelter('shelter-1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shelter-1' }),
    );
  });

  it('SH-08: rejects a request with zero people', async () => {
    await expect(
      assignShelter('request-1', 'shelter-1', 'Matara School', 0),
    ).rejects.toThrow(
      'The request must include at least one person.',
    );

    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it('SH-09: rejects a missing shelter request', async () => {
    mocks.get.mockResolvedValue(snapshot(null));

    await expect(
      assignShelter('request-1', 'shelter-1', 'Matara School', 5),
    ).rejects.toThrow('Shelter request no longer exists.');
  });

  it('SH-10: rejects a missing shelter', async () => {
    mocks.get.mockImplementation(async (ref: { id: string }) => {
      if (ref.id === 'request-1') {
        return snapshot({ status: 'Pending' });
      }

      return snapshot(null);
    });

    await expect(
      assignShelter('request-1', 'shelter-1', 'Matara School', 5),
    ).rejects.toThrow('Shelter no longer exists.');
  });

  it('SH-11: rejects an already processed request', async () => {
    mocks.get.mockImplementation(async (ref: { id: string }) => {
      if (ref.id === 'request-1') {
        return snapshot({ status: 'Assigned' });
      }

      return snapshot({
        capacity: 100,
        currentOccupancy: 20,
        status: 'Available',
      });
    });

    await expect(
      assignShelter('request-1', 'shelter-1', 'Matara School', 5),
    ).rejects.toThrow(
      'This shelter request has already been processed.',
    );
  });

  it('SH-12: rejects an assignment exceeding capacity', async () => {
    mocks.get.mockImplementation(async (ref: { id: string }) => {
      if (ref.id === 'request-1') {
        return snapshot({ status: 'Pending' });
      }

      return snapshot({
        capacity: 100,
        currentOccupancy: 98,
        status: 'Limited',
      });
    });

    await expect(
      assignShelter('request-1', 'shelter-1', 'Matara School', 5),
    ).rejects.toThrow('Only 2 spaces are available');

    expect(mocks.txUpdate).not.toHaveBeenCalled();
  });

  it('SH-13: assigns a valid request and updates both records', async () => {
    mocks.get.mockImplementation(async (ref: { id: string }) => {
      if (ref.id === 'request-1') {
        return snapshot({ status: 'Pending' });
      }

      return snapshot({
        capacity: 100,
        currentOccupancy: 20,
        status: 'Available',
      });
    });

    await assignShelter(
      'request-1',
      'shelter-1',
      'Matara School',
      5,
      'Family of five',
    );

    expect(mocks.txUpdate).toHaveBeenCalledTimes(2);

    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shelter-1' }),
      expect.objectContaining({
        currentOccupancy: 25,
        status: 'Available',
      }),
    );

    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      expect.objectContaining({
        status: 'Assigned',
        shelterId: 'shelter-1',
        shelterName: 'Matara School',
        officerNotes: 'Family of five',
      }),
    );
  });
});

// =====================================================
// 2. RESCUE TEAM MANAGEMENT
// =====================================================

describe('Rescue Team Management', () => {
  const team = {
    name: 'Matara Rescue Team',
    type: 'Search & Rescue' as const,
    district: 'Matara',
    members: 10,
    equipment: 'Rescue tools',
    status: 'Available' as const,
    latitude: 5.9485,
    longitude: 80.5353,
  };

  it('RT-01: creates a rescue team', async () => {
    await createTeam(team);

    expect(mocks.addDoc).toHaveBeenCalled();
    expect(mocks.addDoc.mock.calls[0][1]).toMatchObject({
      name: 'Matara Rescue Team',
      district: 'Matara',
      members: 10,
      status: 'Available',
    });
  });

  it('RT-02: updates a rescue team', async () => {
    await updateTeam('team-1', { status: 'On Mission' });

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'team-1' }),
      expect.objectContaining({ status: 'On Mission' }),
    );
  });

  it('RT-03: deletes a rescue team', async () => {
    await deleteTeam('team-1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'team-1' }),
    );
  });

  it('RT-04: creates an assignment with In Progress status', async () => {
    await createAssignment({
      teamId: 'team-1',
      teamName: 'Matara Rescue Team',
      area: 'Matara Town',
      createdBy: 'officer-1',
    });

    expect(mocks.addDoc.mock.calls[0][1]).toMatchObject({
      teamId: 'team-1',
      teamName: 'Matara Rescue Team',
      area: 'Matara Town',
      status: 'In Progress',
      createdBy: 'officer-1',
    });
  });

  it('RT-05: completes an assignment', async () => {
    await completeAssignment('assignment-1');

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'assignment-1' }),
      { status: 'Completed' },
    );
  });
});

// =====================================================
// 3. RESOURCE DISTRIBUTION
// =====================================================

describe('Resource Distribution', () => {
  it('RS-01: creates a resource', async () => {
    await createResource({
      name: 'Drinking Water',
      category: 'Food & Water',
      unit: 'Bottles',
      totalQuantity: 500,
      availableQuantity: 300,
    });

    expect(mocks.addDoc.mock.calls[0][1]).toMatchObject({
      name: 'Drinking Water',
      totalQuantity: 500,
      availableQuantity: 300,
    });
  });

  it('RS-02: updates resource quantities', async () => {
    await updateResource('resource-1', {
      availableQuantity: 250,
    });

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resource-1' }),
      expect.objectContaining({ availableQuantity: 250 }),
    );
  });

  it('RS-03: deletes a resource', async () => {
    await deleteResource('resource-1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resource-1' }),
    );
  });

  it('RS-04: rejects distribution when resource does not exist', async () => {
    mocks.get.mockResolvedValue(snapshot(null));

    await expect(
      recordDistribution({
        resourceId: 'missing-resource',
        quantity: 5,
        district: 'Matara',
        distributionDate: '2026-10-11',
      }),
    ).rejects.toThrow('Resource no longer exists.');

    expect(mocks.txUpdate).not.toHaveBeenCalled();
    expect(mocks.txSet).not.toHaveBeenCalled();
  });

  it('RS-05: rejects distribution above available stock', async () => {
    mocks.get.mockResolvedValue(
      snapshot({
        name: 'Water',
        category: 'Food & Water',
        unit: 'Bottles',
        availableQuantity: 10,
      }),
    );

    await expect(
      recordDistribution({
        resourceId: 'resource-1',
        quantity: 20,
        district: 'Matara',
        distributionDate: '2026-10-11',
      }),
    ).rejects.toThrow('Only 10 Bottles available.');

    expect(mocks.txUpdate).not.toHaveBeenCalled();
    expect(mocks.txSet).not.toHaveBeenCalled();
  });

  it('RS-06: deducts stock and records a valid distribution', async () => {
    mocks.get.mockResolvedValue(
      snapshot({
        name: 'Water',
        category: 'Food & Water',
        unit: 'Bottles',
        availableQuantity: 100,
      }),
    );

    await recordDistribution({
      resourceId: 'resource-1',
      quantity: 20,
      district: 'Matara',
      distributionDate: '2026-10-11',
      recordedBy: 'officer-1',
    });

    expect(mocks.txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resource-1' }),
      expect.objectContaining({ availableQuantity: 80 }),
    );

    expect(mocks.txSet).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'resourceDistributions',
      }),
      expect.objectContaining({
        resourceId: 'resource-1',
        resourceName: 'Water',
        quantity: 20,
        district: 'Matara',
        recordedBy: 'officer-1',
      }),
    );
  });
});

// =====================================================
// 4. HAZARD ALERTS
// =====================================================

describe('Hazard Alerts', () => {
  const warning = {
    title: 'Flood Warning',
    hazardType: 'flood',
    riskLevel: 'HIGH' as const,
    affectedArea: 'Matara',
    latitude: 5.9485,
    longitude: 80.5353,
    radius: 1000,
    message: 'Move to a safe location.',
    expiresAt: new Date('2026-10-12T10:00:00Z'),
    createdBy: 'officer-1',
    createdByName: 'District Officer',
  };

  it('HA-01: creates a warning with Active status', async () => {
    await createWarning(warning);

    expect(mocks.addDoc).toHaveBeenCalled();

    expect(mocks.addDoc.mock.calls[0][1]).toMatchObject({
      title: 'Flood Warning',
      hazardType: 'flood',
      riskLevel: 'HIGH',
      affectedArea: 'Matara',
      status: 'Active',
      createdBy: 'officer-1',
    });
  });

  it('HA-02: converts the expiry Date to a Firestore Timestamp', async () => {
    await createWarning(warning);

    expect(mocks.Timestamp.fromDate).toHaveBeenCalledWith(
      warning.expiresAt,
    );
  });

  it('HA-03: cancels a warning', async () => {
    await cancelWarning('warning-1');

    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'warning-1' }),
      { status: 'Cancelled' },
    );
  });

  it('HA-04: deletes a warning', async () => {
    await deleteWarning('warning-1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'warning-1' }),
    );
  });
});
