import React from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { ApproveConfirmDialog } from '../../components/ApproveConfirmDialog';
import { RejectReasonDialog } from '../../components/RejectReasonDialog';
import { ApproveFloodIncidentDialog } from '../../components/ApproveFloodIncidentDialog';
import { RejectFloodIncidentDialog } from '../../components/RejectFloodIncidentDialog';
import { DMCNavHeader, DMCMenuModal, DMCNotificationsModal, useDMCScrollHeader } from '../../components/DMCNavHeader';
import { RiverAlertPanel } from '../../components/RiverAlertPanel';
import { PhotoUploadCard } from '../../components/PhotoUploadCard';
import { LocationPickerMap } from '../../components/LocationPickerMap';
import { FloodIncidentMap } from '../../components/FloodIncidentMap';
import { WarningsMapModal } from '../../components/WarningsMapModal';
import { PolygonCreatorModal } from '../../components/PolygonCreatorModal';
import { CircleZoneFullScreenModal } from '../../components/CircleZoneFullScreenModal';
import { UserMapEngine } from '../../components/UserMapEngine';
import { AddEmergencyContactModal } from '../../components/emergency/AddEmergencyContactModal';
import { NationalEmergencyGrid } from '../../components/emergency/NationalEmergencyGrid';
import { PersonalEmergencyContacts } from '../../components/emergency/PersonalEmergencyContacts';
import { ShareLocationCard } from '../../components/emergency/ShareLocationCard';
import * as reviewActions from '../../services/reportReviewActions';
import * as incidentReview from '../../services/floodIncidentReviewService';
import * as floodService from '../../services/floodService';
import { renderHook } from '@testing-library/react-native';
import { renderWithAuth, OFFICER } from '../helpers/renderWithAuth';
import { asMock, fs, mockRouter } from '../helpers/firebaseMocks';
import { makeReport, makeReading } from '../helpers/factories';
import { __injected as injected, __messageEvent as msg } from '../mocks/webview';
import en from '../../i18n/locales/en.json';

let alertSpy: jest.SpyInstance;
let logSpies: jest.SpyInstance[];
beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  logSpies = (['error', 'warn', 'log', 'info'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  alertSpy.mockRestore();
  logSpies.forEach((s) => s.mockRestore());
  jest.restoreAllMocks();
});

/** Presses an Alert.alert button by its label, on the most recent alert. */
async function pressAlertButton(label: string) {
  const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => any }[];
  await act(async () => {
    await buttons.find((b) => b.text === label)!.onPress?.();
  });
}

const incident = {
  id: 'FLD-1',
  affectedArea: 'Kelaniya',
  riskLevel: 'HIGH',
  reports: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  centroid: { latitude: 7, longitude: 80 },
  polygon: null,
  radiusMeters: 200,
  generatedAt: null,
} as any;

describe('ApproveConfirmDialog', () => {
  it('renders nothing for an empty selection', async () => {
    const { toJSON } = await render(<ApproveConfirmDialog visible reports={[]} onClose={jest.fn()} onApproved={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('approves a single report as the signed-in officer', async () => {
    const spy = jest.spyOn(reviewActions, 'approveReport').mockResolvedValue();
    const onApproved = jest.fn();
    const r = makeReport({ affectedArea: 'Wattala', referenceNumber: 'REP-5' });
    await renderWithAuth(<ApproveConfirmDialog visible reports={[r]} onClose={jest.fn()} onApproved={onApproved} />);
    expect(screen.getByText('Approve this report?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(r.id, OFFICER.uid);
  });

  it('approves every report in a group', async () => {
    const spy = jest.spyOn(reviewActions, 'approveReport').mockResolvedValue();
    await renderWithAuth(<ApproveConfirmDialog visible reports={[makeReport(), makeReport()]} onClose={jest.fn()} onApproved={jest.fn()} />);
    expect(screen.getByText('Approve 2 reports?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('shows the review error message (e.g. already reviewed) and does not close', async () => {
    jest.spyOn(reviewActions, 'approveReport').mockRejectedValue(new reviewActions.ReportReviewError('This report is no longer pending review.'));
    const onApproved = jest.fn();
    await renderWithAuth(<ApproveConfirmDialog visible reports={[makeReport()]} onClose={jest.fn()} onApproved={onApproved} />);
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Approval failed', 'This report is no longer pending review.'));
    expect(onApproved).not.toHaveBeenCalled();
  });

  it('shows a generic message for unexpected errors', async () => {
    jest.spyOn(reviewActions, 'approveReport').mockRejectedValue(new Error('network'));
    await renderWithAuth(<ApproveConfirmDialog visible reports={[makeReport()]} onClose={jest.fn()} onApproved={jest.fn()} />);
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(alertSpy.mock.calls[0][1]).toMatch(/Something went wrong/));
  });

  it('does nothing when signed out', async () => {
    const spy = jest.spyOn(reviewActions, 'approveReport');
    await renderWithAuth(<ApproveConfirmDialog visible reports={[makeReport()]} onClose={jest.fn()} onApproved={jest.fn()} />, { user: null });
    await fireEvent.press(screen.getByText('Approve'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('Cancel calls onClose', async () => {
    const onClose = jest.fn();
    await renderWithAuth(<ApproveConfirmDialog visible reports={[makeReport()]} onClose={onClose} onApproved={jest.fn()} />);
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RejectReasonDialog', () => {
  it('keeps Reject disabled until a reason is chosen', async () => {
    const spy = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    await renderWithAuth(<RejectReasonDialog visible reports={[makeReport()]} onClose={jest.fn()} onRejected={jest.fn()} />);
    await fireEvent.press(screen.getByText('Reject'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects with a preset reason', async () => {
    const spy = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    const onRejected = jest.fn();
    const r = makeReport();
    await renderWithAuth(<RejectReasonDialog visible reports={[r]} onClose={jest.fn()} onRejected={onRejected} />);
    await fireEvent.press(screen.getByText('Duplicate'));
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(onRejected).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(r.id, OFFICER.uid, 'Duplicate', '');
  });

  it('requires text for "Other" and trims it', async () => {
    const spy = jest.spyOn(reviewActions, 'rejectReport').mockResolvedValue();
    await renderWithAuth(<RejectReasonDialog visible reports={[makeReport(), makeReport()]} onClose={jest.fn()} onRejected={jest.fn()} />);
    expect(screen.getByText('Reject 2 reports')).toBeTruthy();
    await fireEvent.press(screen.getByText('Other'));
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the reason'), '   ');
    await fireEvent.press(screen.getByText('Reject'));
    expect(spy).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the reason'), '  Old photo  ');
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[0].slice(2)).toEqual(['Other', 'Old photo']);
  });

  it('alerts on failure and resets on Cancel', async () => {
    jest.spyOn(reviewActions, 'rejectReport').mockRejectedValue(new Error('x'));
    const onClose = jest.fn();
    await renderWithAuth(<RejectReasonDialog visible reports={[makeReport()]} onClose={onClose} onRejected={jest.fn()} />);
    await fireEvent.press(screen.getByText('False report'));
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Rejection failed', expect.stringMatching(/Something went wrong/)));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Flood incident dialogs', () => {
  it('Approve records the officer (uid + email) and closes', async () => {
    const spy = jest.spyOn(incidentReview, 'approveFloodIncident').mockResolvedValue();
    const onApproved = jest.fn();
    await renderWithAuth(<ApproveFloodIncidentDialog visible incident={incident} onClose={jest.fn()} onApproved={onApproved} />);
    expect(screen.getByText(/3 reports, HIGH risk/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(incident, OFFICER.uid, OFFICER.email);
  });

  it('Approve alerts on failure; renders nothing without an incident', async () => {
    jest.spyOn(incidentReview, 'approveFloodIncident').mockRejectedValue(new Error('x'));
    await renderWithAuth(<ApproveFloodIncidentDialog visible incident={incident} onClose={jest.fn()} onApproved={jest.fn()} />);
    await fireEvent.press(screen.getByText('Approve'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Approval failed', expect.any(String)));
    const { toJSON } = await render(<ApproveFloodIncidentDialog visible incident={null} onClose={jest.fn()} onApproved={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('Reject sends the preset reason, or the custom text for "Other"', async () => {
    const spy = jest.spyOn(incidentReview, 'rejectFloodIncident').mockResolvedValue();
    const onRejected = jest.fn();
    await renderWithAuth(<RejectFloodIncidentDialog visible incident={incident} onClose={jest.fn()} onRejected={onRejected} />);
    await fireEvent.press(screen.getByText('Other'));
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the reason'), ' River receded ');
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(onRejected).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith(incident, OFFICER.uid, 'River receded', OFFICER.email);

    await fireEvent.press(screen.getByText('Insufficient evidence'));
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1][2]).toBe('Insufficient evidence');
  });

  it('Reject alerts on failure', async () => {
    jest.spyOn(incidentReview, 'rejectFloodIncident').mockRejectedValue(new Error('x'));
    await renderWithAuth(<RejectFloodIncidentDialog visible incident={incident} onClose={jest.fn()} onRejected={jest.fn()} />);
    await fireEvent.press(screen.getByText('Duplicate of another incident'));
    await fireEvent.press(screen.getByText('Reject'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Rejection failed', expect.any(String)));
  });
});

describe('DMCNavHeader', () => {
  it('shows the pending count badge and lists pending reports in the bell menu', async () => {
    await render(<DMCNavHeader eyebrow="DMC" title="Dashboard" />);
    await act(async () =>
      fs.__emit('reports', [
        { id: 'p1', status: 'Pending', disasterType: 'flood', affectedArea: 'Kelaniya' },
        { id: 'p2', status: 'Pending', disasterType: 'landslide', affectedArea: 'Badulla' },
      ])
    );
    expect(screen.getByText('2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('icon-notifications-outline'));
    expect(screen.getByText('Landslide in Badulla')).toBeTruthy();
    await fireEvent.press(screen.getByText('Flood in Kelaniya'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(DMC)/incident/p1');
  });

  it('menu links navigate and close', async () => {
    await render(<DMCNavHeader eyebrow="DMC" title="Dashboard" />);
    await fireEvent.press(screen.getByTestId('icon-menu'));
    await fireEvent.press(screen.getByText('Public Warnings'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(DMC)/alerts');
  });

  it('collapsing variant (with scrollY) still exposes menu and bell', async () => {
    const { result } = await renderHook(() => useDMCScrollHeader());
    expect(result.current.headerHeight).toBeGreaterThan(0);
    const onBack = jest.fn();
    await render(<DMCNavHeader eyebrow="DMC" title="Map" scrollY={result.current.scrollY} onBack={onBack} />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('notifications modal: empty state, view-all and back-to-resident', async () => {
    const onClose = jest.fn();
    const { rerender } = await render(<DMCNotificationsModal visible onClose={onClose} pendingReports={[]} />);
    expect(screen.getByText('No pending reports')).toBeTruthy();
    await rerender(<DMCNotificationsModal visible onClose={onClose} pendingReports={Array.from({ length: 6 }, () => makeReport())} />);
    expect(screen.getAllByText(/^Flood in /)).toHaveLength(4); // capped at 4
    await fireEvent.press(screen.getByText('View all pending reports'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(DMC)/incidents');

    await render(<DMCMenuModal visible onClose={onClose} />);
    await fireEvent.press(screen.getByText('Back to Resident App'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(user)/(tabs)');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RiverAlertPanel', () => {
  it('groups the last 4 days of events into Alert / Minor / Major tabs with counts', async () => {
    jest.spyOn(floodService, 'fetchFloodEvents').mockResolvedValue([
      makeReading({ gauge: 'Hanwella', waterLevel: 7.2 }),
      makeReading({ gauge: 'Glencourse', waterLevel: 8.5, timestamp: Date.now() - 1 }),
      makeReading({ gauge: 'Nagalagam', waterLevel: 11 }),
      makeReading({ gauge: 'Normal', waterLevel: 2 }),
    ]);
    await render(<RiverAlertPanel />);
    await screen.findByText('Alert (1)');
    expect(screen.getByText('Minor (1)')).toBeTruthy();
    expect(screen.getByText(/Hanwella\s+7\.20m/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Major (1)'));
    expect(screen.getByText('Major Flood Level Stations (Last 4 days)')).toBeTruthy();
    expect(screen.getByText(/Nagalagam\s+11\.00m/)).toBeTruthy();
  });

  it('filters to a single station and shows the empty message', async () => {
    jest.spyOn(floodService, 'fetchFloodEvents').mockResolvedValue([makeReading({ gauge: 'Hanwella', waterLevel: 7.5 })]);
    await render(<RiverAlertPanel station="Glencourse" />);
    await screen.findByText('No Alert Flood Level Stations for the Last 4 Days');
  });

  it('shows the error with a working Retry', async () => {
    const spy = jest.spyOn(floodService, 'fetchFloodEvents').mockRejectedValueOnce(new Error('ArcGIS down')).mockResolvedValueOnce([]);
    await render(<RiverAlertPanel />);
    await screen.findByText('ArcGIS down');
    await fireEvent.press(screen.getByText('Retry'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await screen.findByText(/No Alert Flood Level Stations/);
  });
});

describe('PhotoUploadCard', () => {
  it('shows the counter and remove buttons; hides the picker at 3 photos', async () => {
    const onRemove = jest.fn();
    const { rerender } = await render(<PhotoUploadCard photoUris={['a', 'b']} onPhotoSelect={jest.fn()} onPhotoRemove={onRemove} />);
    expect(screen.getByText('(2/3)')).toBeTruthy();
    await fireEvent.press(screen.getAllByTestId('icon-close-circle')[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
    await rerender(<PhotoUploadCard photoUris={['a', 'b', 'c']} onPhotoSelect={jest.fn()} onPhotoRemove={onRemove} />);
    expect(screen.queryByTestId('icon-camera-outline')).toBeNull();
  });

  it('takes a photo with the camera', async () => {
    asMock(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///cam.jpg' }] } as any);
    const onSelect = jest.fn();
    await render(<PhotoUploadCard onPhotoSelect={onSelect} onPhotoRemove={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('icon-camera-outline'));
    await pressAlertButton('Take Photo');
    expect(onSelect).toHaveBeenCalledWith('file:///cam.jpg');
  });

  it('picks up to the remaining slots from the gallery', async () => {
    asMock(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'g1' }, { uri: 'g2' }] } as any);
    const onSelect = jest.fn();
    await render(<PhotoUploadCard photoUris={['a']} onPhotoSelect={onSelect} onPhotoRemove={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('icon-camera-outline'));
    await pressAlertButton('Choose from Gallery');
    expect(asMock(ImagePicker.launchImageLibraryAsync).mock.calls[0][0]).toMatchObject({ selectionLimit: 2, allowsMultipleSelection: true });
    expect(onSelect).toHaveBeenCalledWith(['g1', 'g2']);
  });

  it('explains when camera permission is denied', async () => {
    asMock(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: false } as any);
    const onSelect = jest.fn();
    await render(<PhotoUploadCard onPhotoSelect={onSelect} onPhotoRemove={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('icon-camera-outline'));
    await pressAlertButton('Take Photo');
    expect(alertSpy.mock.calls.at(-1)![0]).toBe('Permission needed');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('Map wrappers', () => {
  const pickerProps = () => ({
    latitude: 7,
    longitude: 80,
    radius: 500,
    riskLevel: 'HIGH' as const,
    hazardType: 'flood' as const,
    onChangeLocation: jest.fn(),
    onChangeRadius: jest.fn(),
    onChangePolygon: jest.fn(),
  });

  it('LocationPickerMap forwards map moves, radius presets, locate-me, and syncs props into the page', async () => {
    const p = pickerProps();
    const { rerender } = await render(<LocationPickerMap {...p} />);
    const web = screen.getByTestId('webview');
    expect(web.props.html).toContain('<!DOCTYPE html>');
    await fireEvent(web, 'message', msg({ type: 'locationChange', lat: 7.1, lng: 80.1 }));
    expect(p.onChangeLocation).toHaveBeenCalledWith({ latitude: 7.1, longitude: 80.1 });
    await fireEvent(web, 'message', msg('not json'));
    expect(p.onChangeLocation).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('2 km'));
    expect(p.onChangeRadius).toHaveBeenCalledWith(2000);

    await fireEvent.press(screen.getByTestId('icon-locate'));
    await waitFor(() => expect(p.onChangeLocation).toHaveBeenLastCalledWith({ latitude: 6.9271, longitude: 79.8612 }));

    await rerender(<LocationPickerMap {...p} radius={1000} />);
    expect(injected.some((js) => js.includes('window.setRadius(1000)'))).toBe(true);
  });

  it('LocationPickerMap in polygon mode offers edit / revert-to-circle', async () => {
    const p = pickerProps();
    await render(<LocationPickerMap {...p} polygon={[{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 1 }, { latitude: 2, longitude: 2 }]} />);
    expect(screen.getByText('Custom boundary · 3 points')).toBeTruthy();
    await fireEvent.press(screen.getByText('Use circle instead'));
    expect(p.onChangePolygon).toHaveBeenCalledWith(null);
  });

  it('PolygonCreatorModal mirrors the page, enables Done at 3 points, and drives undo/clear', async () => {
    const onDone = jest.fn();
    await render(
      <PolygonCreatorModal visible centerLatitude={7} centerLongitude={80} riskLevel="HIGH" hazardType="flood" onCancel={jest.fn()} onDone={onDone} />
    );
    await fireEvent.press(screen.getByText('Done'));
    expect(onDone).not.toHaveBeenCalled();
    const pts = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 1 },
      { lat: 2, lng: 2 },
    ];
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'polygonChange', points: pts }));
    await fireEvent.press(screen.getByText('Undo'));
    expect(injected.at(-1)).toContain('undoLastPoint');
    await fireEvent.press(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalledWith([
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ]);
  });

  it('PolygonCreatorModal and CircleZoneFullScreenModal render nothing when hidden', async () => {
    const a = await render(
      <PolygonCreatorModal visible={false} centerLatitude={7} centerLongitude={80} riskLevel="HIGH" hazardType="flood" onCancel={jest.fn()} onDone={jest.fn()} />
    );
    expect(a.toJSON()).toBeNull();
    const b = await render(<CircleZoneFullScreenModal visible={false} {...pickerProps()} onClose={jest.fn()} />);
    expect(b.toJSON()).toBeNull();
  });

  it('CircleZoneFullScreenModal forwards moves and closes on Done', async () => {
    const p = { ...pickerProps(), onClose: jest.fn() };
    await render(<CircleZoneFullScreenModal visible {...p} />);
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'locationChange', lat: 8, lng: 81 }));
    expect(p.onChangeLocation).toHaveBeenCalledWith({ latitude: 8, longitude: 81 });
    await fireEvent.press(screen.getByText('Done'));
    expect(p.onClose).toHaveBeenCalled();
  });

  it('FloodIncidentMap forwards report taps and shows the risk badge', async () => {
    const onReportTap = jest.fn();
    await render(
      <FloodIncidentMap
        data={{ reports: [], centroid: { latitude: 7, longitude: 80 }, polygon: null, radiusMeters: 150, riskLevel: 'CRITICAL' }}
        reportCount={2}
        onReportTap={onReportTap}
      />
    );
    expect(screen.getByText('Risk: CRITICAL')).toBeTruthy();
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'reportTap', id: 'r9' }));
    expect(onReportTap).toHaveBeenCalledWith('r9');
  });

  it('WarningsMapModal: hidden, empty, and edit-warning bridge', async () => {
    const onEdit = jest.fn();
    const hidden = await render(<WarningsMapModal visible={false} warnings={[]} onClose={jest.fn()} onEditWarning={onEdit} onViewList={jest.fn()} />);
    expect(hidden.toJSON()).toBeNull();
    const { rerender } = await render(<WarningsMapModal visible warnings={[]} onClose={jest.fn()} onEditWarning={onEdit} onViewList={jest.fn()} />);
    expect(screen.getByText('No warnings to show on the map.')).toBeTruthy();
    await rerender(
      <WarningsMapModal
        visible
        warnings={[{ id: 'w1', title: 'T', affectedArea: 'A', hazardType: 'flood', riskLevel: 'LOW', status: 'Active', latitude: 7, longitude: 80, radius: 300, polygon: null }]}
        onClose={jest.fn()}
        onEditWarning={onEdit}
        onViewList={jest.fn()}
      />
    );
    await fireEvent(screen.getByTestId('webview'), 'message', msg({ type: 'editWarning', id: 'w1' }));
    expect(onEdit).toHaveBeenCalledWith('w1');
  });

  it('UserMapEngine: asks for permission, centres on the user, reverse-geocodes taps', async () => {
    const onLocationSelect = jest.fn();
    await render(<UserMapEngine mode="report" onLocationSelect={onLocationSelect} warnings={[]} />);
    const web = await screen.findByTestId('webview');
    await fireEvent(web, 'loadEnd');
    await waitFor(() => expect(injected.some((js) => js.includes('window.centerOnUser(6.9271, 79.8612)'))).toBe(true));
    await fireEvent(web, 'message', msg({ type: 'mapTap', lat: 7, lng: 80 }));
    await waitFor(() => expect(onLocationSelect).toHaveBeenLastCalledWith({ latitude: 7, longitude: 80 }, 'Main St, Colombo', false));
  });

  it('UserMapEngine explains when location permission is denied', async () => {
    asMock(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied' } as any);
    await render(<UserMapEngine mode="home" />);
    // map.permissionDenied is not in en.json, so the t() default text is shown.
    await screen.findByText('Location permission is required to use the map.');
  });
});

describe('Emergency', () => {
  const save = () => jest.fn(async () => ({ success: true }));

  it('NationalEmergencyGrid dials the tapped service', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<NationalEmergencyGrid />);
    await fireEvent.press(screen.getByLabelText('Call Police on 119'));
    expect(open).toHaveBeenCalledWith('tel:119');
  });

  it('AddEmergencyContactModal saves a cleaned contact with "Other" as the default category', async () => {
    const onSave = save();
    const onClose = jest.fn();
    await render(<AddEmergencyContactModal visible onClose={onClose} onSave={onSave} existingContacts={[]} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), '  Mum ');
    await fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), '071-234 5678');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith({ name: 'Mum', category: 'Other', phone: '0712345678' });
  });

  it('AddEmergencyContactModal keeps Save disabled for an invalid number', async () => {
    const onSave = save();
    await render(<AddEmergencyContactModal visible onClose={jest.fn()} onSave={onSave} existingContacts={[]} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Mum');
    await fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), '12345');
    await fireEvent.press(screen.getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('AddEmergencyContactModal rejects a duplicate number and surfaces save errors', async () => {
    const existing = [{ id: '1', name: 'Dad', category: 'Family', phone: '0712345678', createdAt: 1 }];
    const onSave = jest.fn(async () => ({ success: false, error: 'Disk full' }));
    await render(<AddEmergencyContactModal visible onClose={jest.fn()} onSave={onSave} existingContacts={existing} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Dad again');
    await fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), '071 234 5678');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('This contact number already exists')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), '0771234567');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Disk full')).toBeTruthy();
  });

  it.failing('KNOWN GAP: the same number in +94 form is not detected as a duplicate', async () => {
    const existing = [{ id: '1', name: 'Dad', category: 'Family', phone: '0712345678', createdAt: 1 }];
    const onSave = save();
    await render(<AddEmergencyContactModal visible onClose={jest.fn()} onSave={onSave} existingContacts={existing} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Dad');
    await fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), '+94712345678');
    await fireEvent.press(screen.getByText('Save'));
    await act(async () => undefined);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('PersonalEmergencyContacts lists, formats, calls, deletes and caps at 5', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await AsyncStorage.setItem(
      '@floodguard_personal_emergency_contacts',
      JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `Contact ${i}`, category: 'Family', phone: `071234567${i}`, createdAt: i })))
    );
    await renderWithAuth(<PersonalEmergencyContacts />);
    expect(await screen.findByText('Contact 0')).toBeTruthy();
    expect(screen.getByText(/071 234 5670/)).toBeTruthy();

    await fireEvent.press(screen.getByText(/Add$/));
    expect(alertSpy.mock.calls.at(-1)![0]).toBe('Limit Reached');

    await fireEvent.press(screen.getAllByTestId('icon-call')[0]);
    expect(open).toHaveBeenCalledWith('tel:0712345670');

    await fireEvent.press(screen.getAllByTestId('icon-trash-outline')[0]);
    await pressAlertButton('Delete');
    await waitFor(() => expect(screen.queryByText('Contact 0')).toBeNull());
  });

  it('PersonalEmergencyContacts sends an SMS with the live location link', async () => {
    Platform.OS = 'android';
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await AsyncStorage.setItem(
      '@floodguard_personal_emergency_contacts',
      JSON.stringify([{ id: 'c1', name: 'Mum', category: 'Family', phone: '0712345678', createdAt: 1 }])
    );
    await renderWithAuth(<PersonalEmergencyContacts />);
    await screen.findByText('Mum');
    await fireEvent.press(screen.getByTestId('icon-send'));
    await waitFor(() => expect(open).toHaveBeenCalled());
    const url: string = open.mock.calls[0][0];
    expect(url.startsWith('sms:0712345678?body=')).toBe(true);
    const body = decodeURIComponent(url.split('body=')[1]);
    expect(body).toContain('Hi Mum, this is Officer Perera.');
    expect(body).toContain('https://www.google.com/maps/search/?api=1&query=6.9271,79.8612');
  });

  it('PersonalEmergencyContacts warns when SMS is unavailable', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await AsyncStorage.setItem(
      '@floodguard_personal_emergency_contacts',
      JSON.stringify([{ id: 'c1', name: 'Mum', category: 'Family', phone: '0712345678', createdAt: 1 }])
    );
    await renderWithAuth(<PersonalEmergencyContacts />);
    await screen.findByText('Mum');
    await fireEvent.press(screen.getByTestId('icon-send'));
    await waitFor(() => expect(alertSpy.mock.calls.at(-1)![0]).toBe('Messaging unavailable'));
    expect(open).not.toHaveBeenCalled();
  });

  it('ShareLocationCard copies the link and opens the share sheet', async () => {
    Platform.OS = 'ios';
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    await render(<ShareLocationCard />);
    await fireEvent.press(screen.getByText(en.emergency.shareLocation));
    await waitFor(() => expect(share).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId('icon-copy-outline'));
    await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expect.stringContaining('query=6.9271,79.8612')));
    expect(alertSpy.mock.calls.at(-1)![0]).toBe('Success');
  });
});
