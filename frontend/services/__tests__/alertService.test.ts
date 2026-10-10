import { createWarning, updateWarning, deleteWarning } from '../alertService';
import { addDoc, collection, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';

describe('alertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWarning', () => {
    it('creates a warning with status Active and converts expiresAt to Timestamp', async () => {
      (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'mock-warning-id' });

      const expiresDate = new Date('2026-12-31T23:59:59Z');
      const mockData = {
        title: 'Flood Warning',
        hazardType: 'flood' as const,
        riskLevel: 'HIGH' as any,
        affectedArea: 'Colombo',
        latitude: 6.9,
        longitude: 79.8,
        radius: 10,
        message: 'Evacuate immediately',
        expiresAt: expiresDate,
        createdBy: 'admin-1',
      };

      const resultId = await createWarning(mockData);

      expect(addDoc).toHaveBeenCalledWith(
        undefined, // collection(db, 'warnings')
        expect.objectContaining({
          ...mockData,
          polygon: null,
          createdByName: null,
          sourceReportId: null,
          status: 'Active',
          createdAt: 'mocked-timestamp',
          expiresAt: expect.anything(),
        })
      );

      expect(resultId).toBe('mock-warning-id');
    });
  });

  describe('updateWarning', () => {
    it('updates a warning document in Firestore', async () => {
      const expiresDate = new Date('2026-12-31T23:59:59Z');
      const mockUpdate = {
        title: 'Updated Warning',
        hazardType: 'flood' as const,
        riskLevel: 'LOW' as any,
        affectedArea: 'Colombo',
        latitude: 6.9,
        longitude: 79.8,
        radius: 10,
        message: 'All clear',
        expiresAt: expiresDate,
      };

      await updateWarning('warning-1', mockUpdate);

      expect(doc).toHaveBeenCalledWith(undefined, 'warnings', 'warning-1');
      expect(updateDoc).toHaveBeenCalledWith(
        undefined, // docRef
        expect.objectContaining({
          ...mockUpdate,
          polygon: null,
          expiresAt: expect.anything(),
        })
      );
    });
  });



  describe('deleteWarning', () => {
    it('deletes a warning document', async () => {
      await deleteWarning('warning-1');
      expect(doc).toHaveBeenCalledWith(undefined, 'warnings', 'warning-1');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
