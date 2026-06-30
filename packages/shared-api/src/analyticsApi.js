import { axiosClient } from './axiosClient.js';
import { managementTypes } from '@urbanmind/shared-types';
import { getFeedbackBasePath, normalizeTicketsResponse } from './ticketApiHelpers.js';

const normalizeRole = (role) => {
  if (!role) return null;
  const normalized = String(role).trim().replace(/[-_\s]/g, '').toLowerCase();
  switch (normalized) {
    case 'serviceuser':
      return 'service-user';
    case 'systemstaff':
      return 'system-staff';
    case 'serviceprovider':
    case 'serviceoperator':
    case 'serviceproviderstaff':
    case 'serviceoperatorstaff':
      return 'service-provider';
    case 'interactionmanager':
      return 'interaction-manager';
    case 'systemadmin':
    case 'administrator':
    case 'admin':
      return 'administrator';
    default:
      return role;
  }
};

export const analyticsApi = {
  async getSystemDashboardStats(role) {
    try {
      const normalizedRole = normalizeRole(role);
      const feedbackBasePath = getFeedbackBasePath(normalizedRole);
      const fetchUsers = normalizedRole === 'administrator';
      const requests = [
        axiosClient.get(feedbackBasePath, { params: { pageSize: 1000 } }),
      ];

      if (fetchUsers) {
        requests.push(axiosClient.get('/api/admin/users', { params: { pageSize: 1000 } }));
      }

      const [ticketsResponse, usersResponse] = await Promise.all(requests);

      const tickets = normalizeTicketsResponse(ticketsResponse);
      const users = fetchUsers
        ? (Array.isArray(usersResponse?.items) ? usersResponse.items : Array.isArray(usersResponse) ? usersResponse : [])
        : [];
      const now = new Date();

      const totalTickets = tickets.length;
      const totalUsers = users.length;
      const activeTickets = tickets.filter((t) => t.status !== managementTypes.feedbackStatus.CLOSED).length;
      const resolvedTickets = tickets.filter((t) => t.status === managementTypes.feedbackStatus.RESOLVED || t.status === managementTypes.feedbackStatus.CLOSED).length;
      const processingRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

      const slaBreaches = tickets.filter((t) => {
        if (t.status === managementTypes.feedbackStatus.CLOSED || t.status === managementTypes.feedbackStatus.RESOLVED) return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      }).length;

      const categories = Array.isArray(usersResponse?.categories) ? usersResponse.categories : [];
      const categoryDistribution = categories.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        count: tickets.filter((t) => t.categoryId === cat.categoryId).length,
      }));

      const sentimentTrend = {
        Positive: tickets.filter((t) => t.sentiment === 'Positive').length,
        Neutral: tickets.filter((t) => t.sentiment === 'Neutral').length,
        Negative: tickets.filter((t) => t.sentiment === 'Negative').length,
      };

      const ratedTickets = tickets.filter((t) => t.reviews && t.reviews.length > 0);
      const avgCsat = ratedTickets.length > 0
        ? Number((ratedTickets.reduce((acc, t) => acc + t.reviews[0].rating, 0) / ratedTickets.length).toFixed(1))
        : 4.5;

      const resolvedWithDuration = tickets.filter((t) => t.resolution && t.resolution.resolvedAt);
      const avgResolutionTimeHours = resolvedWithDuration.length > 0
        ? Math.round(resolvedWithDuration.reduce((acc, t) => {
            const created = new Date(t.createdAt);
            const resolved = new Date(t.resolution.resolvedAt);
            return acc + (resolved - created) / (1000 * 60 * 60);
          }, 0) / resolvedWithDuration.length)
        : 18;

      return {
        totalTickets,
        totalUsers,
        activeTickets,
        resolvedTickets,
        processingRate,
        slaBreaches,
        categoryDistribution,
        sentimentTrend,
        csatScore: avgCsat,
        avgResolutionTimeHours,
        storageUsage: '12.4 KB / 5 MB',
        apiStatus: 'Healthy',
        aiStatus: 'Idle (Listening)',
      };
    } catch (error) {
      console.warn('analyticsApi.getSystemDashboardStats failed, returning safe defaults', error);
      return {
        totalTickets: 0,
        totalUsers: 0,
        activeTickets: 0,
        resolvedTickets: 0,
        processingRate: 0,
        slaBreaches: 0,
        categoryDistribution: [],
        sentimentTrend: { Positive: 0, Neutral: 0, Negative: 0 },
        csatScore: 0,
        avgResolutionTimeHours: 0,
        storageUsage: '0 KB / 0 MB',
        apiStatus: 'Unavailable',
        aiStatus: 'Unavailable',
      };
    }
  }
};
