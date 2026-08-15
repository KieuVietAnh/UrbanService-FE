import React from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { SkeletonCard } from '@/components/shared';
import { Text } from '@/components/ui';
import { colors } from '@/constants/theme';
import type { RouterLike } from '../types';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '@/features/community/api';
import { styles } from '../homeStyles';

type Props = {
  router: RouterLike;
};

const COMMUNITY_IMAGES = [
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=480&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=480&q=80',
];

export function CommunityPreview({ router }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['community-feed-preview'],
    queryFn: () => communityApi.getFeed({ pageNumber: 1, pageSize: 8 }),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <View style={styles.section}>
      {isLoading ? (
        <View style={styles.communityBlock}>
          {Array.from({ length: 2 }).map((_, index) => (
            <View key={`preview-skeleton-${index}`} style={styles.communitySkeleton}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Icon name="message-circle" size={28} color={colors.lightMuted} />
          <Text style={styles.emptyTitle}>Chưa có hoạt động cộng đồng</Text>
          <Text style={styles.emptySubtitle}>Các tin tức và phản ánh gần đây sẽ xuất hiện ở đây.</Text>
        </View>
      ) : (
        <View style={styles.communityHeroCard}>
          <View style={styles.communityGlow} />
          <View style={styles.communityHeaderRow}>
            <View>
              <Text style={styles.communitySectionTitle}>Cộng đồng cùng chung tay</Text>
              <Text style={styles.communitySectionSub}>Các chia sẻ mới nhất quanh khu vực</Text>
            </View>
            <Pressable style={styles.communityCta} onPress={() => router.push('/(resident)/community')}>
              <Text style={styles.communityCtaText}>Xem tất cả</Text>
              <Icon name="chevron-right" size={15} color="#6D28D9" />
            </Pressable>
          </View>

          <View style={styles.communityBodyRow}>
            <View style={styles.communityMiniList}>
              {items.slice(0, 2).map((item: any, index: number) => {
                const id = item.feedbackId ?? item.id;
                return (
                  <Animated.View key={id ?? index} entering={FadeInDown.delay(index * 70).springify().damping(18)}>
                    <Pressable
                      style={styles.communityMiniCard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (id) router.push({ pathname: '/community/[id]', params: { id: String(id) } } as any);
                      }}
                    >
                      <Image source={{ uri: COMMUNITY_IMAGES[index % COMMUNITY_IMAGES.length] }} style={styles.communityMiniImage} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.communityNewPill}>
                          <Text style={styles.communityNewText}>Mới</Text>
                        </View>
                        <Text style={styles.communityMiniTitle} numberOfLines={2}>
                          {item.title ?? item.content ?? 'Bài viết cộng đồng'}
                        </Text>
                        <Text style={styles.communityMiniAddress} numberOfLines={1}>
                          {item.locationText ?? item.address ?? 'Khu vực đang cập nhật'}
                        </Text>
                        <View style={styles.communityStatsRow}>
                          <Icon name="thumbs-up" size={12} color="#6B7280" />
                          <Text style={styles.communityStatText}>{item.supportCount ?? item.supporters ?? 0}</Text>
                          <Icon name="message-square" size={12} color="#6B7280" />
                          <Text style={styles.communityStatText}>{item.commentCount ?? item.commentsCount ?? 0}</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.communityIllustration}>
              <View style={styles.communityPersonA} />
              <View style={styles.communityPersonB} />
              <View style={styles.communityHeartBubble}>
                <Icon name="heart" size={16} color="#EC4899" />
              </View>
              <View style={styles.communityChatBubble}>
                <Icon name="message-circle" size={16} color="#8B5CF6" />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
