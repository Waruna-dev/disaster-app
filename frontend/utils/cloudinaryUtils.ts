import { UserProfileImage } from '../types/user';

export function getOptimizedAvatarUrl(profileImage?: UserProfileImage | null): string | null {
  if (!profileImage || !profileImage.url) {
    return null;
  }
  
  // If the url is a local URI (e.g. from image picker preview), return it as is
  if (profileImage.url.startsWith('file://') || profileImage.url.startsWith('content://')) {
    return profileImage.url;
  }

  // Optimize cloudinary URL
  // Original URL looks like: https://res.cloudinary.com/<cloud_name>/image/upload/v123456789/folder/image.jpg
  // We want to insert transformations: c_fill,g_face,w_256,h_256,q_auto,f_auto
  try {
    const parts = profileImage.url.split('/upload/');
    if (parts.length === 2) {
      // Include the version if available to bust cache
      const versionStr = profileImage.version ? `v${profileImage.version}/` : '';
      
      // Strip any existing version from the path if it already has one
      let pathAfterUpload = parts[1];
      if (pathAfterUpload.match(/^v\d+\//)) {
        pathAfterUpload = pathAfterUpload.substring(pathAfterUpload.indexOf('/') + 1);
      }
      
      return `${parts[0]}/upload/c_fill,g_face,w_256,h_256,q_auto,f_auto/${versionStr}${pathAfterUpload}`;
    }
  } catch (e) {
    // Fallback to original url if parsing fails
  }
  
  return profileImage.url;
}
