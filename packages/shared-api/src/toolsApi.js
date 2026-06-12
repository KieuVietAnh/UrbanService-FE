import { mockDb } from './mockStore.js';

export const toolsApi = {
  init() {
    try { mockDb.init(); } catch (e) { /* noop */ }
  },
  getCategories() { return mockDb.getCategories(); },
  getOperators() { return mockDb.getOperators(); },
  getTickets() { return mockDb.getTickets(); },
  getComments() { return mockDb.getComments(); },
  getNotifications() { return mockDb.getNotifications(); },
  getIntegrations() { return mockDb.getIntegrations(); },
  getSlaConfig() { return mockDb.getSlaConfig(); },
  getAuditLogs() { return mockDb.getAuditLogs(); },
  getUsers() { return mockDb.getUsers(); },
  aiClassify(title, description) { return mockDb.aiClassify(title, description); },
  checkDuplicates(categoryId, lat, lng) { return mockDb.checkDuplicates(categoryId, lat, lng); },
  getAiChatReply(message) { return mockDb.getAiChatReply(message); },
  addAudit(userId, action, entityName, entityId, oldValues, newValues) { return mockDb.addAudit(userId, action, entityName, entityId, oldValues, newValues); },
  updatePosts(updated) { /* generic pass-through for tickets */ return mockDb.updateTickets(updated); },
  updateIntegrations(updated) { return mockDb.updateIntegrations(updated); },
  updateTickets(updated) { return mockDb.updateTickets(updated); },
  updateNotifications(notifs) { return mockDb.updateNotifications(notifs); },
  updateComments(comments) { return mockDb.updateComments(comments); },
  updateCategories(cats) { return mockDb.updateCategories(cats); },
};
