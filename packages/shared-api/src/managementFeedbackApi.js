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

export const normalizeFeedbackListParams = (params = {}) => {
  const normalized = {};
  const pageNumber = Number(params?.PageNumber ?? params?.pageNumber ?? params?.pageIndex ?? params?.page ?? 1);
  const pageSize = Number(params?.PageSize ?? params?.pageSize ?? 10);
  const status = params?.Status ?? params?.status;
  const categoryId = params?.CategoryId ?? params?.categoryId;
  const search = params?.Search ?? params?.search;

  if (Number.isFinite(pageNumber) && pageNumber > 0) {
    normalized.PageNumber = params?.pageIndex !== undefined && params?.pageNumber === undefined && params?.PageNumber === undefined
      ? pageNumber + 1
      : pageNumber;
  }

  if (Number.isFinite(pageSize) && pageSize > 0) {
    normalized.PageSize = pageSize;
  }

  if (status !== undefined && status !== null && status !== '') {
    normalized.Status = status;
  }

  if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
    normalized.CategoryId = categoryId;
  }

  if (search !== undefined && search !== null && search !== '') {
    normalized.Search = search;
  }

  return normalized;
};

export const normalizeCommentPayload = (payload = {}) => {
  const content = payload?.content ?? payload?.message ?? payload?.comment ?? '';
  return {
    content: typeof content === 'string' ? content : String(content ?? ''),
  };
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

export const normalizeProviderReportStatus = (value = '') => {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return '';

  const normalizedValue = rawValue.toLowerCase();
  if (normalizedValue === 'assigned') return 'Assigned';
  if (['inprogress', 'in_progress', 'in progress'].includes(normalizedValue)) return 'InProgress';
  if (['completed', 'complete'].includes(normalizedValue)) return 'Completed';

  return rawValue;
};

export const canTransitionProviderReportStatus = (currentStatus, nextStatus) => {
  const current = normalizeProviderReportStatus(currentStatus);
  const next = normalizeProviderReportStatus(nextStatus);

  const allowedTransitions = {
    Assigned: ['InProgress'],
    InProgress: ['Completed'],
    Completed: [],
  };

  return Boolean(allowedTransitions[current]?.includes(next));
};

export const managementFeedbackApi = {
  // Get all feedbacks with pagination and filters
  async getFeedbacks(params = {}) {
    const response = await axiosClient.get('/api/management/feedbacks', {
      params: normalizeFeedbackListParams(params),
    });
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

  async updateProviderReportStatus(providerReportId, payload = {}) {
    const response = await axiosClient.patch(`/api/management/provider-reports/${providerReportId}/status`, payload);
    return response;
  },

  async getProviderReports(feedbackId) {
    const candidates = [
      `/api/management/feedbacks/${feedbackId}/provider-reports`,
      `/api/management/feedbacks/${feedbackId}/provider-report`,
      `/api/management/feedbacks/${feedbackId}/provider`,
    ];

    for (const endpoint of candidates) {
      try {
        return await axiosClient.get(endpoint);
      } catch (error) {
        if (endpoint === candidates[candidates.length - 1]) {
          return [];
        }
      }
    }

    return [];
  },

  // Get provider candidates for a feedback (Swagger: /api/management/feedbacks/{feedbackId}/provider-candidates)
  async getProviderCandidates(feedbackId) {
    const response = await axiosClient.get(`/api/management/feedbacks/${feedbackId}/provider-candidates`);
    return response;
  },

  // Get a single provider report by its id
  async getProviderReportById(providerReportId) {
    const response = await axiosClient.get(`/api/management/provider-reports/${providerReportId}`);
    return response;
  },

  async getProviderReportContactLogs(providerReportId) {
    const response = await axiosClient.get(`/api/management/provider-reports/${providerReportId}/contact-logs`);
    return response;
  },

  async createProviderReportContactLog(providerReportId, payload) {
    const response = await axiosClient.post(
      `/api/management/provider-reports/${providerReportId}/contact-logs`,
      payload
    );
    return response;
  },

  async getCompletionDocuments(feedbackId) {
    const candidates = [
      `/api/management/feedbacks/${feedbackId}/completion-documents`,
      `/api/management/feedbacks/${feedbackId}/documents`,
      `/api/management/feedbacks/${feedbackId}/provider-reports/documents`,
    ];

    for (const endpoint of candidates) {
      try {
        return await axiosClient.get(endpoint);
      } catch (error) {
        if (endpoint === candidates[candidates.length - 1]) {
          return [];
        }
      }
    }

    return [];
  },

  async getProviderReportCompletionDocuments(providerReportId) {
    const candidates = [
      `/api/management/provider-reports/${providerReportId}/completion-documents`,
      `/api/management/provider-reports/${providerReportId}/documents`,
    ];

    for (const endpoint of candidates) {
      try {
        return await axiosClient.get(endpoint);
      } catch (error) {
        if (endpoint === candidates[candidates.length - 1]) {
          return [];
        }
      }
    }

    return [];
  },

  async uploadCompletionDocument(providerReportId, file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata.fileName) {
      formData.append('fileName', metadata.fileName);
    }

    if (metadata.uploadedBy) {
      formData.append('uploadedBy', metadata.uploadedBy);
    }

    const response = await axiosClient.post(
      `/api/management/provider-reports/${providerReportId}/completion-documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

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
    const response = await axiosClient.get('/api/management/feedbacks/ai-reviewed', {
      params: normalizeFeedbackListParams(params),
    });
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
