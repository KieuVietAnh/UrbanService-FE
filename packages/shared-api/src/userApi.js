import { axiosClient } from './axiosClient.js';

export const userApi = {
  async getProfile(userId) {
    try {
      const response = await axiosClient.get(`/api/user/profile/${userId}`);
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.getProfile failed, returning null', error);
      return null;
    }
  },

  async updateProfile(userId, data) {
    try {
      const response = await axiosClient.put(`/api/user/profile/${userId}`, data);
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
