import { createWarning, updateWarning, cancelWarning, deleteWarning } from '../../../services/alertService';
import {
  subscribeFloodIncidentReviews,
  approveFloodIncident,
  rejectFloodIncident,
  linkFloodIncidentWarning,
} from '../../../services/floodIncidentReviewService';
import { approveReport, rejectReport, ReportReviewError } from '../../../services/reportReviewActions';
import {
  createReport,
  fetchUserReports,
  fetchReportById,
  deleteReport,
  anonymizeUserReports,
  uploadReportPhoto,
} from '../../../services/reportService';
import { saveUserProfile, getUserProfile, deleteUserData, removeHomeArea } from '../../../services/userService';
import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserPassword,
  deleteUserAccount,
} from '../../../services/authService';
import * as imageUpload from '../../../services/imageUploadService';
import { auth } from '../../../config/firebase';
import { fs, fbAuth, asMock } from '../../helpers/firebaseMocks';
import { ts } from '../../helpers/factories';
import type { FloodIncident } from '../../../types/floodIncident';

const SERVER_TS = { __serverTimestamp: true };
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => consoleError.mockRestore());

describe('alertService', () => {
  const base = {
    title: 'River overflow',
    hazardType: 'flood' as const,
    riskLevel: 'HIGH' as const,
    affectedArea: 'Kelaniya',
    latitude: 6.95,
    longitude: 79.92,
    radius: 500,
    message: 'Evacuate',
    expiresAt: new Date('2026-10-10T00:00:00Z'),
  };

  it('createWarning writes an Active warning with nulls for omitted optionals and returns the id', async () => {
    const id = await createWarning({ ...base, createdBy: 'admin-1' });
    expect(id).toBe('new-doc-id');
    const [ref, data] = asMock(fs.addDoc).mock.calls[0] as any[];
    expect(ref.path).toBe('warnings');
    const { expiresAt: _date, ...rest } = base;
    expect(data).toMatchObject({
      ...rest,
      status: 'Active',
      polygon: null,
      createdBy: 'admin-1',
      createdByName: null,
      sourceReportId: null,
      createdAt: SERVER_TS,
    });
    expect(data.expiresAt.toDate().toISOString()).toBe('2026-10-10T00:00:00.000Z');
    expect(Object.values(data)).not.toContain(undefined);
  });

  it('createWarning keeps a provided polygon and source report', async () => {
    const polygon = [{ latitude: 1, longitude: 2 }];
    await createWarning({ ...base, createdBy: 'a', createdByName: 'Officer', polygon, sourceReportId: 'r1' });
    const data = asMock(fs.addDoc).mock.calls[0][1] as any;
    expect(data).toMatchObject({ polygon, createdByName: 'Officer', sourceReportId: 'r1' });
  });

  it('createWarning propagates Firestore errors', async () => {
    asMock(fs.addDoc).mockRejectedValueOnce(new Error('permission-denied'));
    await expect(createWarning({ ...base, createdBy: 'a' })).rejects.toThrow('permission-denied');
  });

  it('updateWarning only writes editable fields (never status/createdBy/createdAt)', async () => {
    await updateWarning('w9', base);
    const [ref, data] = asMock(fs.updateDoc).mock.calls[0] as any[];
    expect(ref.path).toBe('warnings/w9');
    expect(Object.keys(data).sort()).toEqual(
      ['affectedArea', 'expiresAt', 'hazardType', 'latitude', 'longitude', 'message', 'polygon', 'radius', 'riskLevel', 'title'].sort()
    );
  });

  it('cancelWarning flips status to Cancelled and deleteWarning deletes the doc', async () => {
    await cancelWarning('w1');
    expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'warnings/w1' }), { status: 'Cancelled' });
    await deleteWarning('w2');
    expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'warnings/w2' }));
  });
});

describe('floodIncidentReviewService', () => {
  const incident = {
    id: 'FLD-abc',
    affectedArea: 'Kelaniya',
    riskLevel: 'MEDIUM',
    reports: [{ id: 'r1' }, { id: 'r2' }],
  } as unknown as FloodIncident;

  it('subscribe maps docs by id and forwards errors', () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    const unsub = subscribeFloodIncidentReviews(onChange, onError);
    fs.__emit('floodIncidentReviews', [{ id: 'FLD-abc', status: 'Approved' }]);
    expect(onChange).toHaveBeenCalledWith({ 'FLD-abc': { status: 'Approved' } });
    fs.__emitError('floodIncidentReviews', new Error('boom'));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    expect(typeof unsub).toBe('function');
  });

  it('subscribe tolerates a missing error handler', () => {
    subscribeFloodIncidentReviews(jest.fn());
    expect(() => fs.__emitError('floodIncidentReviews', new Error('x'))).not.toThrow();
  });

  it('approve writes an Approved review keyed by incident id', async () => {
    await approveFloodIncident(incident, 'admin-1');
    expect(fs.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'floodIncidentReviews/FLD-abc' }), {
      status: 'Approved',
      reportIds: ['r1', 'r2'],
      affectedArea: 'Kelaniya',
      riskLevel: 'MEDIUM',
      reviewedBy: 'admin-1',
      reviewedByName: null,
      reviewedAt: SERVER_TS,
      rejectionReason: null,
    });
  });

  it('reject records the reason', async () => {
    await rejectFloodIncident(incident, 'admin-1', 'Insufficient evidence', 'Officer A');
    expect(asMock(fs.setDoc).mock.calls[0][1]).toMatchObject({
      status: 'Rejected',
      rejectionReason: 'Insufficient evidence',
      reviewedByName: 'Officer A',
    });
  });

  it('linkFloodIncidentWarning merges only the warningId', async () => {
    await linkFloodIncidentWarning('FLD-abc', 'w1');
    expect(fs.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'floodIncidentReviews/FLD-abc' }), { warningId: 'w1' }, { merge: true });
  });
});

describe('reportReviewActions', () => {
  function withTransaction(existing: Record<string, unknown> | undefined) {
    const tx = { get: jest.fn(async (ref: any) => fs.__makeDocSnap(ref.id, existing)), update: jest.fn() };
    asMock(fs.runTransaction).mockImplementation(async (_db: any, fn: any) => fn(tx));
    return tx;
  }

  it('approveReport verifies a Pending report', async () => {
    const tx = withTransaction({ status: 'Pending' });
    await approveReport('r1', 'admin-1');
    expect(tx.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'reports/r1' }), {
      status: 'Verified',
      reviewedBy: 'admin-1',
      reviewedAt: SERVER_TS,
    });
  });

  it.each([
    ['already reviewed', { status: 'Verified' }],
    ['deleted', undefined],
  ])('approveReport refuses a %s report', async (_l, existing) => {
    const tx = withTransaction(existing);
    await expect(approveReport('r1', 'admin-1')).rejects.toBeInstanceOf(ReportReviewError);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('rejectReport stores the preset reason', async () => {
    const tx = withTransaction({ status: 'Pending' });
    await rejectReport('r1', 'admin-1', 'Duplicate', 'ignored');
    expect(tx.update.mock.calls[0][1]).toMatchObject({ status: 'Rejected', rejectionReason: 'Duplicate' });
  });

  it('rejectReport stores the custom text for "Other" (empty string when none given)', async () => {
    let tx = withTransaction({ status: 'Pending' });
    await rejectReport('r1', 'a', 'Other', 'Photo is from 2019');
    expect(tx.update.mock.calls[0][1].rejectionReason).toBe('Photo is from 2019');
    tx = withTransaction({ status: 'Pending' });
    await rejectReport('r1', 'a', 'Other');
    expect(tx.update.mock.calls[0][1].rejectionReason).toBe('');
  });

  it('rejectReport refuses a non-Pending report', async () => {
    withTransaction({ status: 'Rejected' });
    await expect(rejectReport('r1', 'a', 'Duplicate')).rejects.toThrow('no longer pending');
  });
});

describe('reportService', () => {
  it('createReport writes a Pending report with a REP-xxxxx reference and server timestamp', async () => {
    const ref = await createReport({
      userId: 'u1',
      disasterType: 'flood',
      affectedArea: 'Kelaniya',
      description: 'Rising',
      status: 'Verified',
      latitude: 7,
      longitude: 80,
    });
    expect(ref).toMatch(/^REP-\d{5}$/);
    const data = asMock(fs.addDoc).mock.calls[0][1] as any;
    expect(data).toMatchObject({ status: 'Pending', referenceNumber: ref, createdAt: SERVER_TS, photoUrl: null, latitude: 7 });
  });

  it('createReport reference numbers stay within REP-10000…REP-99999', async () => {
    const rand = jest.spyOn(Math, 'random');
    rand.mockReturnValueOnce(0);
    expect(await createReport({ userId: 'u', disasterType: 'flood', affectedArea: 'a', description: 'd' })).toBe('REP-10000');
    rand.mockReturnValueOnce(0.99999);
    expect(await createReport({ userId: 'u', disasterType: 'flood', affectedArea: 'a', description: 'd' })).toBe('REP-99999');
    rand.mockRestore();
  });

  it.failing('LATENT BUG (the only current caller always passes coordinates): createReport sends `undefined` for optional fields other than photoUrl (Firestore rejects undefined)', async () => {
    await createReport({
      userId: 'u1',
      disasterType: 'flood',
      affectedArea: 'Kelaniya',
      description: 'd',
      contactNumber: undefined,
      latitude: undefined,
      longitude: undefined,
    });
    const data = asMock(fs.addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(Object.values(data)).not.toContain(undefined);
  });

  it('fetchUserReports queries by user and sorts newest first, undated last', async () => {
    asMock(fs.getDocs).mockResolvedValueOnce(
      fs.__makeQuerySnap([
        { id: 'old', createdAt: ts(1000) },
        { id: 'none' },
        { id: 'new', createdAt: ts(5000) },
      ]) as any
    );
    const out = await fetchUserReports('u1');
    expect(out.map((r) => r.id)).toEqual(['new', 'old', 'none']);
    const q = asMock(fs.getDocs).mock.calls[0][0] as any;
    expect(q.constraints).toEqual([{ type: 'where', field: 'userId', op: '==', value: 'u1' }]);
  });

  it('fetchReportById returns the doc or null', async () => {
    asMock(fs.getDoc).mockResolvedValueOnce(fs.__makeDocSnap('r1', { affectedArea: 'X' }) as any);
    expect(await fetchReportById('r1')).toEqual({ id: 'r1', affectedArea: 'X' });
    expect(await fetchReportById('missing')).toBeNull();
  });

  it('deleteReport deletes and rethrows failures', async () => {
    await deleteReport('r1');
    expect(fs.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'reports/r1' }));
    asMock(fs.deleteDoc).mockRejectedValueOnce(new Error('denied'));
    await expect(deleteReport('r2')).rejects.toThrow('denied');
  });

  it("anonymizeUserReports rewrites every one of the user's reports", async () => {
    asMock(fs.getDocs).mockResolvedValueOnce(fs.__makeQuerySnap([{ id: 'a' }, { id: 'b' }]) as any);
    await anonymizeUserReports('u1');
    expect(fs.updateDoc).toHaveBeenCalledTimes(2);
    expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'reports/b' }), {
      userId: 'anonymous',
      authorName: 'Anonymous User',
    });
  });

  it('anonymizeUserReports rethrows when any update fails', async () => {
    asMock(fs.getDocs).mockResolvedValueOnce(fs.__makeQuerySnap([{ id: 'a' }]) as any);
    asMock(fs.updateDoc).mockRejectedValueOnce(new Error('denied'));
    await expect(anonymizeUserReports('u1')).rejects.toThrow('denied');
  });

  it('uploadReportPhoto returns just the uploaded URL', async () => {
    const spy = jest.spyOn(imageUpload, 'uploadImage').mockResolvedValueOnce({ url: 'https://img', publicId: 'p' } as any);
    expect(await uploadReportPhoto('file:///a.jpg')).toBe('https://img');
    expect(spy).toHaveBeenCalledWith('file:///a.jpg', 'report');
    spy.mockRestore();
  });
});

describe('userService', () => {
  it('saveUserProfile merges into users/{id}', async () => {
    await saveUserProfile('u1', { fullName: 'A' });
    expect(fs.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/u1' }), { fullName: 'A' }, { merge: true });
  });

  it('getUserProfile returns data or null, and rethrows errors', async () => {
    asMock(fs.getDoc).mockResolvedValueOnce(fs.__makeDocSnap('u1', { fullName: 'A' }) as any);
    expect(await getUserProfile('u1')).toEqual({ fullName: 'A' });
    expect(await getUserProfile('u2')).toBeNull();
    asMock(fs.getDoc).mockRejectedValueOnce(new Error('offline'));
    await expect(getUserProfile('u3')).rejects.toThrow('offline');
  });

  it('deleteUserData anonymizes reports before deleting the profile', async () => {
    const order: string[] = [];
    asMock(fs.getDocs).mockImplementationOnce(async () => {
      order.push('anonymize');
      return fs.__makeQuerySnap([]) as any;
    });
    asMock(fs.deleteDoc).mockImplementationOnce(async () => {
      order.push('delete');
    });
    await deleteUserData('u1');
    expect(order).toEqual(['anonymize', 'delete']);
  });

  it('deleteUserData keeps the profile if anonymizing fails', async () => {
    asMock(fs.getDocs).mockRejectedValueOnce(new Error('denied'));
    await expect(deleteUserData('u1')).rejects.toThrow('denied');
    expect(fs.deleteDoc).not.toHaveBeenCalled();
  });

  it('removeHomeArea clears both home-area fields with the provided deleteField', async () => {
    const del = jest.fn(() => 'DEL' as any);
    await removeHomeArea('u1', del);
    expect(fs.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/u1' }), { homeArea: 'DEL', homeAreaUpdatedAt: 'DEL' });
  });
});

describe('authService', () => {
  afterEach(() => {
    (auth as any).currentUser = null;
  });

  it('registerUser creates the account then saves a user-role profile', async () => {
    const cred = await registerUser('a@b.com', 'secret1', 'Ann', '0712345678');
    expect(fbAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.com', 'secret1');
    expect(fs.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `users/${cred.user.uid}` }),
      { fullName: 'Ann', email: 'a@b.com', contactNumber: '0712345678', role: 'user', createdAt: SERVER_TS },
      { merge: true }
    );
  });

  it('registerUser does not write a profile when sign-up fails', async () => {
    asMock(fbAuth.createUserWithEmailAndPassword).mockRejectedValueOnce(new Error('auth/email-already-in-use'));
    await expect(registerUser('a@b.com', 'x', 'A', '07')).rejects.toThrow('email-already-in-use');
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('login/logout/reset delegate to Firebase Auth', async () => {
    await loginUser('a@b.com', 'pw');
    expect(fbAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.com', 'pw');
    await logoutUser();
    expect(fbAuth.signOut).toHaveBeenCalledWith(auth);
    await resetPassword('a@b.com');
    expect(fbAuth.sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'a@b.com');
  });

  it('updateUserPassword / deleteUserAccount require a signed-in user', async () => {
    await expect(updateUserPassword('new')).rejects.toThrow('No authenticated user');
    await expect(deleteUserAccount()).rejects.toThrow('No authenticated user');
    const user = { uid: 'u1' };
    (auth as any).currentUser = user;
    await updateUserPassword('new-pass');
    expect(fbAuth.updatePassword).toHaveBeenCalledWith(user, 'new-pass');
    await deleteUserAccount();
    expect(fbAuth.deleteUser).toHaveBeenCalledWith(user);
  });
});
