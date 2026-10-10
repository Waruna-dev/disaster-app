import { uploadImage } from '../imageUploadService';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: {
    MULTIPART: 1
  }
}));

describe('imageUploadService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'test-preset';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  });

  it('uploads a file and returns parsed image data', async () => {
    const mockResponseBody = JSON.stringify({
      secure_url: 'https://cloudinary.com/image.jpg',
      public_id: 'test_id',
      version: 1,
      width: 800,
      height: 600,
      format: 'jpg'
    });

    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      body: mockResponseBody
    });

    const result = await uploadImage('file://test.jpg', 'profile');

    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      'file://test.jpg',
      expect.objectContaining({
        httpMethod: 'POST',
        uploadType: 1,
        fieldName: 'file',
        parameters: {
          upload_preset: 'test-preset',
          folder: 'floodguard/profile-images'
        }
      })
    );

    expect(result).toEqual({
      url: 'https://cloudinary.com/image.jpg',
      publicId: 'test_id',
      version: 1,
      width: 800,
      height: 600,
      format: 'jpg'
    });
  });

  it('throws an error if env variables are missing', async () => {
    delete process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    await expect(uploadImage('file://test.jpg')).rejects.toThrow('Cloudinary environment variables are missing.');
  });

  it('throws an error if upload fails', async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValue({
      status: 400,
      body: 'Bad Request'
    });

    await expect(uploadImage('file://test.jpg')).rejects.toThrow('Failed to upload photo to Cloudinary: Bad Request');
  });
});
