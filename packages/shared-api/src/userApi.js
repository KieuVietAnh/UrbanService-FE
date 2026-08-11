import { axiosClient } from './axiosClient.js';

export const userApi = {
  // Deprecated: old signature accepted userId. New behaviour: fetch current authenticated user's profile.
  async getProfile() {
    const url = '/api/profile';
    try {
      console.log('[userApi.getProfile] request', { url });
      const response = await axiosClient.get(url);
      return response?.data || response || null;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        console.debug('[userApi.getProfile] profile not found', { url, status });
        return null;
      }

      console.warn('userApi.getProfile failed, returning null', {
        message: error?.message,
        status,
        url: error?.config?.url,
        data: error?.response?.data,
        stack: error?.stack,
      });
      return null;
    }
  },

  // Update current authenticated user's profile. No userId required.
  async updateProfile(data) {
    try {
      const response = await axiosClient.put('/api/profile', data);
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.updateProfile failed', error);
      throw error;
    }
  },

  async getUsers() {
    try {
      const response = await axiosClient.get('/api/admin/users', { params: { pageSize: 1000 } });
      return Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
        ? response
        : response?.data || [];
    } catch (error) {
      console.warn('userApi.getUsers failed, returning empty list', error);
      return [];
    }
  },

  async updateUserStatus(userId, isActive, updatedBy) {
    try {
      const response = await axiosClient.patch(`/api/admin/users/${userId}/status`, {
        isActive,
        updatedBy,
      });
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.updateUserStatus failed', error);
      throw error;
    }
  },

  async createUser(data, createdBy) {
    try {
      const payload = { ...data, createdBy };
      const response = await axiosClient.post('/api/admin/users', payload);
      return response?.data || response || payload;
    } catch (error) {
      console.warn('userApi.createUser failed', error);
      throw error;
    }
  },

  // Current authenticated user's profile endpoints
  async getCurrentProfile() {
    const url = '/api/profile';
    try {
      console.log('[userApi.getCurrentProfile] request', { url });
      const response = await axiosClient.get(url);
      return response?.data || response || null;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        console.debug('[userApi.getCurrentProfile] profile not found', { url, status });
        return null;
      }

      console.warn('userApi.getCurrentProfile failed', {
        message: error?.message,
        status,
        url: error?.config?.url,
        data: error?.response?.data,
        stack: error?.stack,
      });
      return null;
    }
  },

  async updateCurrentProfile(data) {
    try {
      const response = await axiosClient.put('/api/profile', data);
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.updateCurrentProfile failed', error);
      throw error;
    }
  },

  async getUserRoles() {
    try {
      const response = await axiosClient.get('/api/admin/users', { params: { pageSize: 1000 } });
      const items = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
      return items.map((u) => ({ userId: u.userId, role: u.role }));
    } catch (error) {
      console.warn('userApi.getUserRoles failed', error);
      return [];
    }
  }
};
