import React, { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@expo/vector-icons/Feather';
import { Text } from '@/components/ui/Text';
import { AppHeader } from '@/components/ui/AppHeader';
import { SkeletonCard } from '@/components/ui/AppSkeleton';
import { notificationApi, Notification } from '@/services/api/notificationApi';
import { colors } from '@/constants/theme';

const TYPE_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  ASSIGNED: { icon: 'user-check', bg: '#EFF6FF', color: colors.primary },
  NEED_MORE: { icon: 'alert-circle', bg: '#FEE2E2', color: '#EF4444' },
  RESOLVED: { icon: 'check-circle', bg: '#D1FAE5', color: '#10B981' },
  CLOSED: { icon: 'check-square', bg: '#F1F5F9', color: '#64748B' },
  DEFAULT: { icon: 'bell', bg: '#F1F5F9', color: '#64748B' },
};

function getTypeConfig(type: string) {
  return TYPE_ICON[type?.toUpperCase()] ?? TYPE_ICON.DEFAULT;
}

function groupByDay(items: Notification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { title: string; data: Notification[] }[] = [];

  const map: Record<string, Notification[]> = {};
  items.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    if (!map[d]) map[d] = [];
    map[d].push(n);
  });

  Object.entries(map).forEach(([dateStr, items]) => {
    let title = dateStr;
    if (dateStr === today) title = 'Hôm nay';
    else if (dateStr === yesterday) title = 'Hôm qua';
    else title = new Date(dateStr).toLocaleDateString('vi-VN');
    groups.push({ title, data: items });
  });

  return groups;
}

function NotifItem({
  item,
  onPress,
}: {
  item: Notification;
  onPress: () => void;
}) {
  const cfg = getTypeConfig(item.type);
  const time = new Date(item.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.notifItem,
        !item.isRead && styles.notifUnread,
        pressed && styles.notifPressed,
      ]}
    >
      <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon as any} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notifTime}>{time}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(1, 50),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.items ?? [];
  const groups = groupByDay(notifications);

  const handleNotifPress = async (item: Notification) => {
    if (!item.isRead) {
      notificationApi.markRead(item.notificationId).catch(() => {});
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (item.relatedId && item.relatedType === 'FEEDBACK') {
      router.push(`/(resident)/tickets/${item.relatedId}` as any);
    }
  };

  const flatData: (string | Notification)[] = [];
  groups.forEach((g) => {
    flatData.push(g.title);
    g.data.forEach((n) => flatData.push(n));
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Thông báo"
        showBack
        rightAction={
          <Pressable hitSlop={10} onPress={() => markAllMutation.mutate()}>
            <Icon name="check-square" size={20} color={colors.primary} />
          </Pressable>
        }
      />

      <FlatList
        data={isLoading ? Array(5).fill(null) : flatData}
        keyExtractor={(item, i) =>
          typeof item === 'string' ? `header-${i}` : item.notificationId
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center pt-20">
              <Icon name="bell-off" size={48} color="#CBD5E1" />
              <Text className="text-base font-sans-semibold text-text-muted mt-4">
                Không có thông báo
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item === null) return <View className="mx-5 mb-3"><SkeletonCard /></View>;
          if (typeof item === 'string') {
            return (
              <Text style={styles.groupHeader}>{item.toUpperCase()}</Text>
            );
          }
          return (
            <NotifItem item={item} onPress={() => handleNotifPress(item)} />
          );
        }}
      />

      {/* Community promo card */}
      <Pressable
        style={styles.promoCard}
        onPress={() => router.push('/(resident)/community' as any)}
      >
        <Icon name="users" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle}>Góp ý của bạn giúp thành phố tốt hơn</Text>
          <Text style={styles.promoSub}>Xem tác động cộng đồng trong tháng này →</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  groupHeader: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifUnread: {
    backgroundColor: '#F8FBFF',
  },
  notifPressed: {
    backgroundColor: '#F1F5F9',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifTitle: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  notifTitleUnread: {
    fontFamily: 'Geist-SemiBold',
    color: '#0F172A',
  },
  notifMessage: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  notifTime: {
    fontFamily: 'Geist-Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
  },
  promoTitle: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  promoSub: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
});
