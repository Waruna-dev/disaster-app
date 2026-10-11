import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../../app/(DMC)/dashboard';
import IncidentsScreen from '../../app/(DMC)/incidents';
import MapScreen from '../../app/(DMC)/map';
import ReportsScreen from '../../app/(DMC)/reports';
import ReportGroupsScreen from '../../app/(DMC)/report-groups';
import FloodIncidentsScreen from '../../app/(DMC)/flood-incidents';
import CreateAlertScreen from '../../app/(DMC)/create-alert';
import ReportDetailScreen from '../../app/(DMC)/incident/[id]';
import * as alertService from '../../services/alertService';
import * as incidentReview from '../../services/floodIncidentReviewService';
import * as reviewActions from '../../services/reportReviewActions';
import * as geocode from '../../services/geocodeService';
import { buildFloodIncidents } from '../../utils/floodIncidents';
import { renderWithAuth, OFFICER } from '../helpers/renderWithAuth';
import { emitCollection } from '../helpers/emitQuery';
import { fs, mockRouter, setParams } from '../helpers/firebaseMocks';
import { north, ts } from '../helpers/factories';
import { __messageEvent as msg } from '../mocks/webview';

let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  spies = [
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined),
    ...(['log', 'warn', 'info', 'error'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined)),
  ];
});
afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  jest.restoreAllMocks();
});

async function pressAlertButton(label: string) {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2] as { text: string; onPress?: () => any }[];
  await act(async () => {
    await buttons.find((b) => b.text === label)!.onPress?.();
  });
}

// ---- Shared Firestore data -------------------------------------------------
const NOW = Date.now();
const K = { latitude: 6.95, longitude: 79.92 };
const near = (m: number) => north(K.latitude, K.longitude, m);

const REPORTS = [
  // Pending flood pair 200 m apart → one report group
  { id: 'p1', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'Rising', referenceNumber: 'REP-10001', userId: 'u1', ...K, createdAt: ts(NOW - 3_600_000), photoUrls: ['https://p/1.jpg'] },
  { id: 'p2', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'Rising', referenceNumber: 'REP-10002', userId: 'u2', ...near(200), createdAt: ts(NOW - 3_000_000), photoUrl: 'https://p/2.jpg' },
  // Lone pending landslide → ungrouped
  { id: 'p3', status: 'Pending', disasterType: 'landslide', affectedArea: 'Badulla', description: 'Slip', referenceNumber: 'REP-10003', userId: 'u3', latitude: 6.99, longitude: 81.05, createdAt: ts(NOW - 2_000_000) },
  // Verified floods 100 m apart → one flood incident
  { id: 'v1', status: 'Verified', disasterType: 'flood', affectedArea: 'Wattala', description: 'x', referenceNumber: 'REP-20001', userId: 'u1', latitude: 6.99, longitude: 79.89, createdAt: ts(NOW - 7_200_000), reviewedAt: ts(NOW - 600_000) },
  { id: 'v2', status: 'Verified', disasterType: 'flood', affectedArea: 'Wattala', description: 'x', referenceNumber: 'REP-20002', userId: 'u2', latitude: 6.9909, longitude: 79.89, createdAt: ts(NOW - 7_100_000), reviewedAt: ts(NOW - 2 * 86_400_000) },
  { id: 'x1', status: 'Rejected', disasterType: 'landslide', affectedArea: 'Haputale', description: 'x', referenceNumber: 'REP-30001', userId: 'u3', createdAt: ts(NOW - 86_400_000), reviewedAt: ts(NOW - 5 * 3_600_000), rejectionReason: 'Duplicate' },
];
const WARNINGS = [
  { id: 'w1', title: 'River overflow', hazardType: 'flood', riskLevel: 'HIGH', affectedArea: 'Kelaniya', latitude: 6.95, longitude: 79.92, radius: 500, polygon: [K, near(300), { latitude: 6.95, longitude: 79.93 }], message: 'Move', status: 'Active', createdBy: 'admin-1', createdAt: ts(NOW - 60_000), expiresAt: ts(NOW + 3_600_000) },
  { id: 'w2', title: 'Old slip', hazardType: 'landslide', riskLevel: 'LOW', affectedArea: 'Badulla', latitude: 6.99, longitude: 81.05, radius: 300, polygon: null, message: 'm', status: 'Active', createdBy: 'admin-1', createdAt: null, expiresAt: ts(NOW + 3_600_000) },
  { id: 'w3', title: 'Expired', hazardType: 'flood', riskLevel: 'LOW', affectedArea: 'Galle', latitude: 6.03, longitude: 80.21, radius: 300, polygon: null, message: 'm', status: 'Active', createdBy: 'admin-1', createdAt: null, expiresAt: ts(NOW - 1000) },
];
const INCIDENT_ID = buildFloodIncidents(REPORTS as any)[0].id;

async function emitAll({ reports = REPORTS, warnings = WARNINGS, reviews = [] as any[] } = {}) {
  await emitCollection('reports', reports);
  if (fs.__listenersFor('warnings').length) await emitCollection('warnings', warnings);
  if (fs.__listenersFor('floodIncidentReviews').length) await emitCollection('floodIncidentReviews', reviews);
}

// ---------------------------------------------------------------------------
describe('Dashboard', () => {
  it('shows stats, approval rate, trend, recent activity and grouped-incident count', async () => {
    await renderWithAuth(<DashboardScreen />);
    await emitAll();
    expect(screen.getByText('Total reports')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy(); // total
    expect(screen.getByText('Grouped incidents')).toBeTruthy();
    expect(screen.getByText('APPROVAL RATE')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy(); // 2 verified / 3 reviewed
    expect(screen.getByText(/^Received \d+$/)).toBeTruthy();
    expect(screen.getByText(/^Verified \d+$/)).toBeTruthy();
    expect(screen.getAllByText('Flood in Wattala')).toHaveLength(2);
    expect(screen.getByText('Landslide in Haputale')).toBeTruthy();
    expect(screen.getByText('Verified · 10 min ago')).toBeTruthy();
    expect(screen.getByText('Rejected · 5 hr ago')).toBeTruthy();
    expect(screen.getByText('Verified · 2 d ago')).toBeTruthy();
  });

  it('stat tiles open All Reports pre-filtered', async () => {
    await renderWithAuth(<DashboardScreen />);
    await emitAll();
    for (const [label, status] of [['Pending', 'Pending'], ['Verified', 'Verified'], ['Rejected', 'Rejected'], ['Total reports', 'all']]) {
      await fireEvent.press(screen.getAllByText(label)[0]);
      expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(DMC)/reports', params: { status } });
    }
    await fireEvent.press(screen.getByText('Grouped incidents'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/report-groups');
  });

  it('create-warning, recent-activity and quick-nav links route correctly', async () => {
    await renderWithAuth(<DashboardScreen />);
    await emitAll();
    await fireEvent.press(screen.getByText('Create Public Warning'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/create-alert');
    await fireEvent.press(screen.getAllByText('Flood in Wattala')[0]);
    expect(mockRouter.push.mock.calls.at(-1)![0]).toMatch(/^\/\(DMC\)\/incident\/v[12]$/);
    for (const [label, href] of [
      ['Pending Reports', '/(DMC)/incidents'],
      ['All Reports', '/(DMC)/reports'],
      ['Flood Warning', '/(DMC)/flood-warning'],
      ['Flood Zones', '/(DMC)/flood-incidents'],
    ]) {
      // Quick-nav tiles sit at the bottom; labels like "All Reports" also appear in the nav menu.
      await fireEvent.press(screen.getAllByText(label).at(-1)!);
      expect(mockRouter.push).toHaveBeenLastCalledWith(href);
    }
  });

  it('shows empty states before anything is reviewed', async () => {
    await renderWithAuth(<DashboardScreen />);
    await emitAll({ reports: [REPORTS[0]] });
    expect(screen.getByText('Nothing reviewed yet')).toBeTruthy();
    expect(screen.queryByText('67%')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('Pending reports (incidents.tsx)', () => {
  it('shows counts, filters by type and switches card/list view', async () => {
    await renderWithAuth(<IncidentsScreen />);
    await emitAll();
    expect(screen.getByText('REP-10001')).toBeTruthy();
    expect(screen.getByText('REP-10003')).toBeTruthy();
    expect(screen.queryByText('REP-20001')).toBeNull(); // verified, not pending

    await fireEvent.press(screen.getAllByText('Landslide')[1]);
    expect(screen.queryByText('REP-10001')).toBeNull();
    expect(screen.getByText('REP-10003')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Flood')[1]);
    expect(screen.queryByText('REP-10003')).toBeNull();
    await fireEvent.press(screen.getByText('All'));

    await fireEvent.press(screen.getByTestId('icon-list'));
    expect(screen.queryAllByText('Approve')).toHaveLength(0); // list rows are read-only
    await fireEvent.press(screen.getAllByText('Flood · Kelaniya')[0]);
    expect(mockRouter.push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/\(DMC\)\/incident\/p[12]$/));
    // The nav menu reuses the albums icon, so find the card-view toggle via its sibling list toggle.
    const toggleRow = screen.getByTestId('icon-list').parent!.parent!;
    await fireEvent.press(toggleRow.queryAll((n: any) => n.props?.testID === 'icon-albums-outline')[0]);
    expect(screen.getAllByText('Approve').length).toBe(3);
  });

  it('card actions: view details, approve and reject open the dialogs', async () => {
    const approve = jest.spyOn(reviewActions, 'approveReport').mockResolvedValue();
    const reject = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    await renderWithAuth(<IncidentsScreen />);
    await emitAll();
    await fireEvent.press(screen.getAllByText('View Details')[0]);
    expect(mockRouter.push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/\(DMC\)\/incident\//));

    await fireEvent.press(screen.getAllByText('Approve')[0]);
    expect(screen.getByText('Approve this report?')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Approve').at(-1)!);
    await waitFor(() => expect(approve).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Approve this report?')).toBeNull());

    await fireEvent.press(screen.getAllByText('Reject')[0]);
    await fireEvent.press(screen.getByText('False report'));
    await fireEvent.press(screen.getAllByText('Reject').at(-1)!);
    await waitFor(() => expect(reject).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getAllByText('Approve')[0]);
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getAllByText('Reject')[0]);
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Reject this report')).toBeNull();
  });

  it('links to grouped incidents and flood areas; back goes to the dashboard', async () => {
    await renderWithAuth(<IncidentsScreen />);
    await emitAll();
    await fireEvent.press(screen.getByText('View grouped incidents'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/report-groups');
    await fireEvent.press(screen.getByText('View flood affected areas'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/flood-incidents');
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/dashboard');
  });

  it('shows the caught-up empty state', async () => {
    await renderWithAuth(<IncidentsScreen />);
    await emitAll({ reports: [] });
    expect(screen.getByText("No pending reports — you're caught up")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('Incident map (map.tsx)', () => {
  it('loads, overlays pins + flood zones + active warnings, and filters by status', async () => {
    await renderWithAuth(<MapScreen />);
    expect(screen.queryByTestId('webview')).toBeNull(); // loading
    await emitAll();
    const html: string = screen.getByTestId('webview').props.html;
    expect(html).toContain('"id":"p1"');
    expect(html).toContain(`"id":"${INCIDENT_ID}"`); // auto-generated flood zone
    expect(html).toContain('"id":"w1"');
    expect(html).not.toContain('"id":"w3"'); // expired warning hidden

    await fireEvent.press(screen.getByText('Verified'));
    await emitAll();
    const filtered: string = screen.getByTestId('webview').props.html;
    expect(filtered).not.toContain('"id":"p1"');
    expect(filtered).toContain('"id":"v1"');
  });

  it('hides rejected flood zones', async () => {
    await renderWithAuth(<MapScreen />);
    await emitAll({ reviews: [{ id: INCIDENT_ID, status: 'Rejected' }] });
    expect(screen.getByTestId('webview').props.html).not.toContain(`"id":"${INCIDENT_ID}"`);
  });

  it('routes pin, zone and warning taps from the map page', async () => {
    await renderWithAuth(<MapScreen />);
    await emitAll();
    const web = screen.getByTestId('webview');
    await fireEvent(web, 'message', msg({ type: 'viewDetails', id: 'p1' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incident/p1');
    await fireEvent(web, 'message', msg({ type: 'viewFloodIncident', id: INCIDENT_ID }));
    expect(mockRouter.push).toHaveBeenLastCalledWith(`/(DMC)/flood-incident/${INCIDENT_ID}`);
    await fireEvent(web, 'message', msg({ type: 'editWarning', id: 'w1' }));
    expect(mockRouter.push.mock.calls.at(-1)![0]).toMatchObject({
      pathname: '/(DMC)/create-alert',
      params: { warningId: 'w1', polygon: JSON.stringify(WARNINGS[0].polygon), originalCreatedAt: expect.any(String) },
    });
    await fireEvent(web, 'message', msg({ type: 'editWarning', id: 'w2' }));
    expect(mockRouter.push.mock.calls.at(-1)![0].params).toMatchObject({ polygon: undefined, originalCreatedAt: undefined });
    const n = mockRouter.push.mock.calls.length;
    await fireEvent(web, 'message', msg({ type: 'editWarning', id: 'missing' }));
    await fireEvent(web, 'message', msg('garbage'));
    expect(mockRouter.push.mock.calls.length).toBe(n);
  });

  it('legend expands to show statuses, affected areas and warning levels', async () => {
    await renderWithAuth(<MapScreen />);
    await emitAll();
    expect(screen.queryByText('PUBLIC WARNINGS')).toBeNull();
    await fireEvent.press(screen.getByText('Legend'));
    expect(screen.getByText('Affected area')).toBeTruthy();
    expect(screen.getByText('PUBLIC WARNINGS')).toBeTruthy();
    expect(screen.getByText('CRITICAL')).toBeTruthy();
    await fireEvent.press(screen.getByText('Legend'));
    expect(screen.queryByText('PUBLIC WARNINGS')).toBeNull();
  });

  it('full-map mode hides the header/filters and hardware back exits it first', async () => {
    let backHandler: (() => boolean) | undefined;
    const remove = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h: any) => {
      backHandler = h;
      return { remove } as any;
    });
    await renderWithAuth(<MapScreen />);
    await emitAll();
    await fireEvent.press(screen.getByText('Full map'));
    expect(screen.getByText('Exit full map')).toBeTruthy();
    expect(screen.queryByText('Incident Map')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
    let handled = false;
    await act(async () => {
      handled = backHandler!();
    });
    expect(handled).toBe(true);
    expect(screen.getByText('Incident Map')).toBeTruthy();
    expect(remove).toHaveBeenCalled();
  });

  it('back goes to the dashboard', async () => {
    await renderWithAuth(<MapScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/dashboard');
  });
});

// ---------------------------------------------------------------------------
describe('All reports (reports.tsx)', () => {
  it('starts filtered from a status param, then switches filters', async () => {
    setParams({ status: 'Rejected' });
    await renderWithAuth(<ReportsScreen />);
    await emitAll();
    expect(screen.getByText('Landslide · Haputale')).toBeTruthy();
    expect(screen.queryByText('Flood · Kelaniya')).toBeNull();
    await fireEvent.press(screen.getByText('All'));
    await emitAll();
    expect(screen.getAllByText('Flood · Kelaniya').length).toBe(2);
    await fireEvent.press(screen.getAllByText('Flood · Kelaniya')[0]);
    expect(mockRouter.push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/\(DMC\)\/incident\/p[12]$/));
  });

  it('ignores an invalid status param and shows per-filter empty messages', async () => {
    setParams({ status: 'bogus' });
    await renderWithAuth(<ReportsScreen />);
    await emitAll({ reports: [] });
    expect(screen.getByText('No reports yet')).toBeTruthy();
    await fireEvent.press(screen.getByText('Verified'));
    await emitAll({ reports: [] });
    expect(screen.getByText('No verified reports')).toBeTruthy();
  });

  it('map view shows pins and opens a tapped report; back to dashboard', async () => {
    setParams({});
    await renderWithAuth(<ReportsScreen />);
    await emitAll();
    await fireEvent.press(screen.getByTestId('icon-map-outline'));
    expect(screen.getByText('INCIDENT LOCATIONS')).toBeTruthy();
    const web = screen.getByTestId('webview');
    expect(web.props.html).toContain('"id":"p3"');
    await fireEvent(web, 'message', msg({ type: 'viewDetails', id: 'p3' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incident/p3');
    await fireEvent(web, 'message', msg('bad'));
    await fireEvent.press(screen.getByTestId('icon-list'));
    expect(screen.queryByText('INCIDENT LOCATIONS')).toBeNull();
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/dashboard');
  });
});

// ---------------------------------------------------------------------------
describe('Report groups', () => {
  it('lists auto-grouped pending reports with thumbnails and opens one', async () => {
    await renderWithAuth(<ReportGroupsScreen />);
    await emitAll();
    expect(screen.getByText('INC-001')).toBeTruthy();
    expect(screen.getAllByText('Kelaniya').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByText('View Group'));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/(DMC)/group-details', params: { ids: 'p1,p2', groupId: 'INC-001' } });
  });

  it('filters by hazard type and shows the empty state; back goes to incidents', async () => {
    await renderWithAuth(<ReportGroupsScreen />);
    await emitAll();
    await fireEvent.press(screen.getAllByText('Landslide')[1]);
    expect(screen.getByText('No grouped incidents yet')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Flood')[1]);
    expect(screen.getByText('INC-001')).toBeTruthy();
    await fireEvent.press(screen.getByText('All'));
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incidents');
  });
});

// ---------------------------------------------------------------------------
describe('Flood affected areas (flood-incidents.tsx)', () => {
  it('lists detected areas with risk and review status, filters and opens one', async () => {
    await renderWithAuth(<FloodIncidentsScreen />);
    await emitAll({ reviews: [{ id: INCIDENT_ID, status: 'Approved' }] });
    expect(screen.getByText(INCIDENT_ID)).toBeTruthy();
    expect(screen.getByText('LOW')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Pending').at(-1)!);
    expect(screen.queryByText(INCIDENT_ID)).toBeNull();
    expect(screen.getByText('No flood-affected areas detected')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Approved').at(-1)!);
    await fireEvent.press(screen.getByText('View Incident'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(`/(DMC)/flood-incident/${INCIDENT_ID}`);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incidents');
  });

  it('shows the empty state for "All" too', async () => {
    await renderWithAuth(<FloodIncidentsScreen />);
    await emitAll({ reports: [] });
    expect(screen.getByText('No flood-affected areas detected')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
describe('Create / edit public warning (create-alert.tsx)', () => {
  const fillRequired = async () => {
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Flood Warning'), 'Flood');
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the situation and any instructions for residents.'), 'Go');
  };

  it('prefills from a flood incident, publishes and links the warning back to the incident', async () => {
    setParams({ title: 'Flood Warning — Wattala', hazardType: 'flood', riskLevel: 'CRITICAL', affectedArea: 'Wattala', lat: '6.99', lng: '79.89', radius: '250', sourceReportId: 'v1', incidentId: INCIDENT_ID });
    const create = jest.spyOn(alertService, 'createWarning').mockResolvedValue('w-new');
    const link = jest.spyOn(incidentReview, 'linkFloodIncidentWarning').mockResolvedValue();
    await renderWithAuth(<CreateAlertScreen />);
    await emitAll();
    expect(screen.getByDisplayValue('Flood Warning — Wattala')).toBeTruthy();
    expect(screen.getByText('Linked to a verified incident report')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the situation and any instructions for residents.'), 'Evacuate');
    await fireEvent.press(screen.getByText('3 days'));
    await fireEvent.press(screen.getByText('Create Warning'));
    await waitFor(() => expect(link).toHaveBeenCalledWith(INCIDENT_ID, 'w-new'));
    const data = create.mock.calls[0][0];
    expect(data).toMatchObject({ riskLevel: 'CRITICAL', latitude: 6.99, longitude: 79.89, radius: 250, sourceReportId: 'v1', createdByName: OFFICER.email });
    expect(data.expiresAt.getTime() - Date.now()).toBeGreaterThan(71 * 3_600_000);
  });

  it('edit mode: shows the original created time, saves changes and goes back', async () => {
    setParams({
      warningId: 'w1', title: 'River overflow', hazardType: 'landslide', riskLevel: 'NOT_A_LEVEL', affectedArea: 'Kelaniya', message: 'Move',
      lat: '6.95', lng: '79.92', radius: '500', polygon: JSON.stringify(WARNINGS[0].polygon), originalCreatedAt: '2026-10-01T08:00:00.000Z',
    });
    const update = jest.spyOn(alertService, 'updateWarning').mockResolvedValue();
    await renderWithAuth(<CreateAlertScreen />);
    await emitAll();
    expect(screen.getByText('Edit Public Warning')).toBeTruthy();
    expect(screen.getByText('Custom boundary · 3 points')).toBeTruthy();
    expect(screen.getByText(/^Created: /)).toBeTruthy();
    await fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toBe('w1');
    expect(update.mock.calls[0][1]).toMatchObject({ hazardType: 'landslide', riskLevel: 'HIGH', polygon: WARNINGS[0].polygon });
    expect((Alert.alert as jest.Mock).mock.calls.at(-1)![0]).toBe('Warning updated');
    await pressAlertButton('OK');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('edit mode reports a failed save; a malformed polygon param falls back to a circle', async () => {
    setParams({ warningId: 'w1', title: 'T', affectedArea: 'A', message: 'M', polygon: '{not json' });
    jest.spyOn(alertService, 'updateWarning').mockRejectedValue(new Error('denied'));
    await renderWithAuth(<CreateAlertScreen />);
    expect(screen.getByText('Draw custom disaster area (full screen)')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save Changes'));
    await waitFor(() => expect((Alert.alert as jest.Mock).mock.calls.at(-1)).toEqual(['Failed to save changes', 'denied']));
  });

  it('picks a verified incident to prefill the zone, can unlink it, and switches hazard/risk', async () => {
    setParams({});
    const create = jest.spyOn(alertService, 'createWarning').mockResolvedValue('w9');
    await renderWithAuth(<CreateAlertScreen />);
    await emitAll();
    await fireEvent.press(screen.getByText('Select verified incident'));
    expect(screen.getByText('Select Verified Incident')).toBeTruthy();
    await fireEvent.press(screen.getByText('REP-20001'));
    expect(screen.getByDisplayValue('Wattala')).toBeTruthy();
    expect(screen.getByText('Linked to a verified incident report')).toBeTruthy();
    await fireEvent.press(screen.getByText('Clear'));
    expect(screen.queryByText('Linked to a verified incident report')).toBeNull();

    await fireEvent.press(screen.getByText('Landslide'));
    await fireEvent.press(screen.getByText('MEDIUM'));
    await fireEvent.press(screen.getByText('24 hours'));
    await fillRequired();
    await fireEvent.press(screen.getByText('Create Warning'));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ hazardType: 'landslide', riskLevel: 'MEDIUM', affectedArea: 'Wattala', sourceReportId: null, latitude: 6.99 });
  });

  it('refuses an incident with no GPS and closes the picker on overlay tap', async () => {
    setParams({});
    await renderWithAuth(<CreateAlertScreen />);
    const noGps = { ...REPORTS[3], latitude: undefined, longitude: undefined, id: 'nogps', referenceNumber: 'REP-NOGPS' };
    await emitAll({ reports: [noGps] as typeof REPORTS });
    await fireEvent.press(screen.getByText('Select verified incident'));
    await fireEvent.press(screen.getByText('REP-NOGPS'));
    expect((Alert.alert as jest.Mock).mock.calls.at(-1)).toEqual(['No coordinates', 'This report has no saved GPS location.']);
    await fireEvent.press(screen.getByText('Select Verified Incident').parent!.parent!);
    expect(screen.queryByText('Select Verified Incident')).toBeNull();
  });

  it('refuses to publish when signed out', async () => {
    setParams({ title: 'T', affectedArea: 'A', message: 'M' });
    const create = jest.spyOn(alertService, 'createWarning');
    await renderWithAuth(<CreateAlertScreen />, { user: null });
    await fireEvent.press(screen.getByText('Create Warning'));
    expect((Alert.alert as jest.Mock).mock.calls.at(-1)).toEqual(['Error', 'You must be logged in to create a warning.']);
    expect(create).not.toHaveBeenCalled();
  });

  it('back returns', async () => {
    setParams({});
    await renderWithAuth(<CreateAlertScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe('Report detail (incident/[id].tsx)', () => {
  const pending = { ...REPORTS[0], contactNumber: '0712345678', affectedItems: ['Road', 'Home'] };

  async function open(data: Record<string, any> | null, users: any[] = [{ id: 'u1', fullName: 'Nimal Perera' }]) {
    setParams({ id: 'p1' });
    const { getDocs } = jest.requireMock('firebase/firestore');
    getDocs.mockResolvedValue(fs.__makeQuerySnap(users));
    const utils = await renderWithAuth(<ReportDetailScreen />);
    const { id, ...rest } = (data ?? {}) as any;
    await act(async () => fs.__emit('reports/p1', { id: 'p1', data: data ? rest : null }));
    return utils;
  }

  it('shows a missing report with a way back', async () => {
    await open(null);
    expect(screen.getByText('This report no longer exists.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Go back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows all report details: resident, contact, items, map, description and photos', async () => {
    await open(pending);
    await screen.findByText('Submitted by Nimal Perera');
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText('0712345678')).toBeTruthy();
    expect(screen.getByText('Road, Home')).toBeTruthy();
    expect(screen.getByText('Rising')).toBeTruthy();
    expect(screen.getByText('EVIDENCE')).toBeTruthy();
    expect(screen.getByTestId('webview').props.html).toContain('6.95');
  });

  it('opens the photo viewer and closes it', async () => {
    const { root } = await open({ ...pending, photoUrls: ['https://p/1.jpg', 'https://p/2.jpg'] });
    const thumbs = () => root!.queryAll((n: any) => n.props?.source?.uri === 'https://p/2.jpg');
    expect(thumbs()).toHaveLength(1);
    await fireEvent.press(thumbs()[0]);
    expect(thumbs().length).toBeGreaterThan(1); // full-screen viewer renders the photos again
    await fireEvent.press(screen.getByTestId('icon-close'));
    expect(thumbs()).toHaveLength(1);
  });

  it('shows placeholders for a sparse report and falls back to the single photoUrl', async () => {
    await open({ ...pending, contactNumber: null, affectedItems: [], photoUrls: [], photoUrl: 'https://p/only.jpg', createdAt: null }, []);
    expect(screen.getByText('No contact provided')).toBeTruthy();
    expect(screen.getByText('None specified')).toBeTruthy();
    expect(screen.getByText('EVIDENCE')).toBeTruthy();
  });

  it('geocodes the typed address when the report has no GPS (approximate pin)', async () => {
    jest.spyOn(geocode, 'geocodeAddress').mockResolvedValue({ latitude: 7, longitude: 80 });
    const { latitude, longitude, ...noGps } = pending;
    await open({ ...noGps, photoUrls: [] });
    await screen.findByText('Approximate location, estimated from the affected area address');
    expect(screen.queryByText('EVIDENCE')).toBeNull();
  });

  it('says so when the address cannot be geocoded either', async () => {
    let resolve!: (v: null) => void;
    jest.spyOn(geocode, 'geocodeAddress').mockReturnValue(new Promise((r) => (resolve = r)));
    const { latitude, longitude, ...noGps } = pending;
    await open(noGps);
    expect(screen.getByText('Locating affected area…')).toBeTruthy();
    await act(async () => resolve(null));
    expect(screen.getByText('No location data for this report')).toBeTruthy();
  });

  it('shows the review outcome for decided reports', async () => {
    await open({ ...REPORTS[3], id: 'p1' });
    expect(screen.getByText(/^Approved · /)).toBeTruthy();
    await open({ ...REPORTS[5], id: 'p1', reviewedAt: null });
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);
    expect(screen.getByText('Reason: Duplicate')).toBeTruthy();
  });

  it('reject flow returns to the previous screen; cancel keeps you here', async () => {
    const reject = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    await open(pending);
    await fireEvent.press(screen.getByText('Reject'));
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getByText('Approve'));
    await fireEvent.press(screen.getByText('Cancel'));
    await fireEvent.press(screen.getByText('Reject'));
    await fireEvent.press(screen.getByText('Incorrect location'));
    await fireEvent.press(screen.getAllByText('Reject').at(-1)!);
    await waitFor(() => expect(reject).toHaveBeenCalledWith('p1', OFFICER.uid, 'Incorrect location', ''));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('back button returns', async () => {
    await open(pending);
    await fireEvent.press(screen.getAllByTestId('icon-chevron-back')[0]);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
