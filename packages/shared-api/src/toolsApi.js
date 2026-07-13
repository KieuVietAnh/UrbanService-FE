import { axiosClient } from './axiosClient.js';

const DEFAULT_CATEGORY_PARAMS = { includeInactive: false };

let mockDbAdapter = null;

const getMockDb = async () => {
  if (mockDbAdapter) return mockDbAdapter;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && import.meta.env?.VITE_USE_MOCK !== 'false') {
    try {
      const mod = await import('./mockStore.js');
      mockDbAdapter = mod.mockDb;
      return mockDbAdapter;
    } catch (error) {
      console.warn('Unable to initialize mock data store', error);
    }
  }
  return null;
};

export const toolsApi = {
  async init() {
    try {
      const db = await getMockDb();
      db?.init?.();
    } catch (error) {
      console.warn('toolsApi.init failed', error);
    }
  },
  async getCategories() {
    try {
      const response = await axiosClient.get('/api/categories', { params: DEFAULT_CATEGORY_PARAMS });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.warn('toolsApi.getCategories failed', error);
      return [];
    }
  },
  async getOperators() { const db = await getMockDb(); return db?.getOperators?.() || []; },
  async getTickets() { const db = await getMockDb(); return db?.getTickets?.() || []; },
  async getComments() { const db = await getMockDb(); return db?.getComments?.() || []; },
  async getNotifications() { const db = await getMockDb(); return db?.getNotifications?.() || []; },
  async getIntegrations() { const db = await getMockDb(); return db?.getIntegrations?.() || []; },
  async getSlaConfig() { const db = await getMockDb(); return db?.getSlaConfig?.() || {}; },
  async getAuditLogs() { const db = await getMockDb(); return db?.getAuditLogs?.() || []; },
  async getUsers() { const db = await getMockDb(); return db?.getUsers?.() || []; },
  async aiClassify(title, description) { const db = await getMockDb(); return db?.aiClassify?.(title, description) || { summary: '', confidence: 0 }; },
  async checkDuplicates(categoryId, lat, lng) { const db = await getMockDb(); return db?.checkDuplicates?.(categoryId, lat, lng) || []; },
  async getAiChatReply(message) { const db = await getMockDb(); return db?.getAiChatReply?.(message) || ''; },
  async addAudit(userId, action, entityName, entityId, oldValues, newValues) { const db = await getMockDb(); return db?.addAudit?.(userId, action, entityName, entityId, oldValues, newValues); },
  async updatePosts(updated) { const db = await getMockDb(); return db?.updateTickets?.(updated); },
  async updateIntegrations(updated) { const db = await getMockDb(); return db?.updateIntegrations?.(updated); },
  async updateTickets(updated) { const db = await getMockDb(); return db?.updateTickets?.(updated); },
  async updateNotifications(notifs) { const db = await getMockDb(); return db?.updateNotifications?.(notifs); },
  async updateComments(comments) { const db = await getMockDb(); return db?.updateComments?.(comments); },
  async updateCategories(cats) { const db = await getMockDb(); return db?.updateCategories?.(cats); },
};
