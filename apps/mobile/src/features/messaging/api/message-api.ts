import { axiosClient } from '@urbanmind/shared-api';

export interface Message {
  id: string;
  feedbackId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
  attachments?: Array<{ fileUrl: string }>;
}

export interface SendMessagePayload {
  content: string;
}

/**
 * messageApi — GET/POST /feedbacks/{id}/messages
 * Mobile-specific: messages between citizen and staff on a feedback thread.
 */
export const messageApi = {
  /**
   * GET /api/feedbacks/{feedbackId}/messages
   * Returns chronological message list for a feedback thread.
   */
  async getMessages(feedbackId: string): Promise<Message[]> {
    const response = await (axiosClient as any).get(
      `/api/feedbacks/${feedbackId}/messages`
    );
    // Normalize: handle {data: [...]}, [...], {items: [...]}
    const payload = response?.data ?? response?.items ?? response ?? [];
    return Array.isArray(payload) ? payload : [];
  },

  /**
   * POST /api/feedbacks/{feedbackId}/messages
   * Send a message on a feedback thread.
   */
  async sendMessage(feedbackId: string, content: string): Promise<Message> {
    const response = await (axiosClient as any).post(
      `/api/feedbacks/${feedbackId}/messages`,
      { content: content.trim() }
    );
    return response?.data ?? response;
  },
};
