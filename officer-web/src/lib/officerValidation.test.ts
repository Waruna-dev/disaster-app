
import { describe, expect, it } from 'vitest';

import {
  getShelterStatus,
  canAssignRescueTeam,
  validateDistribution,
  validateHazardAlert,
} from './officerValidation';

// =====================================================
// 1. SHELTER MANAGEMENT TESTS
// =====================================================

describe('Shelter Management', () => {
  it('SH-01: returns Available when occupancy is below 85%', () => {
    expect(getShelterStatus(100, 50)).toBe('Available');
  });

  it('SH-02: returns Available at 84% occupancy', () => {
    expect(getShelterStatus(100, 84)).toBe('Available');
  });

  it('SH-03: returns Limited at 85% occupancy', () => {
    expect(getShelterStatus(100, 85)).toBe('Limited');
  });

  it('SH-04: returns Limited at 99% occupancy', () => {
    expect(getShelterStatus(100, 99)).toBe('Limited');
  });

  it('SH-05: returns Full at maximum capacity', () => {
    expect(getShelterStatus(100, 100)).toBe('Full');
  });

  it('SH-06: returns Full when occupancy exceeds capacity', () => {
    expect(getShelterStatus(100, 120)).toBe('Full');
  });

  it('SH-07: returns Closed when shelter is closed', () => {
    expect(getShelterStatus(100, 20, true)).toBe('Closed');
  });

  it('SH-08: handles zero capacity safely', () => {
    expect(getShelterStatus(0, 0)).toBe('Full');
  });
});

// =====================================================
// 2. RESCUE TEAM MANAGEMENT TESTS
// =====================================================

describe('Rescue Team Management', () => {
  it('RT-01: allows an available team with a valid area', () => {
    expect(
      canAssignRescueTeam('Available', 'Matara'),
    ).toBe(true);
  });

  it('RT-02: rejects a team already on a mission', () => {
    expect(
      canAssignRescueTeam('On Mission', 'Matara'),
    ).toBe(false);
  });

  it('RT-03: rejects an unavailable team', () => {
    expect(
      canAssignRescueTeam('Unavailable', 'Colombo'),
    ).toBe(false);
  });

  it('RT-04: rejects an empty affected area', () => {
    expect(
      canAssignRescueTeam('Available', ''),
    ).toBe(false);
  });

  it('RT-05: rejects an area containing only spaces', () => {
    expect(
      canAssignRescueTeam('Available', '   '),
    ).toBe(false);
  });

  it('RT-06: accepts an area with surrounding spaces', () => {
    expect(
      canAssignRescueTeam('Available', ' Matara '),
    ).toBe(true);
  });
});

// =====================================================
// 3. RESOURCE DISTRIBUTION TESTS
// =====================================================

describe('Resource Distribution', () => {
  it('RS-01: accepts a valid distribution', () => {
    expect(
      validateDistribution({
        availableStock: 100,
        quantity: 20,
      }),
    ).toBeNull();
  });

  it('RS-02: rejects a quantity of zero', () => {
    expect(
      validateDistribution({
        availableStock: 100,
        quantity: 0,
      }),
    ).toBe('Quantity must be greater than zero');
  });

  it('RS-03: rejects a negative quantity', () => {
    expect(
      validateDistribution({
        availableStock: 100,
        quantity: -5,
      }),
    ).toBe('Quantity must be greater than zero');
  });

  it('RS-04: rejects distribution above available stock', () => {
    expect(
      validateDistribution({
        availableStock: 10,
        quantity: 20,
      }),
    ).toBe('Insufficient stock');
  });

  it('RS-05: accepts distribution equal to available stock', () => {
    expect(
      validateDistribution({
        availableStock: 10,
        quantity: 10,
      }),
    ).toBeNull();
  });

  it('RS-06: rejects negative available stock', () => {
    expect(
      validateDistribution({
        availableStock: -10,
        quantity: 5,
      }),
    ).toBe('Invalid available stock');
  });

  it('RS-07: rejects a non-finite quantity', () => {
    expect(
      validateDistribution({
        availableStock: 100,
        quantity: Number.NaN,
      }),
    ).toBe('Quantity must be greater than zero');
  });

  it('RS-08: rejects a non-finite available stock', () => {
    expect(
      validateDistribution({
        availableStock: Number.POSITIVE_INFINITY,
        quantity: 5,
      }),
    ).toBe('Invalid available stock');
  });
});

// =====================================================
// 4. HAZARD ALERT TESTS
// =====================================================

describe('Hazard Alerts', () => {
  const validAlert = {
    title: 'Flood Warning',
    message: 'Move to a safe location.',
    affectedArea: 'Matara',
    expiryTime: 2000,
    now: 1000,
  };

  it('HA-01: accepts a valid hazard alert', () => {
    expect(validateHazardAlert(validAlert)).toBeNull();
  });

  it('HA-02: rejects an empty title', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        title: '',
      }),
    ).toBe('Title is required');
  });

  it('HA-03: rejects a title containing only spaces', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        title: '   ',
      }),
    ).toBe('Title is required');
  });

  it('HA-04: rejects an empty message', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        message: '',
      }),
    ).toBe('Message is required');
  });

  it('HA-05: rejects an empty affected area', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        affectedArea: '',
      }),
    ).toBe('Affected area is required');
  });

  it('HA-06: rejects an expiry time in the past', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        expiryTime: 900,
      }),
    ).toBe('Expiry time must be in the future');
  });

  it('HA-07: rejects an expiry time equal to the current time', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        expiryTime: 1000,
      }),
    ).toBe('Expiry time must be in the future');
  });

  it('HA-08: rejects a non-finite expiry time', () => {
    expect(
      validateHazardAlert({
        ...validAlert,
        expiryTime: Number.NaN,
      }),
    ).toBe('Invalid expiry time');
  });
});
