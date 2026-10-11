/**
 * Mounts every route file under app/ (auto-discovered, so new screens are covered
 * automatically) signed-out and signed-in, then pushes realistic Firestore data
 * into every live listener and checks the screen survives the update.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Alert } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { renderWithAuth } from '../helpers/renderWithAuth';
import { fs as firestore, setParams } from '../helpers/firebaseMocks';
import { ts } from '../helpers/factories';
import { FloodUpdatesProvider } from '../../context/FloodUpdatesContext';
import { NearbyServicesProvider } from '../../contexts/NearbyServicesContext';

const APP_DIR = path.join(__dirname, '../../app');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const screens = walk(APP_DIR)
  .map((abs) => path.relative(APP_DIR, abs).replace(/\\/g, '/'))
  .sort();

const now = Date.now();
const SAMPLE: Record<string, Array<Record<string, unknown>>> = {
  reports: [
    { id: 'r1', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'Rising', referenceNumber: 'REP-11111', userId: 'u1', latitude: 6.95, longitude: 79.92, createdAt: ts(now - 3_600_000) },
    { id: 'r2', status: 'Verified', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'Flooded', referenceNumber: 'REP-22222', userId: 'u2', latitude: 6.951, longitude: 79.921, createdAt: ts(now - 7_200_000), reviewedAt: ts(now - 600_000) },
    { id: 'r3', status: 'Verified', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'Flooded', referenceNumber: 'REP-33333', userId: 'u2', latitude: 6.952, longitude: 79.92, createdAt: ts(now - 7_300_000), reviewedAt: ts(now - 500_000) },
    { id: 'r4', status: 'Rejected', disasterType: 'landslide', affectedArea: 'Badulla', description: 'Slip', referenceNumber: 'REP-44444', userId: 'u3', createdAt: ts(now - 86_400_000), rejectionReason: 'Duplicate' },
  ],
  warnings: [
    { id: 'w1', title: 'River overflow', hazardType: 'flood', riskLevel: 'HIGH', affectedArea: 'Kelaniya', latitude: 6.95, longitude: 79.92, radius: 500, polygon: null, message: 'Move', status: 'Active', createdBy: 'admin-1', createdAt: ts(now - 60_000), expiresAt: ts(now + 3_600_000) },
  ],
  floodIncidentReviews: [],
  users: [{ id: 'u1', fullName: 'Resident One', role: 'user' }],
};

function emitEverywhere() {
  for (const l of [...firestore.__listeners]) {
    const p = l.target.path;
    if (p.startsWith('users/')) continue; // the auth profile listener is driven by renderWithAuth
    const coll = p.split('/')[0];
    const isDoc = p.split('/').length % 2 === 0;
    if (isDoc) {
      const id = p.split('/')[1];
      const doc = (SAMPLE[coll] ?? []).find((d) => d.id === id) ?? SAMPLE[coll]?.[0];
      l.next(firestore.__makeDocSnap(id, doc ? { ...doc, id: undefined } : undefined));
    } else {
      l.next(firestore.__makeQuerySnap(SAMPLE[coll] ?? []));
    }
  }
}

let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  setParams({ id: 'r1', reportId: 'r1', incidentId: 'FLD-x', groupId: 'INC-001' });
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ features: [], elements: [] }) })) as any;
  spies = [
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined),
    ...(['warn', 'log', 'info'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined)),
  ];
});
afterEach(() => spies.forEach((s) => s.mockRestore()));

/** Mirrors the providers each screen's ancestor _layout.tsx files mount around it. */
function withLayoutProviders(file: string, el: React.ReactElement) {
  let out = el;
  if (file.startsWith('(user)/emergency/')) out = <NearbyServicesProvider>{out}</NearbyServicesProvider>;
  if (file.startsWith('(user)/')) out = <FloodUpdatesProvider>{out}</FloodUpdatesProvider>;
  return out;
}

describe.each(screens)('app/%s', (file) => {
  const load = () => {
    const mod = require(path.join(APP_DIR, file));
    expect(typeof mod.default).toBe('function');
    return mod.default as React.ComponentType;
  };

  it('mounts signed out', async () => {
    const Screen = load();
    const { unmount } = await render(withLayoutProviders(file, <Screen />));
    await act(async () => undefined);
    await unmount();
  });

  it('mounts signed in and survives live data', async () => {
    const Screen = load();
    const { unmount, toJSON } = await renderWithAuth(withLayoutProviders(file, <Screen />));
    await act(async () => {
      emitEverywhere();
    });
    await act(async () => undefined);
    expect(() => toJSON()).not.toThrow();
    await unmount();
  });
});
