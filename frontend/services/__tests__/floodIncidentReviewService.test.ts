import { subscribeFloodIncidentReviews, approveFloodIncident, rejectFloodIncident, linkFloodIncidentWarning } from '../floodIncidentReviewService';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mocked-timestamp'),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('floodIncidentReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeFloodIncidentReviews', () => {
    it('subscribes to reviews and returns data on snapshot', () => {
      const mockOnChange = jest.fn();
      const mockOnError = jest.fn();

      (onSnapshot as jest.Mock).mockImplementation((collectionRef, onSuccess, onError) => {
        const mockSnapshot = {
          docs: [
            { id: 'inc-1', data: () => ({ status: 'Approved' }) },
            { id: 'inc-2', data: () => ({ status: 'Rejected' }) }
          ]
        };
        onSuccess(mockSnapshot);
        return jest.fn(); // unsubscribe mock
      });

      const unsubscribe = subscribeFloodIncidentReviews(mockOnChange, mockOnError);

      expect(onSnapshot).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith({
        'inc-1': { status: 'Approved' },
        'inc-2': { status: 'Rejected' }
      });
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('approveFloodIncident', () => {
    it('approves an incident', async () => {
      const mockIncident = {
        id: 'inc-1',
        reports: [{ id: 'rep-1' }],
        affectedArea: 'Colombo',
        riskLevel: 'HIGH',
      } as any;

      await approveFloodIncident(mockIncident, 'admin-1', 'Admin User');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'floodIncidentReviews', 'inc-1');
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'Approved',
          reportIds: ['rep-1'],
          affectedArea: 'Colombo',
          reviewedBy: 'admin-1',
          reviewedByName: 'Admin User',
          reviewedAt: 'mocked-timestamp',
          rejectionReason: null,
        })
      );
    });
  });

  describe('rejectFloodIncident', () => {
    it('rejects an incident with a reason', async () => {
      const mockIncident = {
        id: 'inc-2',
        reports: [],
        affectedArea: 'Kandy',
        riskLevel: 'LOW',
      } as any;

      await rejectFloodIncident(mockIncident, 'admin-2', 'Insufficient evidence');

      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'Rejected',
          rejectionReason: 'Insufficient evidence',
        })
      );
    });
  });

  describe('linkFloodIncidentWarning', () => {
    it('links warning ID with merge true', async () => {
      await linkFloodIncidentWarning('inc-1', 'warn-1');
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'floodIncidentReviews', 'inc-1');
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        { warningId: 'warn-1' },
        { merge: true }
      );
    });
  });
});
