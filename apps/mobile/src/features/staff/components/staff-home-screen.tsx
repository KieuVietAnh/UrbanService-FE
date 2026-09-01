import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, useWindowDimensions, View } from 'react-native';
import { Link, Stack, useFocusEffect, type Href } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { staffApi, staffKeys } from '../staff-api';
import { colors, contentStyle, Label, panelStyle, QueryState, RecordCard, Section, StaffIcon, type StaffIconName } from './staff-ui';
import { StaffScrollView } from './staff-scroll-view';

const shortcuts: { title: string; description: string; href: Href; icon: StaffIconName }[] = [
  { title: 'Tra cứu Report', description: 'Thông tin phản ánh và sự vụ liên quan', href: '/(staff)/staff/(tabs)/feedbacks', icon: 'feedbacks' },
  { title: 'Trao đổi', description: 'Tin nhắn người dân và ghi chú nội bộ', href: '/(staff)/staff/(tabs)/conversations', icon: 'chat' },
  { title: 'Thông báo', description: 'Cập nhật công việc được phân công', href: '/(staff)/staff/notifications', icon: 'bell' },
];
const metrics = [
  { status: 'Assigned', label: 'Được giao' },
  { status: 'InProgress', label: 'Đang xử lý' },
  { status: 'NeedRework', label: 'Cần làm lại' },
  { status: 'SubmittedForApproval', label: 'Chờ duyệt' },
] as const;

function MetricLink({ status, label, value, columns, index }: { status: string; label: string; value: string; columns: 1 | 2 | 4; index: number }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Link href={{ pathname: '/(staff)/staff/(tabs)/incidents', params: { status, source: 'dashboard' } }} asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`Xem sự vụ ${label.toLowerCase()}`} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ width: columns === 1 ? '100%' : columns === 2 ? '50%' : '25%', paddingHorizontal: 18, paddingVertical: columns === 1 ? 14 : 18, gap: 6, borderTopWidth: index >= columns ? 1 : 0, borderRightWidth: (index + 1) % columns ? 1 : 0, borderColor: colors.border, backgroundColor: pressed || focused ? colors.primarySoft : colors.surface }}>
      <Label size={32} bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} maxFontSizeMultiplier={1.4} style={{ color: colors.primary, fontVariant: ['tabular-nums'], letterSpacing: -0.8 }}>{value}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><Label size={13} style={{ color: colors.textSecondary }}>{label}</Label></View><StaffIcon name="arrow" size={14} color={colors.muted} /></View>
    </Pressable>
  </Link>;
}

export function StaffHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { width, fontScale } = useWindowDimensions();
  const metricColumns = fontScale > 1.5 || (width < 340 && fontScale > 1.15) ? 1 : width >= 780 && fontScale <= 1.15 ? 4 : 2;
  const queries = useQueries({ queries: metrics.map((item) => {
    const params = { pageNumber: 1, status: item.status };
    return { queryKey: staffKeys.incidents(user?.id || '', params), queryFn: ({ signal }: { signal: AbortSignal }) => staffApi.incidents(user?.id || '', params, signal), retry: 1 };
  }) });
  const [assigned, inProgress, needRework, waitingApproval] = queries;
  const refresh = useCallback(() => {
    void assigned.refetch(); void inProgress.refetch(); void needRework.refetch(); void waitingApproval.refetch();
  }, [assigned.refetch, inProgress.refetch, needRework.refetch, waitingApproval.refetch]);
  useFocusEffect(refresh);
  const metricError = queries.find((query) => query.error)?.error;
  return <>
    <Stack.Screen options={{ title: 'Không gian làm việc', headerRight: () => <Link href="/(staff)/staff/notifications" asChild><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><StaffIcon name="bell" /></Pressable></Link> }} />
    <StaffScrollView contentContainerStyle={contentStyle} refreshControl={<RefreshControl refreshing={queries.some((query) => query.isRefetching)} onRefresh={refresh} />}>
      <View style={{ gap: 6 }}><Label size={11} bold style={{ color: colors.primary, letterSpacing: 1.1 }}>URBANMIND · STAFF</Label><Label size={25} bold style={{ letterSpacing: -0.6 }}>Xin chào, {user?.fullName || 'bạn'}.</Label><Label muted size={14}>Mỗi sự vụ, một công việc cần theo dõi.</Label></View>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 3 }}><Label size={18} bold>Công việc của bạn</Label><Label size={12} muted>Chỉ tính sự vụ được phân công cho bạn</Label></View>
        <View style={{ ...panelStyle, padding: 0, gap: 0, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
          {metrics.map((item, index) => <MetricLink key={item.status} status={item.status} label={item.label} value={queries[index].isError ? '-' : queries[index].data?.totalItems.toLocaleString('vi-VN') ?? '…'} columns={metricColumns} index={index} />)}
        </View>
      </View>
      {metricError && <QueryState error={metricError} retry={refresh} />}
      <Link href={{ pathname: '/(staff)/staff/(tabs)/incidents', params: { status: '', source: 'dashboard' } }} asChild><Pressable accessibilityRole="button" accessibilityLabel="Mở sự vụ của tôi" style={{ ...panelStyle, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.primarySoft, borderWidth: 0 }}><View style={{ padding: 9, backgroundColor: colors.surface, borderRadius: 12 }}><StaffIcon name="incidents" size={24} /></View><View style={{ flex: 1, gap: 3 }}><Label bold size={16}>Sự vụ của tôi</Label><Label muted size={12}>Xem Report, tiến độ và lịch sử sự vụ</Label></View><StaffIcon name="arrow" size={18} /></Pressable></Link>
      <Section title="Sự vụ mới được giao"><QueryState pending={assigned.isPending} error={assigned.error} empty={!assigned.isPending && !assigned.error && !assigned.data?.items.length && 'Bạn chưa có sự vụ mới được giao.'} retry={() => { void assigned.refetch(); }} />{assigned.data?.items.slice(0, 3).map((item) => <RecordCard key={item.id} item={item} incident />)}</Section>
      <Section title="Tra cứu và kết nối"><View style={{ ...panelStyle, padding: 0, gap: 0, overflow: 'hidden' }}>{shortcuts.map((item, index) => <Link key={item.title} href={item.href} asChild><Pressable accessibilityRole="button" style={{ flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center', borderTopWidth: index ? 1 : 0, borderColor: colors.border, backgroundColor: colors.surface }}><StaffIcon name={item.icon} size={21} color={colors.textSecondary} /><View style={{ flex: 1, gap: 3 }}><Label bold size={14}>{item.title}</Label><Label muted size={12}>{item.description}</Label></View><StaffIcon name="arrow" size={16} color={colors.muted} /></Pressable></Link>)}</View></Section>
    </StaffScrollView>
  </>;
}
