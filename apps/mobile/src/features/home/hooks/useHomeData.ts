import { useQuery } from '@tanstack/react-query';
import { feedbackApi } from '@/features/reporting/api';
import type { TicketLike } from '../types';

export function useHomeData() {
  const { data: page, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feedbacks', 'home'],
    queryFn: () => feedbackApi.list({ pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: nearbyPage, isLoading: nearbyLoading } = useQuery({
    queryKey: ['feedbacks', 'nearby'],
    queryFn: () => feedbackApi.list({ pageSize: 3, sortBy: 'createdAt', sortOrder: 'desc' }),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    tickets: (Array.isArray(page) ? page : (page?.items ?? [])) as TicketLike[],
    nearby: (Array.isArray(nearbyPage) ? nearbyPage : (nearbyPage?.items ?? [])) as TicketLike[],
    isLoading,
    nearbyLoading,
    refetch,
    isRefetching,
  };
}
