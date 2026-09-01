import { useQueries } from '@tanstack/react-query';
import { staffSlaApi, staffSlaKeys } from './staff-sla-api';
import type { StaffSlaReportTarget } from './staff-sla-models';

export function useStaffReportSlaQueries({
  userId,
  incidentId,
  reports,
}: {
  userId: string;
  incidentId: string;
  reports: readonly StaffSlaReportTarget[];
}) {
  const enabled = Boolean(userId.trim() && incidentId.trim());

  return useQueries({
    queries: reports.map((report) => ({
      queryKey: staffSlaKeys.report(userId, incidentId, report.feedbackId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        staffSlaApi.reportStatus(report.feedbackId, signal),
      enabled,
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: (failureCount: number, error: unknown) => {
        const status = Number(
          (error as { response?: { status?: number }; status?: number })?.response?.status
          ?? (error as { status?: number })?.status,
        );
        return ![400, 401, 403, 404].includes(status) && failureCount < 2;
      },
    })),
  });
}
