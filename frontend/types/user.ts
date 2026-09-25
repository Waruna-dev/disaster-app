import { HomeArea } from './location';

export interface UserProfileImage {
  url: string;
  publicId: string;
  version: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  fullName?: string;
  email?: string;
  occupation?: string;
  profileImage?: UserProfileImage;
  homeArea?: HomeArea;
  // other fields as necessary based on existing logic
}
