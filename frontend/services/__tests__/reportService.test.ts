import { createReport, fetchUserReports, uploadReportPhoto } from '../reportService';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { uploadImage } from '../imageUploadService';

jest.mock('../imageUploadService', () => ({
  uploadImage: jest.fn(),
}));

describe('reportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadReportPhoto', () => {
    it('uploads an image and returns the url', async () => {
      (uploadImage as jest.Mock).mockResolvedValue({ url: 'https://cloudinary.com/test-url' });
      
      const url = await uploadReportPhoto('file://local-path/image.jpg');
      
      expect(uploadImage).toHaveBeenCalledWith('file://local-path/image.jpg', 'report');
      expect(url).toBe('https://cloudinary.com/test-url');
    });
  });

  describe('createReport', () => {
    it('saves a report to Firestore with Pending status and a reference number', async () => {
      const mockReportData = {
        userId: 'user-123',
        disasterType: 'flood' as const,
        affectedArea: 'Colombo',
        description: 'Heavy flooding',
      };

      const refNumber = await createReport(mockReportData);

      expect(addDoc).toHaveBeenCalled();
      
      // Verify that addDoc was called with the correct collection
      expect(collection).toHaveBeenCalledWith(undefined, 'reports');

      // Check the payload passed to addDoc
      const payload = (addDoc as jest.Mock).mock.calls[0][1];
      expect(payload).toEqual(expect.objectContaining({
        ...mockReportData,
        status: 'Pending',
        photoUrl: null, // Should convert undefined to null
        createdAt: 'mocked-timestamp', // Handled by serverTimestamp mock
      }));
      
      expect(payload.referenceNumber).toMatch(/^REP-\d{5}$/);
      expect(refNumber).toMatch(/^REP-\d{5}$/);
    });
  });

  describe('fetchUserReports', () => {
    it('fetches reports for a specific user', async () => {
      const mockDocs = [
        { id: 'report-1', data: () => ({ description: 'Flood' }) },
        { id: 'report-2', data: () => ({ description: 'Landslide' }) }
      ];
      
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockDocs });

      const reports = await fetchUserReports('user-123');

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('userId', '==', 'user-123');
      expect(reports).toHaveLength(2);
      expect(reports[0]).toEqual({ id: 'report-1', description: 'Flood' });
    });
  });
});
