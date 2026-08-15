import type { CommunityFeedParams } from '../types/community.types';

export const communityKeys = {
  all: ['community'] as const,
  feeds: () => [...communityKeys.all, 'feeds'] as const,
  feed: (params: CommunityFeedParams = {}) => [...communityKeys.feeds(), params] as const,
  mapFeed: () => [...communityKeys.feeds(), 'map', 'infinite'] as const,
  webMapFeed: () => [...communityKeys.feeds(), 'map', 'web'] as const,
  legacyFeed: () => [...communityKeys.feeds(), 'legacy'] as const,
  detail: (feedbackId: string) => [...communityKeys.all, 'detail', feedbackId] as const,
  areas: () => [...communityKeys.all, 'areas'] as const,
};
