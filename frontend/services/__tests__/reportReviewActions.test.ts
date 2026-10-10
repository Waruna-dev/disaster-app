import { approveReport, rejectReport, ReportReviewError } from '../reportReviewActions';
import { runTransaction, doc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'mocked-timestamp'),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('reportReviewActions', () => {
  let mockTx: any;
  let mockSnap: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSnap = {
      exists: jest.fn(() => true),
      data: jest.fn(() => ({ status: 'Pending' }))
    };
    mockTx = {
      get: jest.fn(() => Promise.resolve(mockSnap)),
      update: jest.fn()
    };
    (runTransaction as jest.Mock).mockImplementation((db, callback) => callback(mockTx));
  });

  describe('approveReport', () => {
    it('approves a pending report in a transaction', async () => {
      await approveReport('report-1', 'admin-1');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'reports', 'report-1');
      expect(runTransaction).toHaveBeenCalled();
      expect(mockTx.get).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledWith(undefined, expect.objectContaining({
        status: 'Verified',
        reviewedBy: 'admin-1'
      }));
    });

    it('throws ReportReviewError if report is not pending', async () => {
      mockSnap.data.mockReturnValueOnce({ status: 'Verified' });
      await expect(approveReport('report-1', 'admin-1')).rejects.toThrow(ReportReviewError);
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('throws ReportReviewError if report does not exist', async () => {
      mockSnap.exists.mockReturnValueOnce(false);
      await expect(approveReport('report-1', 'admin-1')).rejects.toThrow(ReportReviewError);
      expect(mockTx.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectReport', () => {
    it('rejects a pending report with standard reason', async () => {
      await rejectReport('report-2', 'admin-2', 'Not enough info');

      expect(mockTx.update).toHaveBeenCalledWith(undefined, expect.objectContaining({
        status: 'Rejected',
        reviewedBy: 'admin-2',
        rejectionReason: 'Not enough info'
      }));
    });

    it('rejects a pending report with custom reason when Other is selected', async () => {
      await rejectReport('report-3', 'admin-3', 'Other' as any, 'Fake report image');

      expect(mockTx.update).toHaveBeenCalledWith(undefined, expect.objectContaining({
        status: 'Rejected',
        reviewedBy: 'admin-3',
        rejectionReason: 'Fake report image'
      }));
    });

    it('throws ReportReviewError if report is not pending', async () => {
      mockSnap.data.mockReturnValueOnce({ status: 'Rejected' });
      await expect(rejectReport('report-1', 'admin-1', 'Spam')).rejects.toThrow(ReportReviewError);
    });
  });
});
