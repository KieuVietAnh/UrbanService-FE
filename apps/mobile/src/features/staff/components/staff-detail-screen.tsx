import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useIsFetching, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuthStore } from '@/features/auth';
import { canAccessMobileWorkspace } from '@/features/auth/mobile-access';
import { staffApi, staffError, staffKeys } from '../staff-api';
import { executionApi, executionKeys } from '../staff-execution-api';
import { canStartIncidentProcessing, sameIncident } from '../staff-execution-models';
import { asText, formatConfidence, formatDate, linkMethodLabel, linkRoleLabel, normalizeKey, priorityLabel, recordCode, severityLabel, type StaffRecord } from '../staff-models';
import { BackLink, Button, colors, Label, NavigationRow, Notice, PageHeading, Pagination, panelStyle, QueryState, Section, Segments, Severity, Status } from './staff-ui';
import { StaffReportSlaSection } from './staff-report-sla-section';
import { StaffScrollView } from './staff-scroll-view';

type DetailTab = 'overview' | 'reports' | 'timeline';
const tabValue = (value?: string): DetailTab => value === 'reports' || value === 'timeline' ? value : 'overview';

function Metadata({ rows }: { rows: [string, string][] }) {
  const { width, fontScale } = useWindowDimensions();
  const columns = width / fontScale >= 600;
  return <View style={{ gap: 18, flexDirection: 'row', flexWrap: 'wrap' }}>{rows.map(([label, value]) => <View key={label} style={{ gap: 4, width: columns ? '47%' : '100%', minWidth: 0 }}><Label size={12} muted>{label}</Label><Label size={14}>{value || 'Chưa có dữ liệu'}</Label></View>)}</View>;
}

function IncidentTimeline({ id }: { id: string }) {
  const userId = useAuthStore((state) => state.user?.id || '');
  const [pageNumber, setPageNumber] = useState(1);
  const query = useQuery({ queryKey: staffKeys.timeline(userId, id, pageNumber), queryFn: ({ signal }) => staffApi.timeline(id, pageNumber, signal), retry: 1 });
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  return <Section title="Lịch sử sự vụ">
    <Label muted size={13}>Các hoạt động do hệ thống ghi nhận, theo dữ liệu Incident.</Label>
    <QueryState pending={query.isPending} error={query.error} empty={!query.isPending && !query.error && !query.data?.items.length && 'Chưa có hoạt động được ghi nhận.'} retry={() => { void query.refetch(); }} />
    {query.data?.items.map((event, index) => <View key={event.id || event.createdAt + '-' + index} style={{ flexDirection: 'row', gap: 14 }}>
      <View style={{ alignItems: 'center', width: 12 }}><View style={{ width: 10, height: 10, marginTop: 6, borderRadius: 5, backgroundColor: colors.primary }} /><View style={{ width: 1, flex: 1, minHeight: 70, backgroundColor: colors.border, marginTop: 6 }} /></View>
      <View style={{ flex: 1, gap: 5, paddingBottom: 18 }}><Label size={12} muted>{formatDate(event.createdAt)}</Label><Label bold>{event.title}</Label>{event.description ? <Label size={14}>{event.description}</Label> : null}<Label muted size={12}>{event.actor || 'Hệ thống'}</Label></View>
    </View>)}
    <Pagination page={query.data} busy={query.isFetching} onChange={setPageNumber} />
  </Section>;
}

function IncidentReports({ item, userId }: { item: StaffRecord; userId: string }) {
  const incomplete = item.reportCount !== null && item.reportCount !== item.reports.length;
  return <>
    <Section title="Nguồn phản ánh">
      <Label muted size={13}>Mỗi Report bổ sung thông tin cho cùng một sự vụ. Kết quả liên kết do Manager quản lý.</Label>
      {!Array.isArray(item.raw.reports) ? <Notice>Máy chủ chưa cung cấp danh sách phản ánh liên quan.</Notice> : item.reports.length === 0 ? <Label muted>Chưa có phản ánh liên quan.</Label> : null}
      {incomplete && <Notice>Máy chủ ghi nhận {item.reportCount} phản ánh, response hiện cung cấp {item.reports.length} mục.</Notice>}
      {item.reports.map((report, index) => <View key={report.linkId || report.id + '-' + index} style={panelStyle}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}><Label size={12} muted bold>{report.id ? recordCode(report.id) : 'Chưa có mã Report'}</Label><Status value={report.status} /></View>
        <Label bold size={17}>{report.title}</Label>
        <Label muted size={13}>{report.reporter || 'Chưa có người gửi'} · {report.location || 'Chưa có vị trí'}</Label>
        {report.linkStatus && <Label size={12} muted>Trạng thái liên kết: {report.linkStatus}</Label>}
        <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 }}><Metadata rows={[
          ['Cách liên kết', linkMethodLabel(report.linkMethod)], ['Vai trò liên kết', linkRoleLabel(report.linkRole)],
          ['Độ tin cậy', formatConfidence(report.confidence)], ['Liên kết lúc', formatDate(report.linkedAt)],
          ['Người liên kết', report.linkedBy], ...(report.linkReason ? [['Lý do liên kết', report.linkReason] as [string, string]] : []),
        ]} /></View>
        {report.id ? <BackLink href={('/(staff)/staff/feedbacks/' + encodeURIComponent(report.id) + '?fromIncidentId=' + encodeURIComponent(item.id)) as Href} label="Xem chi tiết Report" forward /> : <Label muted size={13}>Chưa thể mở chi tiết: response thiếu mã phản ánh.</Label>}
      </View>)}
    </Section>
    <StaffReportSlaSection userId={userId} incidentId={item.id} reports={item.reports} />
  </>;
}

function Attachments({ item }: { item: StaffRecord }) {
  const [error, setError] = useState('');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  if (!item.attachments.length) return null;
  const open = async (url: string) => { try { setError(''); await Linking.openURL(url); } catch { setError('Không mở được tệp đính kèm. Vui lòng thử lại.'); } };
  return <Section title="Tệp đính kèm">
    {error ? <Notice error>{error}</Notice> : null}
    {item.attachments.map((attachment, index) => <View key={attachment.url + '-' + index} style={{ gap: 8 }}>
      {/\.(jpe?g|png|webp)(?:[?#]|$)/i.test(attachment.url) && !failedImages.includes(attachment.url) && <Image accessibilityLabel={attachment.name} source={{ uri: attachment.url }} resizeMode="cover" style={{ width: '100%', aspectRatio: 1.5, borderRadius: 14, backgroundColor: colors.borderLight }} onError={() => setFailedImages((current) => [...current, attachment.url])} />}
      <Button secondary label={'Mở ' + attachment.name} onPress={() => { void open(attachment.url); }} />
    </View>)}
  </Section>;
}

function StartProcessingAction({ item, userId }: { item: StaffRecord; userId: string }) {
  const cache = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isCurrentSession = () => {
    const currentUser = useAuthStore.getState().user;
    return !!currentUser && sameIncident(currentUser.id, userId)
      && canAccessMobileWorkspace(currentUser, APP_ROLES.SYSTEM_STAFF);
  };
  const refreshExecutionState = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: staffKeys.incident(userId, item.id) }),
      cache.invalidateQueries({ queryKey: ['staff', userId, 'incidents'] }),
      cache.invalidateQueries({ queryKey: ['staff', userId, 'timeline', item.id] }),
      cache.invalidateQueries({ queryKey: executionKeys.all(userId, item.id) }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async () => {
      if (!isCurrentSession()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại sự vụ bằng tài khoản nhân viên phụ trách.');
      const latest = await staffApi.incident(item.id);
      if (!isCurrentSession()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại sự vụ bằng tài khoản nhân viên phụ trách.');
      cache.setQueryData(staffKeys.incident(userId, item.id), latest);
      if (!canStartIncidentProcessing(latest, userId)) {
        throw new Error('Sự vụ không còn ở trạng thái Được giao hoặc không còn được phân công cho bạn.');
      }
      const updated = await executionApi.startProcessing(item.id, { note: 'Staff bắt đầu xử lý sự vụ.' });
      if (!isCurrentSession()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại sự vụ bằng tài khoản nhân viên phụ trách.');
      return updated;
    },
    onSuccess: async (updated) => {
      cache.setQueryData(staffKeys.incident(userId, item.id), updated);
      setConfirming(false); setError(''); setSuccess('Đã bắt đầu xử lý sự vụ. Bạn có thể cập nhật đơn vị, minh chứng và kết quả.');
      await refreshExecutionState();
    },
    onError: async (value) => {
      const message = value instanceof Error && !('response' in value) && !('status' in value) ? value.message : staffError(value);
      setConfirming(false); setSuccess(''); setError(message);
      await refreshExecutionState();
    },
  });
  if (!canStartIncidentProcessing(item, userId) && !error && !success) return null;
  return <View style={{ gap: 12 }}>
    {error ? <Notice error>{error}</Notice> : null}
    {success ? <Notice>{success}</Notice> : null}
    {canStartIncidentProcessing(item, userId) && (confirming
      ? <View style={panelStyle}>
        <Label bold>Bắt đầu xử lý sự vụ?</Label>
        <Label size={14}>Trạng thái sẽ chuyển từ “Được giao” sang “Đang xử lý”. Thao tác này không tự gửi kết quả cho Manager.</Label>
        <Button label="Xác nhận bắt đầu xử lý" busy={mutation.isPending} disabled={mutation.isPending} onPress={() => mutation.mutate()} />
        <Button secondary label="Quay lại" disabled={mutation.isPending} onPress={() => setConfirming(false)} />
      </View>
      : <Button label="Bắt đầu xử lý" disabled={mutation.isPending} onPress={() => { setError(''); setSuccess(''); setConfirming(true); }} />)}
  </View>;
}

function IncidentOverview({ item, userId }: { item: StaffRecord; userId: string }) {
  return <>
    <Section title="Thông tin sự vụ"><View style={panelStyle}><Metadata rows={[
      ['Mô tả', item.description], ['Phường / Khu vực', item.areaName], ['Vị trí', item.location], ['Danh mục', item.category],
      ['Mức độ nghiêm trọng', severityLabel(item.severity)], ['Mức ưu tiên', priorityLabel(item.priority)],
      ['Nhân viên phụ trách', item.assignedStaffName], ['Ngày tạo', formatDate(item.createdAt)], ['Cập nhật', formatDate(item.updatedAt)],
      ['Phân công lúc', formatDate(asText(item.raw.assignedAt))], ['Bắt đầu xử lý lúc', formatDate(asText(item.raw.processingStartedAt))],
      ['Hạn dự kiến', formatDate(item.dueDate)],
    ]} /></View></Section>
    <Section title="Thông tin xử lý">
      {!sameIncident(item.assignedStaffUserId, userId) && <Notice>Sự vụ này chưa được xác nhận là đang phân công cho bạn.</Notice>}
      {normalizeKey(item.status) === 'needrework' && <Notice>Manager đã yêu cầu xử lý lại. Hãy bổ sung minh chứng cần thiết và gửi một kết quả mới; các lần gửi trước vẫn được giữ trong lịch sử.</Notice>}
      <StartProcessingAction item={item} userId={userId} />
      <NavigationRow href={('/(staff)/staff/incidents/' + encodeURIComponent(item.id) + '/provider') as Href} label="Đơn vị xử lý & liên hệ" description="Phân công, tiến độ và lịch sử liên hệ" icon="account" />
      <NavigationRow href={('/(staff)/staff/incidents/' + encodeURIComponent(item.id) + '/resolution') as Href} label="Minh chứng & kết quả" description="Ảnh hiện trường và kết quả gửi duyệt" icon="check" primary />
      <Label muted size={12}>SLA được tính riêng cho từng Report và hiển thị trong tab Reports. Hạn dự kiến của sự vụ không được dùng để tự suy ra cảnh báo hay vi phạm SLA.</Label>
    </Section>
  </>;
}

export function StaffDetailScreen({ incident = false }: { incident?: boolean }) {
  const params = useLocalSearchParams<{ id: string; tab?: string; fromIncidentId?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const fromIncidentId = typeof params.fromIncidentId === 'string' ? params.fromIncidentId : '';
  const userId = useAuthStore((state) => state.user?.id || '');
  const cache = useQueryClient();
  const timelineKey = ['staff', userId, 'timeline', id];
  const timelineFetching = useIsFetching({ queryKey: timelineKey });
  const scroll = useRef<ScrollView>(null);
  const [tab, setTab] = useState<DetailTab>(tabValue(params.tab));
  useEffect(() => { setTab(tabValue(params.tab)); }, [id, params.tab]);
  const query = useQuery({ queryKey: incident ? staffKeys.incident(userId, id) : staffKeys.feedback(userId, id), queryFn: ({ signal }) => incident ? staffApi.incident(id, signal) : staffApi.feedback(id, signal), retry: 1 });
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  const item = query.data;
  const tabs: { value: DetailTab; label: string }[] = [{ value: 'overview', label: 'Tổng quan' }, { value: 'reports', label: 'Reports' + (item?.reportCount !== null && item?.reportCount !== undefined ? ' (' + item.reportCount + ')' : '') }, { value: 'timeline', label: 'Lịch sử' }];
  return <>
    <Stack.Screen options={{ title: incident ? 'Chi tiết sự vụ' : 'Chi tiết Report' }} />
    <StaffScrollView ref={scroll} keyboardAware={false} refreshControl={<RefreshControl refreshing={query.isRefetching || (incident && tab === 'timeline' && timelineFetching > 0)} onRefresh={() => { void query.refetch(); if (incident) void cache.invalidateQueries({ queryKey: timelineKey }); }} />}>
      <BackLink href={'/(staff)/staff/(tabs)/incidents' as Href} label="Sự vụ của tôi" />
      <QueryState pending={query.isPending} error={query.error} retry={() => { void query.refetch(); }} />
      {item && <>
        <PageHeading eyebrow={recordCode(item.id, incident)} title={item.title} accessory={<View style={{ gap: 12 }}><Status value={item.status} />{incident && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}><Severity value={item.severity} /><Label muted size={12}>{item.reportCount !== null ? item.reportCount + ' phản ánh liên quan' : 'Chưa có số phản ánh'}</Label></View>}</View>} />
        {incident ? <>
          <Segments options={tabs} value={tab} onChange={(value) => { setTab(value); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
          {tab === 'overview' && <IncidentOverview item={item} userId={userId} />}
          {tab === 'reports' && <IncidentReports item={item} userId={userId} />}
          {tab === 'timeline' && <IncidentTimeline key={id} id={id} />}
        </> : <>
          <Notice>Report cung cấp thông tin cho sự vụ. Việc xác minh và quản lý liên kết do Manager thực hiện.</Notice>
          <Section title="Nội dung phản ánh"><Label>{item.description || 'Chưa có mô tả.'}</Label></Section>
          <Section title="Sự vụ liên quan">
            {item.incidentId ? <NavigationRow href={('/(staff)/staff/incidents/' + encodeURIComponent(item.incidentId) + '?tab=reports') as Href} label={'Xem sự vụ liên quan · ' + recordCode(item.incidentId, true)} icon="incidents" /> : <Label muted size={14}>Response chưa cung cấp sự vụ liên quan.</Label>}
            {fromIncidentId && fromIncidentId !== item.incidentId && <BackLink href={('/(staff)/staff/incidents/' + encodeURIComponent(fromIncidentId) + '?tab=reports') as Href} label="Quay lại sự vụ đã mở" />}
          </Section>
          <Section title="Thông tin Report"><View style={panelStyle}><Metadata rows={[
            ['Người phản ánh', item.reporter], ['Vị trí', item.location], ['Phường / Khu vực', item.areaName], ['Danh mục', item.category], ['Ngày gửi', formatDate(item.createdAt)],
          ]} /></View></Section>
          <StaffReportSlaSection userId={userId} incidentId={item.incidentId || `report-${item.id}`} reports={[{ id: item.id, title: item.title, status: item.status }]} />
          <Attachments key={id} item={item} />
          {(item.summary || item.confidence !== null) && <Section title="Thông tin AI"><View style={panelStyle}><Label size={14}>{item.summary || 'Chưa có tóm tắt.'}</Label><Label muted size={13}>Độ tin cậy: {formatConfidence(item.confidence)}</Label><Label muted size={12}>Kết quả tham khảo, không thay thế quyết định của Manager.</Label></View></Section>}
          <NavigationRow href={('/(staff)/staff/feedbacks/' + encodeURIComponent(id) + '/chat') as Href} label="Trao đổi với người dân / Ghi chú nội bộ" icon="chat" primary />
        </>}
      </>}
    </StaffScrollView>
  </>;
}
