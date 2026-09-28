import * as FileSystem from 'expo-file-system/legacy';

export type ImageUploadPurpose = 'report' | 'profile';

export interface UploadedImage {
  url: string;
  publicId: string;
  version: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
}

/**
 * Uploads a local image URI to Cloudinary via unsigned REST API.
 */
export const uploadImage = async (
  uri: string,
  purpose: ImageUploadPurpose = 'report'
): Promise<UploadedImage> => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // We reuse the existing uploadPreset. Since we are doing unsigned uploads,
  // we can specify a folder to organize profile images separately.
  const folder = purpose === 'profile' ? 'floodguard/profile-images' : 'floodguard/reports';

  const uploadResult = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      upload_preset: uploadPreset,
      folder: folder,
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error('Failed to upload photo to Cloudinary: ' + uploadResult.body);
  }

  const responseData = JSON.parse(uploadResult.body);
  
  return {
    url: responseData.secure_url,
    publicId: responseData.public_id,
    version: responseData.version || null,
    width: responseData.width || null,
    height: responseData.height || null,
    format: responseData.format || null,
  };
};
