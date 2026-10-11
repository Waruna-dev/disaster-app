import React from 'react';
import { Text } from 'react-native';
import { act, renderHook, render, screen, waitFor } from '@testing-library/react-native';
import { useReports } from '../../../hooks/useReports';
import { useReport } from '../../../hooks/useReport';
import { useReportStats } from '../../../hooks/useReportStats';
import { useRecentActivity } from '../../../hooks/useRecentActivity';
import { useWarnings } from '../../../hooks/useWarnings';
import { useWeeklyTrend } from '../../../hooks/useWeeklyTrend';
import { useResidentNames } from '../../../hooks/useResidentNames';
import { useFloodIncidents } from '../../../hooks/useFloodIncidents';
import { AuthProvider, useAuth } from '../../../context/AuthContext';
import { fs, fbAuth, asMock } from '../../helpers/firebaseMocks';
import { ts, north } from '../../helpers/factories';
import type { ReportStatus } from '../../../types/report';

let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => consoleError.mockRestore());

describe('useReports', () => {
  it('subscribes ordered by createdAt, filtered by status, and normalizes docs', async () => {
    const { result } = await renderHook(() => useReports('Pending'));
    expect(result.current.loading).toBe(true);
    const q = fs.__listeners[0].target as any;
    expect(q.constraints).toEqual([
      { type: 'where', field: 'status', op: '==', value: 'Pending' },
      { type: 'orderBy', field: 'createdAt', dir: 'desc' },
    ]);
    await act(() => fs.__emit('reports', [{ id: 'a', latitude: 7, longitude: 80, status: 'Pending' }]));
    expect(result.current.loading).toBe(false);
    expect(result.current.reports[0]).toMatchObject({ id: 'a', location: { latitude: 7, longitude: 80 } });
  });

  it("'all' applies no status filter", async () => {
    await renderHook(() => useReports('all'));
    expect((fs.__listeners[0].target as any).constraints).toEqual([{ type: 'orderBy', field: 'createdAt', dir: 'desc' }]);
  });

  it('exposes subscription errors', async () => {
    const { result } = await renderHook(() => useReports('all'));
    await act(() => fs.__emitError('reports', new Error('missing index')));
    expect(result.current.error?.message).toBe('missing index');
    expect(result.current.loading).toBe(false);
  });

  it('resubscribes when the status changes and unsubscribes on unmount', async () => {
    const { rerender, unmount } = await renderHook((props: { s: ReportStatus | 'all' }) => useReports(props.s), {
      initialProps: { s: 'Pending' },
    });
    const first = fs.__listeners[0];
    await rerender({ s: 'Verified' });
    expect(first.unsubscribe).toHaveBeenCalled();
    expect(fs.__listeners).toHaveLength(2);
    await unmount();
    expect(fs.__listeners[1].unsubscribe).toHaveBeenCalled();
  });
});

describe('useReport', () => {
  it('returns null and stops loading with no id', async () => {
    const { result } = await renderHook(() => useReport(undefined));
    expect(result.current).toEqual({ report: null, loading: false });
    expect(fs.onSnapshot).not.toHaveBeenCalled();
  });

  it('streams a single report and handles deletion', async () => {
    const { result } = await renderHook(() => useReport('r1'));
    await act(() => fs.__emit('reports/r1', { id: 'r1', data: { status: 'Pending', latitude: 1, longitude: 2 } }));
    expect(result.current.report).toMatchObject({ id: 'r1', location: { latitude: 1, longitude: 2 } });
    await act(() => fs.__emit('reports/r1', { id: 'r1', data: null }));
    expect(result.current.report).toBeNull();
  });

  it('stops loading on error', async () => {
    const { result } = await renderHook(() => useReport('r1'));
    await act(() => fs.__emitError('reports/r1', new Error('denied')));
    expect(result.current.loading).toBe(false);
  });
});

describe('useReportStats', () => {
  it('counts each status and the total', async () => {
    const { result } = await renderHook(() => useReportStats());
    await act(() =>
      fs.__emit('reports', [
        { id: '1', status: 'Pending' },
        { id: '2', status: 'Pending' },
        { id: '3', status: 'Verified' },
        { id: '4', status: 'Rejected' },
        { id: '5', status: 'Weird' },
      ])
    );
    expect(result.current).toEqual({ stats: { pending: 2, verified: 1, rejected: 1, total: 5 }, loading: false });
  });

  it('keeps zeroed stats on error', async () => {
    const { result } = await renderHook(() => useReportStats());
    await act(() => fs.__emitError('reports', new Error('x')));
    expect(result.current.stats.total).toBe(0);
    expect(result.current.loading).toBe(false);
  });
});

describe('useRecentActivity', () => {
  it('queries the 5 latest reviewed reports', async () => {
    const { result } = await renderHook(() => useRecentActivity());
    expect((fs.__listeners[0].target as any).constraints).toEqual([
      { type: 'where', field: 'status', op: 'in', value: ['Verified', 'Rejected'] },
      { type: 'orderBy', field: 'reviewedAt', dir: 'desc' },
      { type: 'limit', n: 5 },
    ]);
    await act(() => fs.__emit('reports', [{ id: 'a', status: 'Verified' }]));
    expect(result.current.reports).toEqual([{ id: 'a', status: 'Verified' }]);
  });
});

describe('useWarnings', () => {
  it('streams warnings newest first and surfaces errors', async () => {
    const { result } = await renderHook(() => useWarnings());
    expect((fs.__listeners[0].target as any).constraints).toEqual([{ type: 'orderBy', field: 'createdAt', dir: 'desc' }]);
    await act(() => fs.__emit('warnings', [{ id: 'w1', title: 'T' }]));
    expect(result.current.warnings).toEqual([{ id: 'w1', title: 'T' }]);
    await act(() => fs.__emitError('warnings', new Error('nope')));
    expect(result.current.error?.message).toBe('nope');
  });
});

describe('useWeeklyTrend', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 9, 15, 0, 0)); // local time, Fri 9 Oct 2026
  });
  afterEach(() => jest.useRealTimers());

  it('buckets the last 7 local days of submissions and verifications', async () => {
    const { result } = await renderHook(() => useWeeklyTrend());
    const day = (d: number, h = 10) => ts(new Date(2026, 9, d, h).getTime());
    await act(() =>
      fs.__emit('reports', [
        { id: '1', createdAt: day(9), status: 'Pending' },
        { id: '2', createdAt: day(9, 0), status: 'Verified', reviewedAt: day(9) },
        { id: '3', createdAt: day(3), status: 'Verified', reviewedAt: day(5) },
        { id: '4', createdAt: day(1), status: 'Pending' }, // older than 7 days
        { id: '5', status: 'Rejected', reviewedAt: day(8) },
      ])
    );
    const days = result.current.days;
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-10-03');
    expect(days[6]).toEqual({ date: '2026-10-09', submitted: 2, verified: 1 });
    expect(days.find((d) => d.date === '2026-10-03')!.submitted).toBe(1);
    expect(days.find((d) => d.date === '2026-10-05')!.verified).toBe(1);
    expect(days.find((d) => d.date === '2026-10-08')!.verified).toBe(0); // rejections don't count
    expect(days.reduce((s, d) => s + d.submitted, 0)).toBe(3);
  });
});

describe('useResidentNames', () => {
  it('does nothing for an empty list', async () => {
    const { result } = await renderHook(() => useResidentNames(['', '']));
    expect(result.current).toEqual({});
    expect(fs.getDocs).not.toHaveBeenCalled();
  });

  it('dedupes ids, chunks by 10 for the `in` query and falls back to "Resident"', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `u${String(i).padStart(2, '0')}`);
    asMock(fs.getDocs).mockImplementation(async (q: any) => {
      const chunk: string[] = q.constraints[0].value;
      return fs.__makeQuerySnap(chunk.map((id) => (id === 'u03' ? { id } : { id, fullName: `Name ${id}` }))) as any;
    });
    const { result } = await renderHook(() => useResidentNames([...ids, 'u00']));
    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(12));
    expect(fs.getDocs).toHaveBeenCalledTimes(2);
    expect((asMock(fs.getDocs).mock.calls[0][0] as any).constraints[0]).toMatchObject({ field: '__name__', op: 'in' });
    expect(result.current.u03).toBe('Resident');
    expect(result.current.u11).toBe('Name u11');
  });

  it('does not refetch when the same ids arrive in a different order', async () => {
    asMock(fs.getDocs).mockResolvedValue(fs.__makeQuerySnap([]) as any);
    const { rerender } = await renderHook((props: { ids: string[] }) => useResidentNames(props.ids), { initialProps: { ids: ['a', 'b'] } });
    await waitFor(() => expect(fs.getDocs).toHaveBeenCalledTimes(1));
    await rerender({ ids: ['b', 'a'] });
    await act(async () => undefined);
    expect(fs.getDocs).toHaveBeenCalledTimes(1);
  });

  it('logs and keeps going when the lookup fails', async () => {
    asMock(fs.getDocs).mockRejectedValueOnce(new Error('denied'));
    const { result } = await renderHook(() => useResidentNames(['a']));
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(result.current).toEqual({});
  });
});

describe('useFloodIncidents', () => {
  const C = { latitude: 6.9271, longitude: 79.8612 };

  it('clusters verified reports and merges review status, defaulting to Pending', async () => {
    const { result } = await renderHook(() => useFloodIncidents());
    expect(result.current.loading).toBe(true);
    const near = north(C.latitude, C.longitude, 100);
    await act(() =>
      fs.__emit('reports', [
        { id: 'a', status: 'Verified', disasterType: 'flood', affectedArea: 'X', latitude: C.latitude, longitude: C.longitude },
        { id: 'b', status: 'Verified', disasterType: 'flood', affectedArea: 'X', ...near },
      ])
    );
    expect(result.current.loading).toBe(true); // reviews not loaded yet
    await act(() => fs.__emit('floodIncidentReviews', []));
    expect(result.current.loading).toBe(false);
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.incidents[0]).toMatchObject({ reviewStatus: 'Pending', review: null });

    const id = result.current.incidents[0].id;
    await act(() => fs.__emit('floodIncidentReviews', [{ id, status: 'Approved', reportIds: ['a', 'b'] }]));
    expect(result.current.incidents[0].reviewStatus).toBe('Approved');
  });

  it('stops loading when the reviews subscription errors', async () => {
    const { result } = await renderHook(() => useFloodIncidents());
    await act(() => fs.__emit('reports', []));
    await act(() => fs.__emitError('floodIncidentReviews', new Error('denied')));
    expect(result.current.loading).toBe(false);
  });
});

describe('AuthContext', () => {
  function Probe() {
    const { user, userProfile, isLoading } = useAuth();
    return <Text>{isLoading ? 'loading' : `${user ? (user as any).uid : 'anon'}|${userProfile ? userProfile.fullName : 'none'}`}</Text>;
  }

  it('starts loading, then reflects sign-in and the live profile doc', async () => {
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByText('loading')).toBeTruthy();

    await act(() => fbAuth.__setUser({ uid: 'u1' }));
    expect(screen.getByText('u1|none')).toBeTruthy();
    await act(() => fs.__emit('users/u1', { id: 'u1', data: { fullName: 'Ann' } }));
    expect(screen.getByText('u1|Ann')).toBeTruthy();
    await act(() => fs.__emit('users/u1', { id: 'u1', data: null }));
    expect(screen.getByText('u1|none')).toBeTruthy();
  });

  it('drops the old profile listener on user switch and sign-out', async () => {
    const { unmount } = await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(() => fbAuth.__setUser({ uid: 'u1' }));
    const first = fs.__listenersFor('users/u1')[0];
    await act(() => fbAuth.__setUser({ uid: 'u2' }));
    expect(first.unsubscribe).toHaveBeenCalled();
    await act(() => fbAuth.__setUser(null));
    expect(screen.getByText('anon|none')).toBeTruthy();
    expect(fs.__listenersFor('users/u2')[0].unsubscribe).toHaveBeenCalled();
    await unmount();
    expect(fbAuth.__authListeners).toHaveLength(0);
  });

  it('logs profile subscription errors without crashing', async () => {
    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(() => fbAuth.__setUser({ uid: 'u1' }));
    await act(() => fs.__emitError('users/u1', new Error('denied')));
    expect(consoleError).toHaveBeenCalledWith('Error fetching user profile:', expect.any(Error));
  });

  it('useAuth outside a provider returns the loading default', async () => {
    const { result } = await renderHook(() => useAuth());
    expect(result.current).toEqual({ user: null, userProfile: null, isLoading: true });
  });
});
