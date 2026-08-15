import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, GestureResponderEvent } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { AppCard } from '@/components/ui';
import { AppButton } from '@/components/ui';
import { TicketStatusBadge } from '@/components/ui';
import { Text } from '@/components/ui';
import { feedbackApi } from '@/features/reporting/api';
import { colors } from '@/constants/theme';
import type { CommunityFeedCache, CommunityFeedCardProps, CommunityFeedItem } from '../types/community.types';
import { communityKeys } from '../api';

export function CommunityFeedCard({ item, onPress, onCommentPress }: CommunityFeedCardProps) {
  const createdAt = item?.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—';
  const [isSupported, setIsSupported] = useState(Boolean(item?.isSupported));
  const [supportCount, setSupportCount] = useState(Number(item?.supportCount ?? 0));

  useEffect(() => {
    setIsSupported(Boolean(item?.isSupported));
    setSupportCount(Number(item?.supportCount ?? 0));
  }, [item?.isSupported, item?.supportCount]);

  const queryClient = useQueryClient();
  const feedbackId = String(item?.feedbackId ?? item?.id ?? '');

  const syncSupportCache = (supported: boolean) => {
    queryClient.setQueriesData({
      queryKey: communityKeys.feeds(),
    }, (data) => {
      if (!data || typeof data !== 'object' || !Array.isArray((data as CommunityFeedCache).items)) {
        return data;
      }

      const cache = data as CommunityFeedCache;
      return {
        ...cache,
        items: cache.items?.map((feedItem) => {
          const itemId = String(feedItem.feedbackId ?? feedItem.id ?? '');
          if (itemId !== feedbackId) return feedItem;
          return {
            ...feedItem,
            isSupported: supported,
            supportCount: Math.max(0, Number(feedItem.supportCount ?? 0) + (supported ? 1 : -1)),
          };
        }),
      };
    });

    queryClient.setQueryData<CommunityFeedItem | null>(communityKeys.detail(feedbackId), (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        isSupported: supported,
        supportCount: Math.max(0, Number(prev.supportCount ?? 0) + (supported ? 1 : -1)),
      };
    });
  };

  const supportMutation = useMutation({
    mutationFn: async () => {
      if (!feedbackId) throw new Error('Missing feedback id');
      if (isSupported) {
        await feedbackApi.unsupport(feedbackId);
        return false;
      }
      await feedbackApi.support(feedbackId);
      return true;
    },
    onSuccess: (supported: boolean) => {
      setIsSupported(supported);
      setSupportCount((prev) => Math.max(0, prev + (supported ? 1 : -1)));
      syncSupportCache(supported);
    },
  });

  const handleSupportPress = () => {
    supportMutation.mutate();
  };

  return (
    <AppCard shadow="sm" pressable onPress={onPress} style={styles.wrapper}>
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
            <View style={styles.avatarWrap}>
              <Icon name="user" size={14} color={colors.primary} />
            </View>
            <View style={styles.metaGroup}>
              <Text className="text-sm font-sans-semibold text-text">{item?.authorName || item?.userName || 'Cộng đồng UrbanService'}</Text>
              <Text className="text-xs text-text-muted">{createdAt}</Text>
            </View>
            <TicketStatusBadge status={item?.status ?? 'SUBMITTED'} size="sm" />
          </View>

          {item?.imageUrl || item?.attachments?.[0]?.fileUrl ? (
            <Image source={{ uri: item?.imageUrl || item?.attachments?.[0]?.fileUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Icon name="image" size={28} color={colors.lightMuted} />
            </View>
          )}

          <View style={styles.bodyWrap}>
            <View style={styles.badgeRow}>
              <View style={styles.metaPill}>
                <Icon name="map-pin" size={12} color={colors.muted} />
                <Text className="text-2xs text-text-muted" numberOfLines={1}>
                  {item?.locationText ?? 'Địa điểm chưa xác định'}
                </Text>
              </View>
            </View>

            <Text className="text-base font-sans-semibold text-text mt-2" numberOfLines={2}>
              {item?.title ?? 'Không có tiêu đề'}
            </Text>

            <Text className="text-sm text-text-muted mt-2" numberOfLines={3}>
              {item?.description ?? 'Không có mô tả chi tiết.'}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.actionButtons}>
              <AppButton
                variant={isSupported ? 'primary' : 'outline'}
                size="sm"
                onPress={(event: GestureResponderEvent) => {
                  event.stopPropagation?.();
                  handleSupportPress();
                }}
                loading={supportMutation.isPending}
                style={styles.actionButton}
                leftIcon={<Icon name="thumbs-up" size={14} color={isSupported ? '#FFFFFF' : colors.primary} />}
              >
                {supportCount}
              </AppButton>

              <AppButton
                variant="outline"
                size="sm"
                onPress={(event: GestureResponderEvent) => {
                  event.stopPropagation?.();
                  onCommentPress();
                }}
                style={styles.actionButton}
                leftIcon={<Icon name="message-circle" size={14} color={colors.primary} />}
              >
                {item?.commentCount ?? 0}
              </AppButton>
            </View>

            <View style={styles.inlineMeta}>
              <Icon name="clock" size={13} color={colors.lightMuted} />
              <Text className="text-2xs text-text-light">{createdAt}</Text>
            </View>
          </View>
        </View>
      </AppCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  cardContent: {
    padding: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metaGroup: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  bodyWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  badgeRow: {
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '70%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  actionButton: {
    minWidth: 96,
  },
});
