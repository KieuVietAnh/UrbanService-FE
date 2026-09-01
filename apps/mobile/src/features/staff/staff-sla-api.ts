import { slaApi } from '@urbanmind/shared-api';
import {
  isSlaNotFoundError,
  normalizeFeedbackSlaStatus,
  type StaffFeedbackSlaStatus,
} from './staff-sla-models';

export const staffSlaKeys = {
  all: (userId: string) => ['staff', userId, 'sla'] as const,
  incident: (userId: string, incidentId: string) =>
    ['staff', userId, 'sla', 'incident', incidentId] as const,
  report: (userId: string, incidentId: string, feedbackId: string) =>
    ['staff', userId, 'sla', 'incident', incidentId, 'report', feedbackId] as const,
};

export const staffSlaApi = {
  async reportStatus(
    feedbackId: string,
    signal?: AbortSignal,
  ): Promise<StaffFeedbackSlaStatus | null> {
    const id = feedbackId.trim();
    if (!id) throw new Error('Thiếu mã Report để tải SLA.');

    try {
      const response = await slaApi.getFeedbackSlaStatus(
        encodeURIComponent(id),
        { signal },
      );
      return normalizeFeedbackSlaStatus(response, id);
    } catch (error) {
      // A linked Report can legitimately have no SLA yet. Other failures stay
      // visible so authentication, authorization and network errors are not hidden.
      if (isSlaNotFoundError(error)) return null;
      throw error;
    }
  },
};
