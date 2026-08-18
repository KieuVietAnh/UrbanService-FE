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

  async getManagerSentimentStats() {
    try {
      const [aiReviewedResponse, aiHealthResponse] = await Promise.all([
        axiosClient.get('/api/management/feedbacks/ai-reviewed', {
          params: { PageNumber: 1, PageSize: 1000 },
        }),
        axiosClient.get('/api/ai/health').catch((error) => {
          console.warn('Unable to load AI health for sentiment analytics', error);
          return null;
        }),
      ]);

      const items = Array.isArray(aiReviewedResponse?.items)
        ? aiReviewedResponse.items
        : Array.isArray(aiReviewedResponse?.data?.items)
          ? aiReviewedResponse.data.items
          : [];

      const sentimentTrend = items.reduce((counts, item) => {
        const sentiment = String(item?.analysisResult?.sentiment || '').trim().toLowerCase();
        if (sentiment === 'positive') counts.Positive += 1;
        if (sentiment === 'neutral') counts.Neutral += 1;
        if (sentiment === 'negative') counts.Negative += 1;
        return counts;
      }, { Positive: 0, Neutral: 0, Negative: 0 });

      const totalAnalyzed = sentimentTrend.Positive + sentimentTrend.Neutral + sentimentTrend.Negative;
      const toRate = (value) => totalAnalyzed > 0 ? Math.round((value / totalAnalyzed) * 100) : 0;
      const sortedSentiments = Object.entries(sentimentTrend).sort((a, b) => b[1] - a[1]);
      const dominantKey = totalAnalyzed > 0 ? sortedSentiments[0]?.[0] : null;
      const dominantSentiment = ({
        Positive: 'Tích cực',
        Neutral: 'Trung tính',
        Negative: 'Tiêu cực',
      })[dominantKey] || 'Chưa đủ dữ liệu';

      const aiHealth = aiHealthResponse?.data ?? aiHealthResponse;
      const aiStatus = aiHealth
        ? (aiHealth.isAvailable
          ? `Đang hoạt động${aiHealth.model ? ` · ${aiHealth.model}` : ''}`
          : 'Không khả dụng')
        : 'Chưa xác định';

      return {
        sentimentTrend,
        totalAnalyzed,
        positiveRate: toRate(sentimentTrend.Positive),
        neutralRate: toRate(sentimentTrend.Neutral),
        negativeRate: toRate(sentimentTrend.Negative),
        dominantSentiment,
        aiStatus,
      };
    } catch (error) {
      console.warn('analyticsApi.getManagerSentimentStats failed, returning safe defaults', error);
      return {
        sentimentTrend: { Positive: 0, Neutral: 0, Negative: 0 },
        totalAnalyzed: 0,
        positiveRate: 0,
        neutralRate: 0,
        negativeRate: 0,
        dominantSentiment: 'Chưa đủ dữ liệu',
        aiStatus: 'Không khả dụng',
      };
    }
  },
  async getSystemDashboardStats(role) {
    try {
      const normalizedRole = normalizeRole(role);
      const feedbackBasePath = getFeedbackBasePath(normalizedRole);
      const fetchUsers = normalizedRole === 'administrator';
      const fetchManagerAiData = normalizedRole === 'interaction-manager';
      const [ticketsResponse, usersResponse, aiReviewedResponse, aiHealthResponse] = await Promise.all([
        axiosClient.get(feedbackBasePath, { params: { pageSize: 1000 } }),
        fetchUsers
          ? axiosClient.get('/api/admin/users', { params: { pageSize: 1000 } })
          : Promise.resolve(null),
        fetchManagerAiData
          ? axiosClient.get('/api/management/feedbacks/ai-reviewed', {
              params: { PageNumber: 1, PageSize: 1000 },
            }).catch((error) => {
              console.warn('Unable to load AI-reviewed feedbacks for dashboard sentiment', error);
              return null;
            })
          : Promise.resolve(null),
        fetchManagerAiData
          ? axiosClient.get('/api/ai/health').catch((error) => {
              console.warn('Unable to load AI health for dashboard', error);
              return null;
            })
          : Promise.resolve(null),
      ]);

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

      const aiReviewedItems = Array.isArray(aiReviewedResponse?.items)
        ? aiReviewedResponse.items
        : Array.isArray(aiReviewedResponse?.data?.items)
          ? aiReviewedResponse.data.items
          : [];
      const sentimentSource = fetchManagerAiData ? aiReviewedItems : tickets;
      const sentimentTrend = sentimentSource.reduce((counts, item) => {
        const rawSentiment = fetchManagerAiData
          ? item?.analysisResult?.sentiment
          : item?.sentiment;
        const sentiment = String(rawSentiment || '').trim().toLowerCase();

        if (sentiment === 'positive') counts.Positive += 1;
        if (sentiment === 'neutral') counts.Neutral += 1;
        if (sentiment === 'negative') counts.Negative += 1;
        return counts;
      }, { Positive: 0, Neutral: 0, Negative: 0 });

      const ratedTickets = tickets.filter((t) => t.reviews && t.reviews.length > 0);
      const avgCsat = ratedTickets.length > 0
        ? Number((ratedTickets.reduce((acc, t) => acc + t.reviews[0].rating, 0) / ratedTickets.length).toFixed(1))
        : 0;

      const resolvedWithDuration = tickets.filter((t) => t.resolution && t.resolution.resolvedAt);
      const avgResolutionTimeHours = resolvedWithDuration.length > 0
        ? Math.round(resolvedWithDuration.reduce((acc, t) => {
            const created = new Date(t.createdAt);
            const resolved = new Date(t.resolution.resolvedAt);
            return acc + (resolved - created) / (1000 * 60 * 60);
          }, 0) / resolvedWithDuration.length)
        : 0;

      const aiHealth = aiHealthResponse?.data ?? aiHealthResponse;
      const aiStatus = fetchManagerAiData
        ? (aiHealth
          ? (aiHealth.isAvailable
            ? `Đang hoạt động${aiHealth.model ? ` · ${aiHealth.model}` : ''}`
            : 'Không khả dụng')
          : 'Chưa xác định')
        : 'Chưa xác định';

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
        aiStatus,
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
