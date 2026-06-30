import { axiosClient } from './axiosClient.js';

export const normalizeAiReviewedPayload = (payload = {}) => {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items.map((item) => {
    const feedback = item?.feedback || {};
    const analysisResult = item?.analysisResult || {};

    return {
      ...feedback,
      feedbackId: feedback.feedbackId || feedback.id || item?.feedbackId || '',
      title: feedback.title || feedback.description || 'Không có tiêu đề',
      description: feedback.description || feedback.content || '',
      reporterName: feedback.reporterName || feedback.reporter?.name || 'Không rõ',
      locationText: feedback.locationText || feedback.location || '',
      categoryId: feedback.categoryId ?? analysisResult.detectedCategoryId ?? '',
      priority: feedback.priority || 'Medium',
      createdAt: feedback.createdAt || analysisResult.createdAt || null,
      summary: analysisResult.summary || '',
      confidenceScore: analysisResult.confidenceScore ?? 0,
      sentiment: analysisResult.sentiment || 'Unknown',
      detectedCategoryName: analysisResult.detectedCategoryName || '',
      rawResponse: analysisResult.rawResponse || '',
      analysisResult,
    };
  });
};

export const normalizeStaffFeedbackUpdatePayload = (updateData = {}) => {
  const payload = {};

  const assignIfDefined = (key, transform) => {
    if (Object.prototype.hasOwnProperty.call(updateData, key)) {
      const value = transform(updateData[key]);
      if (value !== undefined && value !== null) {
        payload[key] = value;
      }
    }
  };

  assignIfDefined('categoryId', (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  assignIfDefined('title', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('description', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('locationText', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('latitude', (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

  assignIfDefined('longitude', (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

  assignIfDefined('priority', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('dueDate', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('status', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  assignIfDefined('statusNote', (value) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

  return payload;
};

export const managementFeedbackApi = {
  // Get all feedbacks with pagination and filters
  async getFeedbacks(params = {}) {
    const response = await axiosClient.get('/api/management/feedbacks', { params });
    return response;
  },

  // Get specific feedback by ID
  async getFeedbackById(feedbackId) {
    const response = await axiosClient.get(`/api/management/feedbacks/${feedbackId}`);
    return response;
  },

  // Update feedback details
  async updateFeedback(feedbackId, updateData) {
    const normalizedPayload = normalizeStaffFeedbackUpdatePayload(updateData);
    const response = await axiosClient.put(`/api/management/feedbacks/${feedbackId}`, normalizedPayload);
    return response;
  },

  // Swagger contract: PATCH /api/management/feedbacks/{feedbackId}/status with { status, note }.
  // Using PUT on this route is not allowed by the backend and returns 405 Method Not Allowed.
  async updateStatus(feedbackId, statusData) {
    const response = await axiosClient.patch(`/api/management/feedbacks/${feedbackId}/status`, statusData);
    return response;
  },

  // Verify feedback
  async verifyFeedback(feedbackId, verifyData = {}) {
    const response = await axiosClient.put(`/api/management/feedbacks/${feedbackId}/verify`, verifyData);
    return response;
  },

  // Assign feedback to operator
  async assignToOperator(assignmentData) {
    const response = await axiosClient.post('/api/management/feedbacks/assign', assignmentData);
    return response;
  },

  // Submit a resolution from an operator
  async submitResolution(resolutionData) {
    const response = await axiosClient.post('/api/management/feedbacks/submit-resolution', resolutionData);
    return response;
  },

  // Get feedbacks that have already been reviewed by AI
  async getAiReviewedFeedbacks(params = {}) {
    const response = await axiosClient.get('/api/management/feedbacks/ai-reviewed', { params });
    return normalizeAiReviewedPayload(response);
  },

  // Approve an operator's resolution
  async approveFeedback(feedbackId, note = '') {
    const response = await axiosClient.put(
      `/api/management/feedbacks/${feedbackId}/approve`,
      null,
      { params: { note } }
    );
    return response;
  },

  // Request rework on a resolved feedback
  async requestRework(feedbackId, note = '') {
    const response = await axiosClient.put(
      `/api/management/feedbacks/${feedbackId}/need-rework`,
      JSON.stringify(note),
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response;
  },
};
