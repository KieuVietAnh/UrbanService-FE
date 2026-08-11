import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Icon from '@expo/vector-icons/Feather';
import { AppCard } from '@/components/ui/AppCard';
import { TicketStatusBadge } from '@/components/ui/TicketStatusBadge';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/theme';

interface CommunityFeedCardProps {
  item: any;
  onPress: () => void;
}

export function CommunityFeedCard({ item, onPress }: CommunityFeedCardProps) {
  const createdAt = item?.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—';

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
              <View style={styles.codePill}>
                <Text className="text-2xs font-sans-semibold text-primary">#{item?.code ?? item?.feedbackCode ?? '—'}</Text>
              </View>
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
            <View style={styles.inlineMeta}>
              <Icon name="thumbs-up" size={13} color={colors.primary} />
              <Text className="text-2xs text-text-light">{item?.supportCount ?? 0} ủng hộ</Text>
            </View>
            <View style={styles.inlineMeta}>
              <Icon name="message-circle" size={13} color={colors.primary} />
              <Text className="text-2xs text-text-light">{item?.commentCount ?? 0} bình luận</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  codePill: {
    paddingHorizontal: 8,
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
});
