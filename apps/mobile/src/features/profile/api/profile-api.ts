import { userApi } from '@urbanmind/shared-api';

export const profileApi = {
  getProfile: () => userApi.getProfile(),
  updateProfile: (data: { fullName: string; phone?: string }) => userApi.updateProfile(data),
};
