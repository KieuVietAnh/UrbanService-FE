import { useQuery } from '@tanstack/react-query';
import { feedbackApi, reportingKeys, type FeedbackFilters } from '@/features/reporting/api';
import type { TicketLike } from '../types';

export function useHomeData() {
  const filters: FeedbackFilters = { pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' };
  const { data: page, isLoading, refetch, isRefetching } = useQuery({
    queryKey: reportingKeys.list(filters),
    queryFn: () => feedbackApi.list(filters),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const tickets = (Array.isArray(page) ? page : (page?.items ?? [])) as TicketLike[];

  return {
    tickets,
    nearby: tickets.slice(0, 3),
    isLoading,
    nearbyLoading: isLoading,
    refetch,
    isRefetching,
  };
}
