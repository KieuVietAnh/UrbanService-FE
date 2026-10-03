import { slaApi } from '@urbanmind/shared-api';
import {
  isSlaNotFoundError,
  normalizeIncidentSlaStatus,
  type StaffIncidentSlaStatus,
} from './staff-sla-models';

export const staffSlaKeys = {
  all: (userId: string) => ['staff', userId, 'sla'] as const,
  incident: (userId: string, incidentId: string) =>
    ['staff', userId, 'sla', 'incident', incidentId] as const,
  dashboard: (userId: string, incidentIds: string[]) =>
    ['staff', userId, 'sla', 'dashboard', incidentIds] as const,
};

export const staffSlaApi = {
  async incidentStatus(
    incidentId: string,
    signal?: AbortSignal,
  ): Promise<StaffIncidentSlaStatus | null> {
    const id = incidentId.trim();
    if (!id) throw new Error('Thiếu mã sự vụ để tải SLA.');

    try {
      const response = await slaApi.getIncidentSlaStatus(
        encodeURIComponent(id),
        { signal },
      );
      return normalizeIncidentSlaStatus(response, id);
    } catch (error) {
      // An Incident can legitimately have no SLA yet. Other failures stay
      // visible so authentication, authorization and network errors are not hidden.
      if (isSlaNotFoundError(error)) return null;
      throw error;
    }
  },
  async dashboard(
    incidentIds: string[],
    signal?: AbortSignal,
  ): Promise<{ byIncidentId: Record<string, StaffIncidentSlaStatus>; failedCount: number; withoutSlaCount: number }> {
    const ids = Array.from(new Set(incidentIds.map((id) => id.trim()).filter(Boolean)));
    const byIncidentId: Record<string, StaffIncidentSlaStatus> = {};
    let failedCount = 0;
    let withoutSlaCount = 0;

    for (let index = 0; index < ids.length; index += 4) {
      if (signal?.aborted) {
        const canceled = new Error('Yêu cầu đã được hủy.');
        canceled.name = 'AbortError';
        throw canceled;
      }
      const batch = ids.slice(index, index + 4);
      const results = await Promise.allSettled(
        batch.map((incidentId) => staffSlaApi.incidentStatus(incidentId, signal)),
      );

      results.forEach((result, resultIndex) => {
        const incidentId = batch[resultIndex];
        if (result.status === 'rejected') {
          const reason = result.reason as { code?: string; name?: string };
          if (reason?.code === 'ERR_CANCELED' || reason?.name === 'AbortError' || reason?.name === 'CanceledError') throw result.reason;
          failedCount += 1;
          return;
        }
        if (!result.value) {
          withoutSlaCount += 1;
          return;
        }
        byIncidentId[incidentId] = result.value;
      });
    }

    return { byIncidentId, failedCount, withoutSlaCount };
  },
};
