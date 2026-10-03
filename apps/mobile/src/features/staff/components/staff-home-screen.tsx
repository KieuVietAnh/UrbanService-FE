import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, useWindowDimensions, View } from 'react-native';
import { Link, Stack, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { staffApi, staffKeys, staffQueryRetry } from '../staff-api';
import { staffSlaApi, staffSlaKeys } from '../staff-sla-api';
import type { StaffIncidentSlaStatus } from '../staff-sla-models';
import { useRefreshOnReturn } from '../use-refresh-on-return';
import { normalizeKey, priorityLabel, recordCode, severityLabel, type StaffRecord } from '../staff-models';
import {
  colors, contentStyle, Label, Notice, panelStyle, QueryState, Section, StaffIcon,
  Status, type StaffIconName,
} from './staff-ui';
import { StaffScrollView } from './staff-scroll-view';

const shortcuts: { title: string; description: string; href: Href; icon: StaffIconName }[] = [
  { title: 'Tra cứu phản ánh', description: 'Tìm phản ánh và sự vụ liên quan', href: '/(staff)/staff/(tabs)/feedbacks', icon: 'feedbacks' },
  { title: 'Trao đổi với người dân', description: 'Phản hồi và xem ghi chú nội bộ', href: '/(staff)/staff/(tabs)/conversations', icon: 'chat' },
  { title: 'Thông báo công việc', description: 'Theo dõi phân công và cập nhật mới', href: '/(staff)/staff/notifications', icon: 'bell' },
];

const metrics = [
  { status: 'Assigned', label: 'Mới được giao', description: 'Chưa bắt đầu', color: colors.primary },
  { status: 'InProgress', label: 'Đang xử lý', description: 'Đang thực hiện', color: colors.primaryDark },
  { status: 'NeedRework', label: 'Cần làm lại', description: 'Ưu tiên xử lý', color: colors.redDark },
  { status: 'SubmittedForApproval', label: 'Chờ duyệt', description: 'Đã gửi kết quả', color: colors.amberDark },
] as const;

const activeStatuses = new Set(metrics.map((item) => normalizeKey(item.status)));

function slaState(value?: StaffIncidentSlaStatus) {
  if (!value) return 'unavailable' as const;
  if (value.response.breached || value.resolution.breached) return 'breached' as const;
  if (value.response.warning || value.resolution.warning) return 'warning' as const;
  return 'healthy' as const;
}

function incidentRank(item: StaffRecord, slaByIncidentId: Record<string, StaffIncidentSlaStatus>) {
  const state = slaState(slaByIncidentId[item.id]);
  const sla = state === 'breached' ? 30 : state === 'warning' ? 20 : 0;
  const rework = normalizeKey(item.status) === 'needrework' ? 15 : 0;
  const severity = ({ critical: 8, high: 6, medium: 4, low: 2 } as Record<string, number>)[normalizeKey(item.severity)] || 0;
  const priority = ({ critical: 8, urgent: 8, high: 6, medium: 4, normal: 4, low: 2 } as Record<string, number>)[normalizeKey(item.priority)] || 0;
  return sla + rework + severity + priority;
}

function MetricLink({ status, label, description, value, color, columns }: {
  status: string; label: string; description: string; value: string; color: string; columns: 1 | 2;
}) {
  const [pressed, setPressed] = useState(false);
  return <Link href={{ pathname: '/(staff)/staff/(tabs)/incidents', params: { status, source: 'dashboard' } }} asChild>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem sự vụ ${label.toLowerCase()}`}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        width: columns === 1 ? '100%' : '48.5%',
        minHeight: 120,
        padding: 15,
        justifyContent: 'space-between',
        gap: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: pressed ? color : colors.border,
        backgroundColor: pressed ? colors.primarySoft : colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <Label size={30} bold numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color, fontVariant: ['tabular-nums'], letterSpacing: -1 }}>{value}</Label>
        <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}12` }}>
          <StaffIcon name="incidents" size={17} color={color} />
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Label size={13} bold>{label}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Label muted size={11} style={{ flex: 1 }}>{description}</Label>
          <StaffIcon name="arrow" size={13} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  </Link>;
}

function Shortcut({ item, last }: { item: typeof shortcuts[number]; last: boolean }) {
  const [pressed, setPressed] = useState(false);
  return <Link href={item.href} asChild><Pressable
    accessibilityRole="button"
    accessibilityLabel={item.title}
    onPressIn={() => setPressed(true)}
    onPressOut={() => setPressed(false)}
    style={{ minHeight: 76, flexDirection: 'row', gap: 14, padding: 15, alignItems: 'center', borderBottomWidth: last ? 0 : 1, borderColor: colors.border, backgroundColor: pressed ? colors.primarySoft : colors.surface }}
  >
    <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}><StaffIcon name={item.icon} size={21} /></View>
    <View style={{ flex: 1, gap: 3 }}><Label bold size={14}>{item.title}</Label><Label muted size={12}>{item.description}</Label></View>
    <StaffIcon name="arrow" size={16} color={colors.muted} />
  </Pressable></Link>;
}

function AttentionCard({ item, sla }: { item: StaffRecord; sla?: StaffIncidentSlaStatus }) {
  const state = slaState(sla);
  const tone = state === 'breached' || normalizeKey(item.status) === 'needrework'
    ? colors.redDark
    : state === 'warning' ? colors.amberDark : colors.primary;
  const slaLabel = state === 'breached' ? 'SLA quá hạn' : state === 'warning' ? 'SLA sắp đến hạn' : '';

  return <Link href={(`/(staff)/staff/incidents/${encodeURIComponent(item.id)}`) as Href} asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở sự vụ ${item.title}`} style={({ pressed }) => ({
      ...panelStyle,
      padding: 16,
      gap: 10,
      borderLeftWidth: 4,
      borderLeftColor: tone,
      backgroundColor: pressed ? colors.primarySoft : colors.surface,
    })}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Label muted bold size={11}>{recordCode(item.id, true)}</Label>
        <Status value={item.status} />
      </View>
      <Label bold size={16} numberOfLines={2}>{item.title}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {slaLabel ? <View style={{ borderRadius: 8, backgroundColor: state === 'breached' ? colors.redLight : colors.amberLight, paddingHorizontal: 9, paddingVertical: 5 }}><Label bold size={11} style={{ color: tone }}>{slaLabel}</Label></View> : null}
        <Label muted size={12}>Mức độ {severityLabel(item.severity)}</Label>
        <Label muted size={12}>Ưu tiên {priorityLabel(item.priority)}</Label>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 }}>
        <Label bold size={12} style={{ flex: 1, color: colors.primaryDark }}>Mở và tiếp tục đúng bước</Label>
        <StaffIcon name="arrow" size={16} />
      </View>
    </Pressable>
  </Link>;
}

function SlaOverview({ activeCount, data, error, pending, retry, stacked }: {
  activeCount: number;
  data?: Awaited<ReturnType<typeof staffSlaApi.dashboard>>;
  error?: unknown;
  pending: boolean;
  retry: () => void;
  stacked: boolean;
}) {
  if (pending) return <QueryState pending retry={retry} />;
  if (error && !data) return <QueryState error={error} retry={retry} />;

  const statuses = Object.values(data?.byIncidentId || {});
  const breached = statuses.filter((item) => slaState(item) === 'breached').length;
  const warning = statuses.filter((item) => slaState(item) === 'warning').length;
  const healthy = statuses.filter((item) => slaState(item) === 'healthy').length;

  return <View style={{ ...panelStyle, padding: 0, gap: 0, overflow: 'hidden' }}>
    <View style={{ padding: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Label bold size={14}>Thời hạn xử lý</Label>
        <Label muted bold size={11}>{statuses.length}/{activeCount} sự vụ có SLA</Label>
      </View>
      <Label muted size={12}>Số liệu do hệ thống SLA của từng sự vụ cung cấp.</Label>
    </View>
    <View style={{ flexDirection: stacked ? 'column' : 'row' }}>
      <View style={{ flex: stacked ? undefined : 1, minHeight: 96, padding: 16, gap: 5, borderRightWidth: stacked ? 0 : 1, borderBottomWidth: stacked ? 1 : 0, borderColor: colors.border }}>
        <Label size={28} bold style={{ color: colors.amberDark, fontVariant: ['tabular-nums'] }}>{warning}</Label>
        <Label bold size={13}>Sắp quá hạn</Label>
        <Label muted size={11}>Cần ưu tiên theo dõi</Label>
      </View>
      <View style={{ flex: stacked ? undefined : 1, minHeight: 96, padding: 16, gap: 5 }}>
        <Label size={28} bold style={{ color: colors.redDark, fontVariant: ['tabular-nums'] }}>{breached}</Label>
        <Label bold size={13}>Đã quá hạn</Label>
        <Label muted size={11}>Cần xử lý ngay</Label>
      </View>
    </View>
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceMuted }}>
      <Label muted size={11}>{healthy} sự vụ đang đúng hạn{data?.withoutSlaCount ? ` · ${data.withoutSlaCount} sự vụ chưa có SLA` : ''}{data?.failedCount ? ` · ${data.failedCount} SLA chưa tải được` : ''}</Label>
    </View>
  </View>;
}

export function StaffHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const { width, fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.45 || width < 340;
  const metricColumns: 1 | 2 = stacked ? 1 : 2;

  const dashboardQuery = useQuery({
    queryKey: staffKeys.dashboard(userId),
    queryFn: ({ signal }: { signal: AbortSignal }) => staffApi.dashboard(userId, signal),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: staffQueryRetry,
  });

  const activeIncidents = useMemo(
    () => (dashboardQuery.data?.items || []).filter((item) => activeStatuses.has(normalizeKey(item.status))),
    [dashboardQuery.data?.items],
  );
  const activeIncidentIds = useMemo(() => activeIncidents.map((item) => item.id).filter(Boolean), [activeIncidents]);

  const slaQuery = useQuery({
    queryKey: staffSlaKeys.dashboard(userId, activeIncidentIds),
    queryFn: ({ signal }: { signal: AbortSignal }) => staffSlaApi.dashboard(activeIncidentIds, signal),
    enabled: Boolean(userId && dashboardQuery.data && activeIncidentIds.length),
    staleTime: 60_000,
    retry: staffQueryRetry,
  });

  const metricCounts = useMemo(() => Object.fromEntries(metrics.map((metric) => [
    normalizeKey(metric.status),
    activeIncidents.filter((item) => normalizeKey(item.status) === normalizeKey(metric.status)).length,
  ])), [activeIncidents]);

  const attentionItems = useMemo(() => {
    const slaByIncidentId = slaQuery.data?.byIncidentId || {};
    return activeIncidents.slice().sort((left, right) => {
      const rankDifference = incidentRank(right, slaByIncidentId) - incidentRank(left, slaByIncidentId);
      if (rankDifference !== 0) return rankDifference;
      return (Date.parse(right.updatedAt || right.createdAt) || 0) - (Date.parse(left.updatedAt || left.createdAt) || 0);
    }).slice(0, 3);
  }, [activeIncidents, slaQuery.data?.byIncidentId]);

  const refresh = useCallback(async () => {
    const refreshed = await dashboardQuery.refetch();
    if (refreshed.data && activeIncidentIds.length) await slaQuery.refetch();
  }, [activeIncidentIds.length, dashboardQuery.refetch, slaQuery.refetch]);
  useRefreshOnReturn(refresh);

  const firstName = user?.fullName?.trim().split(/\s+/).at(-1) || 'bạn';
  const focusItem = attentionItems[0];
  const refreshing = dashboardQuery.isRefetching || slaQuery.isRefetching;

  return <>
    <Stack.Screen options={{
      title: 'Tổng quan',
      headerRight: () => <Link href="/(staff)/staff/notifications" asChild><Pressable accessibilityRole="button" accessibilityLabel="Thông báo" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><StaffIcon name="bell" /></Pressable></Link>,
    }} />
    <StaffScrollView contentContainerStyle={contentStyle} refreshControl={<RefreshControl tintColor={colors.primary} colors={[colors.primary]} refreshing={refreshing} onRefresh={refresh} />}>
      <View style={{ ...panelStyle, padding: 20, gap: 18, overflow: 'hidden', backgroundColor: '#EDF4FF', borderColor: '#D3E2FA', shadowOpacity: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><StaffIcon name="account" size={23} color="#FFFFFF" /></View>
          <View style={{ flex: 1, gap: 2 }}><Label muted size={12} bold>Ca làm việc của bạn</Label><Label size={24} bold style={{ color: colors.inkSoft, letterSpacing: -0.6 }}>Chào {firstName}</Label></View>
        </View>

        <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'flex-end', gap: 12 }}>
          <Label size={38} bold style={{ color: colors.primaryDark, fontVariant: ['tabular-nums'], letterSpacing: -1.2 }}>{dashboardQuery.isPending ? '…' : activeIncidents.length}</Label>
          <View style={{ flex: 1, gap: 2, paddingBottom: stacked ? 0 : 4 }}><Label bold size={14}>sự vụ đang hoạt động</Label><Label muted size={12}>Tập trung vào việc cần làm tiếp theo.</Label></View>
        </View>

        {focusItem ? <Link href={(`/(staff)/staff/incidents/${encodeURIComponent(focusItem.id)}`) as Href} asChild><Pressable accessibilityRole="button" accessibilityLabel="Tiếp tục sự vụ cần ưu tiên" style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: pressed ? colors.primaryDark : colors.primary })}><Label selectable={false} bold size={14} style={{ color: '#FFFFFF' }}>Tiếp tục việc cần ưu tiên</Label><StaffIcon name="arrow" color="#FFFFFF" size={18} /></Pressable></Link>
          : <Link href="/(staff)/staff/(tabs)/incidents" asChild><Pressable accessibilityRole="button" accessibilityLabel="Mở danh sách sự vụ" style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: pressed ? colors.primaryDark : colors.primary })}><Label selectable={false} bold size={14} style={{ color: '#FFFFFF' }}>Mở sự vụ của tôi</Label><StaffIcon name="arrow" color="#FFFFFF" size={18} /></Pressable></Link>}
      </View>

      {dashboardQuery.isPending ? <QueryState pending retry={refresh} /> : null}
      {dashboardQuery.error && !dashboardQuery.data ? <QueryState error={dashboardQuery.error} retry={refresh} /> : null}

      {dashboardQuery.data ? <>
        <Section title="Cần chú ý trước">
          {attentionItems.length ? <View style={{ gap: 12 }}>{attentionItems.map((item) => <AttentionCard key={item.id} item={item} sla={slaQuery.data?.byIncidentId[item.id]} />)}</View>
            : <QueryState empty="Hiện không có sự vụ cần bạn xử lý." retry={refresh} />}
        </Section>

        <Section title="Nhịp công việc">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
            {metrics.map((item) => <MetricLink key={item.status} {...item} value={String(metricCounts[normalizeKey(item.status)] || 0)} columns={metricColumns} />)}
          </View>
        </Section>

        <Section title="SLA theo sự vụ">
          {activeIncidents.length ? <SlaOverview activeCount={activeIncidents.length} data={slaQuery.data} error={slaQuery.error} pending={slaQuery.isPending} retry={() => { void slaQuery.refetch(); }} stacked={stacked} />
            : <Notice>Chưa có sự vụ đang hoạt động để theo dõi SLA.</Notice>}
        </Section>

        <Section title="Truy cập nhanh"><View style={{ ...panelStyle, padding: 0, gap: 0, overflow: 'hidden' }}>{shortcuts.map((item, index) => <Shortcut key={item.title} item={item} last={index === shortcuts.length - 1} />)}</View></Section>
      </> : null}
    </StaffScrollView>
  </>;
}
