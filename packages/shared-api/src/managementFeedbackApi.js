import { axiosClient } from './axiosClient.js';

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
    const response = await axiosClient.put(`/api/management/feedbacks/${feedbackId}`, updateData);
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
