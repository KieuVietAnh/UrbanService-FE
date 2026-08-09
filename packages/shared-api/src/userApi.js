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
      console.error('userApi.getUsers failed', error);
      throw error;
    }
  },

  async updateUser(userId, data) {
    try {
      const response = await axiosClient.put(`/api/admin/users/${userId}`, data);
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.updateUser failed', error);
      throw error;
    }
  },

  async updateUserStatus(userId, isActive) {
    try {
      const response = await axiosClient.patch(`/api/admin/users/${userId}/active`, {
        isActive,
      });
      return response?.data || response || null;
    } catch (error) {
      console.warn('userApi.updateUserStatus failed', error);
      throw error;
    }
  },

  async createUser(data) {
    try {
      const response = await axiosClient.post('/api/admin/users', data);
      return response?.data || response || data;
    } catch (error) {
      console.warn('userApi.createUser failed', error);
      throw error;
    }
  },

  async getUserRoles() {
    try {
      const response = await axiosClient.get('/api/admin/users/roles');
      const roles = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      return roles;
    } catch (error) {
      console.warn('userApi.getUserRoles failed', error);
      throw error;
    }
  }
};
