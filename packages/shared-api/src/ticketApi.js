import { axiosClient } from './axiosClient.js';
import {
  getFeedbackBasePath,
  normalizeRoleForFeedback,
  normalizeTicketsResponse,
  normalizeCommentsResponse,
} from './ticketApiHelpers.js';
import { managementTypes } from '@urbanmind/shared-types';
import { normalizeCommentPayload } from './managementFeedbackApi.js';

const getTicketPath = (feedbackId, role) => {
  const base = getFeedbackBasePath(role);
  return `${base}/${feedbackId}`;
};

const updateFeedbackStatus = (feedbackId, statusData, options = {}) => {
  // Swagger defines the status endpoint as PATCH /api/management/feedbacks/{feedbackId}/status.
  // The previous PUT call hit the same route with an unsupported verb, which produced 405.
  return axiosClient.patch(`${getTicketPath(feedbackId, options.role)}/status`, statusData);
};

export const ticketApi = {
  async getTickets(filters = {}, options = {}) {
    const response = await axiosClient.get(getFeedbackBasePath(options.role), { params: filters });
    return normalizeTicketsResponse(response);
  },

  getTicketById(feedbackId, options = {}) {
    return (async () => {
      const res = await axiosClient.get(getTicketPath(feedbackId, options.role));

      try {
        if (res && Array.isArray(res.attachments)) {
          res.attachments = res.attachments.map((a) => {
            if (!a) return a;

            if (typeof a === 'string') {
              return {
                fileUrl: a,
                url: a,
              };
            }

            return {
              ...a,
              attachmentId:
                a.attachmentId ||
                a.attachmentID ||
                a.feedbackAttachmentId ||
                a.feedbackAttachmentID ||
                a.fileId ||
                a.fileID ||
                a.id ||
                null,
              fileUrl:
                a.fileUrl ||
                a.url ||
                a.path ||
                a.attachmentUrl ||
                a.displayUrl ||
                '',
            };
          });
        }
      } catch (e) {
        console.warn('Failed to normalize attachments', e);
      }

      return res;
    })();
  },

  createTicket(userId, reporterName, ticketData, options = {}) {
    // Detect file-like attachments (browser File/Blob or RN {uri,name,type})
    const hasFileAttachments = Array.isArray(ticketData?.attachments) && ticketData.attachments.some((item) => {
      try {
        if (!item) return false;
        if (typeof File !== 'undefined' && item instanceof File) return true;
        if (typeof Blob !== 'undefined' && item instanceof Blob) return true;
        // React Native style: { uri, name }
        if (typeof item === 'object' && ('uri' in item || 'name' in item)) return true;
      } catch (e) {
        return false;
      }
      return false;
    });

    if (hasFileAttachments && typeof FormData !== 'undefined') {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('reporterName', reporterName);

      Object.entries(ticketData || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((item) => {
            // If it's a file-like object, append directly
            formData.append(key, item);
          });
        } else if (typeof value === 'object' && value !== null && ('uri' in value || 'name' in value)) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      });

      return axiosClient.post(getFeedbackBasePath(options.role), formData, {
        headers: {
          'Content-Type': undefined,
        },
      });
    }

    return axiosClient.post(getFeedbackBasePath(options.role), {
      userId,
      reporterName,
      ...ticketData,
    });
  },

  updateTicket(feedbackId, ticketData, options = {}) {
    return axiosClient.put(getTicketPath(feedbackId, options.role), ticketData);
  },

  deleteTicket(feedbackId, options = {}) {
    return axiosClient.delete(getTicketPath(feedbackId, options.role));
  },

  addAttachments(feedbackId, files = [], options = {}) {
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('Files', file, file.name);
    });

    return axiosClient.post(
      `${getTicketPath(feedbackId, options.role)}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  deleteAttachment(feedbackId, attachmentId, options = {}) {
    return axiosClient.delete(
      `${getTicketPath(feedbackId, options.role)}/attachments/${attachmentId}`
    );
  },

  supportTicket(feedbackId, options = {}) {
    return axiosClient.post(`${getTicketPath(feedbackId, options.role)}/support`);
  },

  unsupportTicket(feedbackId, options = {}) {
    return axiosClient.delete(`${getTicketPath(feedbackId, options.role)}/support`);
  },

 getComments(feedbackId, options = {}) {
  return (async () => {
    try {
      const ticket = await axiosClient.get(getTicketPath(feedbackId, options.role));
      return normalizeCommentsResponse(ticket);
    } catch (err) {
      return [];
    }
  })();
},

  addComment(feedbackId, userId, userName, userRole, content, options = {}) {
    return axiosClient.post(`${getTicketPath(feedbackId, options.role)}/comments`, normalizeCommentPayload({ content }));
  },

  async verifyAndApprove(feedbackId, staffUserId, updateData = {}, options = {}) {
    const { note, status = managementTypes.feedbackStatus.VERIFIED, ...feedbackUpdates } = updateData || {};

    if (Object.keys(feedbackUpdates).length > 0) {
      await this.updateTicket(feedbackId, feedbackUpdates, options);
    }

    return updateFeedbackStatus(feedbackId, {
      status,
      note: note || 'Feedback verified after AI review.',
    }, options);
  },

  mergeTickets(masterId, duplicateIds, staffUserId, options = {}) {
    return axiosClient.post(`${getFeedbackBasePath(options.role)}/merge`, {
      masterId,
      duplicateIds,
      staffUserId,
    });
  },

  updateOperatorStatus(feedbackId, operatorUserId, status, note, files = [], options = {}) {
    return updateFeedbackStatus(feedbackId, {
      status,
      note,
    }, options);
  },

  reviewResolution(feedbackId, staffUserId, isApproved, note, options = {}) {
    return updateFeedbackStatus(feedbackId, {
      status: isApproved ? managementTypes.feedbackStatus.APPROVED : managementTypes.feedbackStatus.NEED_REWORK,
      note,
    }, options);
  },

  submitReview(feedbackId, userId, rating, isSatisfied, comment, options = {}) {
    return axiosClient.post(`${getTicketPath(feedbackId, options.role)}/comments`, normalizeCommentPayload({ content: comment }));
  },

  async getHistory(feedbackId, options = {}) {
    const ticket = await this.getTicketById(feedbackId, options);
    return ticket?.statusHistories || [];
  },
};
