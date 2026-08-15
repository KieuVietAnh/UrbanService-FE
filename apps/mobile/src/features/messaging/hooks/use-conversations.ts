import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '@urbanmind/shared-api';
import { Conversation } from '../types/messaging.types';

const fetchConversations = async (): Promise<Conversation[]> => {
  const res = await axiosClient.get('/api/inbox/conversations');
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data as Conversation[];
  return (data?.items ?? []) as Conversation[];
};

export const useConversations = () => {
  return useQuery<Conversation[]>({ queryKey: ['inbox', 'conversations'], queryFn: fetchConversations, staleTime: 1000 * 30 });
};

export default useConversations;
