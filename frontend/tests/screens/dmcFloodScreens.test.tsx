import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import FloodWarningScreen from '../../app/(DMC)/flood-warning';
import GroupDetailsScreen from '../../app/(DMC)/group-details';
import FloodIncidentDetailScreen from '../../app/(DMC)/flood-incident/[id]';
import { useFloodData } from '../../hooks/useFloodData';
import { useFloodIncidents } from '../../hooks/useFloodIncidents';
import * as floodService from '../../services/floodService';
import * as reviewActions from '../../services/reportReviewActions';
import * as incidentReview from '../../services/floodIncidentReviewService';
import { renderWithAuth, OFFICER } from '../helpers/renderWithAuth';
import { asMock, fs, mockRouter, setParams } from '../helpers/firebaseMocks';
import { makeReading, makeStation, ts } from '../helpers/factories';
import { __messageEvent as msg } from '../mocks/webview';

jest.mock('../../hooks/useFloodData', () => ({ useFloodData: jest.fn() }));
jest.mock('../../hooks/useFloodIncidents', () => ({ useFloodIncidents: jest.fn() }));

let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  spies = [
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined),
    ...(['log', 'warn', 'info', 'error'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined)),
    jest.spyOn(floodService, 'fetchFloodEvents').mockResolvedValue([]),
  ];
});
afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// app/(DMC)/flood-warning.tsx
// ---------------------------------------------------------------------------
describe('Flood warning (river gauges)', () => {
  const NOW = Date.now();
  const stations = [
    makeStation({ station: 'Hanwella', basin: 'Kelani Ganga', alertLevel: 7, minorFloodLevel: 8, majorFloodLevel: 10 }),
    makeStation({ station: 'Glencourse', basin: 'Kelani Ganga' }),
    makeStation({ station: 'Nagalagam', basin: 'Kelani Ganga' }),
    makeStation({ station: 'Ratnapura', basin: 'Kalu Ganga' }),
    makeStation({ station: 'NoReading', basin: 'Gin Ganga', alertLevel: null, minorFloodLevel: null, majorFloodLevel: null }),
  ];
  const latestByStation = {
    Hanwella: makeReading({ gauge: 'Hanwella', waterLevel: 7.5, timestamp: NOW - 5 * 60_000 }), // alert
    Glencourse: makeReading({ gauge: 'Glencourse', waterLevel: 8.4, timestamp: NOW - 3 * 3_600_000 }), // minor
    Nagalagam: makeReading({ gauge: 'Nagalagam', waterLevel: 10.2, timestamp: NOW - 2 * 86_400_000 }), // major
    Ratnapura: makeReading({ gauge: 'Ratnapura', waterLevel: 2, timestamp: NOW - 10_000 }), // normal
  };
  const history = [
    makeReading({ gauge: 'Hanwella', timestamp: NOW - 2 * 3_600_000, waterLevel: 7.1, rainFall: 3.5 }),
    makeReading({ gauge: 'Hanwella', timestamp: NOW - 3_600_000, waterLevel: 7.5, rainFall: 1.25 }),
  ];

  function mockData(overrides: Partial<ReturnType<typeof useFloodData>> = {}) {
    const state = {
      stations,
      latestByStation,
      selectedStation: 'Hanwella',
      setSelectedStation: jest.fn(),
      history,
      loading: false,
      historyLoading: false,
      error: null,
      refresh: jest.fn(),
      ...overrides,
    } as ReturnType<typeof useFloodData>;
    asMock(useFloodData).mockReturnValue(state);
    return state;
  }

  it('shows a spinner (no content) while the first load is in flight', async () => {
    mockData({ loading: true, stations: [] });
    await render(<FloodWarningScreen />);
    expect(screen.queryByText('GAUGE STATION')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('shows the error with a working Retry', async () => {
    const state = mockData({ error: 'Failed to load flood stations' });
    await render(<FloodWarningScreen />);
    expect(screen.getByText('Failed to load flood stations')).toBeTruthy();
    await fireEvent.press(screen.getByText('Retry'));
    expect(state.refresh).toHaveBeenCalled();
  });

  it('summarises the network: 1 alert, 1 minor, 1 major station', async () => {
    mockData();
    await render(<FloodWarningScreen />);
    // Each tile renders its count right before its label.
    for (const label of ['Alert Stations', 'Minor Flood', 'Major Flood']) {
      const tile = screen.getAllByText(label)[0].parent!;
      const texts = tile.children.map((c: any) => c.props?.children);
      expect(texts[texts.indexOf(label) - 1]).toBe('1');
    }
  });

  it('shows the selected station: level, status badge, thresholds, rainfall and source', async () => {
    mockData();
    await render(<FloodWarningScreen />);
    expect(screen.getByText('7.50')).toBeTruthy();
    expect(screen.getByText('Current water level · updated 5 min ago')).toBeTruthy();
    expect(screen.getAllByText('Alert')).toHaveLength(3); // status badge + threshold pill + river-alert tab
    expect(screen.getByText('7m')).toBeTruthy();
    expect(screen.getByText('8m')).toBeTruthy();
    expect(screen.getByText('10m')).toBeTruthy();
    expect(screen.getByText('4.8 mm')).toBeTruthy(); // 3.5 + 1.25 in the last 24 h
    expect(screen.getByText('River Water at Hanwella in m')).toBeTruthy();
    expect(screen.getByText('RIVER ALERTS · HANWELLA')).toBeTruthy();
    expect(screen.getByText(/Sri Lanka Irrigation Department/)).toBeTruthy();
  });

  it.each([
    ['Minor Flood', 'Glencourse', 8.4, '3 hr ago'],
    ['Major Flood', 'Nagalagam', 10.2, '2 d ago'],
  ])('tapping the %s tile lists those stations; picking one selects it', async (tile, station, level, age) => {
    const state = mockData();
    await render(<FloodWarningScreen />);
    await fireEvent.press(screen.getAllByText(tile)[0]);
    expect(screen.getByText(`${tile} (1)`)).toBeTruthy();
    expect(screen.getByText(`Kelani Ganga · ${age}`)).toBeTruthy();
    expect(screen.getByText(`${level.toFixed(2)}m`)).toBeTruthy();
    await fireEvent.press(screen.getByText(station));
    expect(state.setSelectedStation).toHaveBeenCalledWith(station);
  });

  it('the Alert tile popup is titled "Alert Stations" and closes on overlay tap', async () => {
    mockData();
    await render(<FloodWarningScreen />);
    await fireEvent.press(screen.getByText('Alert Stations'));
    expect(screen.getByText('Alert Stations (1)')).toBeTruthy();
    // Overlay is the popup card's parent touchable.
    await fireEvent.press(screen.getByText('Alert Stations (1)').parent!.parent!.parent!);
    expect(screen.queryByText('Alert Stations (1)')).toBeNull();
  });

  it('shows an empty popup when no station is at that level', async () => {
    mockData({ latestByStation: { Ratnapura: latestByStation.Ratnapura } });
    await render(<FloodWarningScreen />);
    await fireEvent.press(screen.getAllByText('Major Flood')[0]);
    expect(screen.getByText('No stations at this level right now.')).toBeTruthy();
  });

  it('the station picker lists every station, marks the active one and selects on tap', async () => {
    const state = mockData();
    await render(<FloodWarningScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-down'));
    expect(screen.getByText('Select Gauge Station')).toBeTruthy();
    expect(screen.getByTestId('icon-checkmark')).toBeTruthy();
    expect(screen.getByText('Gin Ganga')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ratnapura'));
    expect(state.setSelectedStation).toHaveBeenCalledWith('Ratnapura');
    expect(screen.queryByText('Select Gauge Station')).toBeNull();
  });

  it('falls back to station thresholds and shows placeholders for a station with no reading', async () => {
    mockData({ selectedStation: 'NoReading', history: [] });
    await render(<FloodWarningScreen />);
    expect(screen.getByText('Current water level · updated No data')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4); // level + 3 thresholds
    expect(screen.getByText('Not reported')).toBeTruthy();
    expect(screen.getByText('No readings yet for this station')).toBeTruthy();
  });

  it('shows "just now" for a fresh reading and handles no selected station', async () => {
    mockData({ latestByStation: { ...latestByStation, Hanwella: makeReading({ gauge: 'Hanwella', waterLevel: 1, timestamp: Date.now() }) } });
    const { rerender } = await render(<FloodWarningScreen />);
    expect(screen.getByText('Current water level · updated just now')).toBeTruthy();
    expect(screen.getByText('Normal')).toBeTruthy();
    mockData({ selectedStation: null });
    await rerender(<FloodWarningScreen />);
    expect(screen.getByText('Select station')).toBeTruthy();
    expect(screen.getByText('Not reported')).toBeTruthy();
  });

  it('shows a chart spinner while history is loading', async () => {
    mockData({ historyLoading: true, history: [] });
    await render(<FloodWarningScreen />);
    expect(screen.queryByText('River Water at Hanwella in m')).toBeNull();
  });

  it('back button returns', async () => {
    mockData();
    await render(<FloodWarningScreen />);
    await fireEvent.press(screen.getAllByTestId('icon-chevron-back')[0]);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// app/(DMC)/group-details.tsx
// ---------------------------------------------------------------------------
describe('Group details (pending report group review)', () => {
  const now = Date.now();
  const pending = [
    { id: 'g1', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya', description: 'd', referenceNumber: 'REP-10001', userId: 'u', latitude: 6.95, longitude: 79.92, createdAt: ts(now - 3_600_000), photoUrls: ['https://p/1.jpg'] },
    { id: 'g2', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya North', description: 'd', referenceNumber: 'REP-10002', userId: 'u', createdAt: null },
    { id: 'other', status: 'Pending', disasterType: 'flood', affectedArea: 'Elsewhere', description: 'd', referenceNumber: 'REP-99999', userId: 'u' },
  ];
  const activeWarning = {
    id: 'w1', title: 'River overflow', hazardType: 'flood', riskLevel: 'HIGH', affectedArea: 'Kelaniya', latitude: 6.95, longitude: 79.92,
    radius: 500, polygon: [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 1 }, { latitude: 2, longitude: 2 }], message: 'Move',
    status: 'Active', createdBy: 'admin-1', createdAt: ts(now - 60_000), expiresAt: ts(now + 3_600_000),
  };
  const expiredWarning = { ...activeWarning, id: 'w2', polygon: null, createdAt: null, expiresAt: ts(now - 1000) };

  async function open(reports = pending, warnings: any[] = [activeWarning, expiredWarning]) {
    setParams({ ids: 'g1,g2', groupId: 'INC-001' });
    const utils = await renderWithAuth(<GroupDetailsScreen />);
    await act(async () => {
      fs.__emit('reports', reports);
      fs.__emit('warnings', warnings);
    });
    return utils;
  }

  it('shows a spinner until reports load', async () => {
    setParams({ ids: 'g1' });
    await renderWithAuth(<GroupDetailsScreen />);
    expect(screen.queryByText('OFFICER REVIEW')).toBeNull();
    expect(screen.queryByText('This group has already been reviewed.')).toBeNull();
  });

  it('shows "already reviewed" when none of the group is still pending, with a way back', async () => {
    await open([pending[2]]);
    expect(screen.getByText('This group has already been reviewed.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Back to groups'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(DMC)/report-groups');
  });

  it('lists only the grouped reports with header, map and warning legend', async () => {
    await open();
    expect(screen.getByText('DMC · GROUP DETAILS · INC-001')).toBeTruthy();
    expect(screen.getByText('Flood · 2 reports')).toBeTruthy();
    expect(screen.getByText('REP-10001')).toBeTruthy();
    expect(screen.getByText('REP-10002')).toBeTruthy();
    expect(screen.queryByText('REP-99999')).toBeNull();
    expect(screen.getByText('WARNINGS')).toBeTruthy(); // only the active warning is overlaid
    const html: string = screen.getByTestId('webview').props.html;
    expect(html).toContain('"id":"w1"');
    expect(html).not.toContain('"id":"w2"');
  });

  it('hides the warning legend when no warning is active', async () => {
    await open(pending, [expiredWarning]);
    expect(screen.queryByText('WARNINGS')).toBeNull();
  });

  it('opens a report from the list or from a map pin', async () => {
    await open();
    await fireEvent.press(screen.getByText('REP-10002'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(DMC)/incident/g2');
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'viewDetails', id: 'g1' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incident/g1');
  });

  it('editing a warning from the map pre-fills create-alert', async () => {
    await open();
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'editWarning', id: 'w1' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/(DMC)/create-alert',
      params: expect.objectContaining({
        warningId: 'w1',
        title: 'River overflow',
        lat: '6.95',
        lng: '79.92',
        radius: '500',
        polygon: JSON.stringify(activeWarning.polygon),
        originalCreatedAt: expect.any(String),
      }),
    });
  });

  it('edit falls back gracefully: no polygon/createdAt, unknown id and malformed messages are ignored', async () => {
    await open();
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'editWarning', id: 'w2' }));
    expect(mockRouter.push.mock.calls.at(-1)![0].params).toMatchObject({ polygon: undefined, originalCreatedAt: undefined });
    const before = mockRouter.push.mock.calls.length;
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'editWarning', id: 'nope' }));
    await fireEvent(screen.getByTestId('webview'), 'message', msg('not json'));
    expect(mockRouter.push.mock.calls.length).toBe(before);
  });

  it('expands to a full-screen map and closes it', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('icon-expand'));
    expect(screen.getAllByTestId('webview')).toHaveLength(2);
    await fireEvent.press(screen.getByTestId('icon-close'));
    expect(screen.getAllByTestId('webview')).toHaveLength(1);
  });

  it('Approve All verifies every report in the group and goes to the main map', async () => {
    const spy = jest.spyOn(reviewActions, 'approveReport').mockResolvedValue();
    await open();
    await fireEvent.press(screen.getByText('Approve All'));
    expect(screen.getByText('Approve 2 reports?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(DMC)/map'));
    expect(spy.mock.calls.map((c) => c[0]).sort()).toEqual(['g1', 'g2']);
    expect(spy).toHaveBeenCalledWith('g1', OFFICER.uid);
  });

  it('Reject All rejects the group with a reason and returns to groups', async () => {
    const spy = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    await open();
    await fireEvent.press(screen.getByText('Reject All'));
    await fireEvent.press(screen.getByText('Duplicate'));
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(DMC)/report-groups'));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('dialogs can be cancelled; back returns', async () => {
    await open();
    await fireEvent.press(screen.getByText('Approve All'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Approve 2 reports?')).toBeNull();
    await fireEvent.press(screen.getByText('Reject All'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Reject 2 reports')).toBeNull();
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('works with no ids param (treats the group as empty)', async () => {
    setParams({});
    await renderWithAuth(<GroupDetailsScreen />);
    await act(async () => fs.__emit('reports', pending));
    expect(screen.getByText('This group has already been reviewed.')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// app/(DMC)/flood-incident/[id].tsx
// ---------------------------------------------------------------------------
describe('Flood incident detail (auto-generated affected area)', () => {
  const incident = (overrides: Record<string, unknown> = {}) => ({
    id: 'FLD-abc',
    affectedArea: 'Kelaniya',
    reports: [
      { id: 'r1', referenceNumber: 'REP-11111', affectedArea: 'Kelaniya', location: { latitude: 6.95, longitude: 79.92 }, createdAt: null },
      { id: 'r2', referenceNumber: 'REP-22222', affectedArea: 'Kelaniya East', location: { latitude: 6.951, longitude: 79.921 }, createdAt: null },
    ],
    centroid: { latitude: 6.9505, longitude: 79.9205 },
    polygon: null,
    radiusMeters: 212.6,
    riskLevel: 'HIGH',
    generatedAt: ts(new Date(2026, 9, 9, 14, 30).getTime()),
    reviewStatus: 'Pending',
    review: null,
    ...overrides,
  });

  function mockIncidents(list: any[], loading = false) {
    asMock(useFloodIncidents).mockReturnValue({ incidents: list, loading } as any);
  }

  beforeEach(() => setParams({ id: 'FLD-abc' }));

  it('shows a spinner while loading', async () => {
    mockIncidents([], true);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.queryByText(/no longer exists/)).toBeNull();
  });

  it('explains when the incident no longer exists and links back', async () => {
    mockIncidents([incident({ id: 'FLD-other' })]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.getByText(/This affected area no longer exists/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Back to flood zones'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(DMC)/flood-incidents');
  });

  it('shows a Pending incident: risk, details, notice, member reports and review actions', async () => {
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.getByText('DMC · FLD-abc')).toBeTruthy();
    expect(screen.getByText('Kelaniya (Polygon Area)')).toBeTruthy();
    expect(screen.getByText('2 reports grouped')).toBeTruthy();
    expect(screen.getByText('Risk: HIGH')).toBeTruthy(); // map badge
    expect(screen.getByText('Pending Officer Approval')).toBeTruthy();
    expect(screen.getByText('Public Warning')).toBeTruthy();
    expect(screen.getByText('REPORTS IN THIS AREA (2)')).toBeTruthy();
    expect(screen.getByText('Reject')).toBeTruthy();
    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull(); // generatedAt is formatted
  });

  it('shows "—" when there is no generated time', async () => {
    mockIncidents([incident({ generatedAt: null, riskLevel: 'LOW' })]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('opens member reports from the list and from the map', async () => {
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByText('REP-22222'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(DMC)/incident/r2');
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'reportTap', id: 'r1' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/(DMC)/incident/r1');
  });

  it('expands the map full screen and closes it', async () => {
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByTestId('icon-expand'));
    expect(screen.getAllByTestId('webview')).toHaveLength(2);
    await fireEvent.press(screen.getByTestId('icon-close'));
    expect(screen.getAllByTestId('webview')).toHaveLength(1);
  });

  it('Approve opens the dialog and records the officer decision', async () => {
    const spy = jest.spyOn(incidentReview, 'approveFloodIncident').mockResolvedValue();
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByText('Approve'));
    expect(screen.getByText('Approve this affected area?')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Approve').at(-1)!);
    await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'FLD-abc' }), OFFICER.uid, OFFICER.email));
    await waitFor(() => expect(screen.queryByText('Approve this affected area?')).toBeNull());
  });

  it('Reject opens the dialog, sends a reason and closes; Cancel also closes', async () => {
    const spy = jest.spyOn(incidentReview, 'rejectFloodIncident').mockResolvedValue();
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByText('Reject'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Reject this affected area')).toBeNull();
    await fireEvent.press(screen.getByText('Reject'));
    await fireEvent.press(screen.getByText('Insufficient evidence'));
    await fireEvent.press(screen.getAllByText('Reject').at(-1)!);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Reject this affected area')).toBeNull());
  });

  it('Approve dialog Cancel closes it', async () => {
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByText('Approve'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByText('Approve this affected area?')).toBeNull();
  });

  it('a Rejected incident shows its reason and offers "Update Reason"', async () => {
    mockIncidents([incident({ reviewStatus: 'Rejected', review: { status: 'Rejected', rejectionReason: 'False cluster / not related' } })]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('Reason: False cluster / not related')).toBeTruthy();
    expect(screen.getByText('Update Reason')).toBeTruthy();
    expect(screen.queryByText('Public Warning')).toBeNull();
  });

  it('an Approved incident publishes a pre-filled public warning', async () => {
    mockIncidents([incident({ reviewStatus: 'Approved', review: { status: 'Approved' }, riskLevel: 'CRITICAL' })]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
    await fireEvent.press(screen.getByText('Publish Public Warning'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(DMC)/create-alert',
      params: {
        title: 'Flood Warning — Kelaniya',
        hazardType: 'flood',
        riskLevel: 'CRITICAL',
        affectedArea: 'Kelaniya',
        lat: '6.9505',
        lng: '79.9205',
        radius: '213',
        sourceReportId: 'r1',
        incidentId: 'FLD-abc',
      },
    });
  });

  it('offers "Publish Another Warning" once one exists, and tolerates an incident with no reports', async () => {
    mockIncidents([incident({ reviewStatus: 'Approved', review: { status: 'Approved', warningId: 'w1' }, reports: [], riskLevel: 'MEDIUM' })]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByText('Publish Another Warning'));
    expect(mockRouter.push.mock.calls[0][0].params.sourceReportId).toBe('');
  });

  it('back returns', async () => {
    mockIncidents([incident()]);
    await renderWithAuth(<FloodIncidentDetailScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
