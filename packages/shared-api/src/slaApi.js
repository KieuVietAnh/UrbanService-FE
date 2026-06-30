import { axiosClient } from './axiosClient.js';
import { toolsApi } from './toolsApi.js';

const SLA_ENDPOINT = '/api/management/sla';
const SLA_ALT_ENDPOINT = '/api/management/sla-config';

const DEFAULT_CATEGORIES = [
  { categoryId: 1, categoryName: 'Vệ sinh & Rác thải', description: 'Báo cáo rác thải bừa bãi, cống rãnh ứ đọng rác, thu gom chậm', isActive: true, createdAt: '2026-05-01T00:00:00Z' },
  { categoryId: 2, categoryName: 'Điện chiếu sáng', description: 'Đèn đường hỏng, mất điện chiếu sáng khu phố, rò rỉ điện', isActive: true, createdAt: '2026-05-01T00:00:00Z' },
  { categoryId: 3, categoryName: 'Cấp thoát nước', description: 'Vỡ đường ống nước, ngập úng khi mưa, nắp hố ga hỏng', isActive: true, createdAt: '2026-05-01T00:00:00Z' },
  { categoryId: 4, categoryName: 'Giao thông & Đường sá', description: 'Ổ gà ổ voi hiểm họa, sụt lún vỉa hè, biển báo gãy hỏng', isActive: true, createdAt: '2026-05-01T00:00:00Z' },
  { categoryId: 5, categoryName: 'Cây xanh đô thị', description: 'Cây xanh gãy đổ đè đường dây, cành cây khô che khuất tầm nhìn', isActive: true, createdAt: '2026-05-01T00:00:00Z' }
];

const isNotFound = (error) => error?.response?.status === 404;

const getResponseData = (response) => (response?.data !== undefined ? response.data : response || {});

export const slaApi = {
  async getSlaConfig() {
    try {
      const response = await axiosClient.get(SLA_ENDPOINT);
      return getResponseData(response);
    } catch (error) {
      if (isNotFound(error)) {
        try {
          const response = await axiosClient.get(SLA_ALT_ENDPOINT);
          return getResponseData(response);
        } catch (fallbackError) {
          console.warn('slaApi.getSlaConfig alternate endpoint failed', fallbackError);
        }
      }
      console.warn('slaApi.getSlaConfig failed, falling back to mock config', error);
      return toolsApi.getSlaConfig();
    }
  },

  async updateSlaConfig(updates, maybeHours, maybeUpdatedBy) {
    const payload =
      typeof updates === 'object' && updates !== null && !Array.isArray(updates)
        ? updates
        : {
            level: updates,
            hours: maybeHours,
            updatedBy: maybeUpdatedBy,
          };

    try {
      const response = await axiosClient.put(SLA_ENDPOINT, payload);
      return getResponseData(response) || payload;
    } catch (error) {
      if (isNotFound(error)) {
        try {
          const response = await axiosClient.put(SLA_ALT_ENDPOINT, payload);
          return getResponseData(response) || payload;
        } catch (fallbackError) {
          console.warn('slaApi.updateSlaConfig alternate endpoint failed', fallbackError);
        }
      }

      if (isNotFound(error)) {
        console.warn('slaApi.updateSlaConfig failed with 404, falling back to mock config', error);
        return toolsApi.updateSlaConfig(payload);
      }

      console.warn('slaApi.updateSlaConfig failed', error);
      throw error;
    }
  },

  async getCategories() {
    try {
      const response = await axiosClient.get('/api/management/categories');
      return Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
    } catch (error) {
      console.warn('slaApi.getCategories failed, falling back to mock categories', error);
      const categories = await toolsApi.getCategories();
      return Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    }
  },

  async createCategory(data, createdBy) {
    try {
      const payload = { ...data, createdBy };
      const response = await axiosClient.post('/api/management/categories', payload);
      return response?.data || response || payload;
    } catch (error) {
      console.warn('slaApi.createCategory failed', error);
      throw error;
    }
  },
};
