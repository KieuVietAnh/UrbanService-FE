import React, { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, RefreshControl, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { canTransitionProviderReportStatus, normalizeProviderReportStatus } from '@urbanmind/shared-api';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuthStore } from '@/features/auth';
import { canAccessMobileWorkspace } from '@/features/auth/mobile-access';
import { staffApi, staffError, staffKeys } from '../staff-api';
import { asRecord, formatDate, recordCode } from '../staff-models';
import { executionApi, executionKeys } from '../staff-execution-api';
import { canEditIncidentExecution, sameIncident, type ProviderCandidate } from '../staff-execution-models';
import { BackLink, Button, colors, Field, Label, Notice, PageHeading, panelStyle, QueryState, Section, Status } from './staff-ui';
import { StaffScrollView } from './staff-scroll-view';

const providerStatusLabels: Record<string, string> = { Reported: 'Đã tiếp nhận', InProgress: 'Đang thực hiện', Done: 'Hoàn thành', Failed: 'Không hoàn thành', Cancelled: 'Đã hủy' };
const providerStatusOptions = ['InProgress', 'Done', 'Failed', 'Cancelled'];
const providerStatusLabel = (status: string) => providerStatusLabels[normalizeProviderReportStatus(status)] || status || 'Chưa có trạng thái';

function localContactTime(value: string): string | null {
  if (!value.trim()) return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [day, month, year, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute ? date.toISOString() : null;
}

function Fact({ label, value }: { label: string; value?: string }) {
  return <View style={{ gap: 3 }}><Label muted size={12}>{label}</Label><Label size={14}>{value || 'Chưa có dữ liệu'}</Label></View>;
}

function Radio({ label, selected, disabled, onPress, children }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void; children: React.ReactNode }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: colors.primarySoft }} style={{ ...panelStyle, minHeight: 52, overflow: 'hidden', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface, opacity: disabled ? 0.5 : 1 }}>
    <View style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2, borderRadius: 10, borderWidth: 2, borderColor: selected ? colors.primary : colors.muted, alignItems: 'center', justifyContent: 'center' }}>{selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}</View>
    <View style={{ flex: 1, minWidth: 0, gap: 5 }}>{children}</View>
  </Pressable>;
}

function Candidate({ item, selected, disabled, onPress }: { item: ProviderCandidate; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Radio label={'Chọn đơn vị: ' + (item.providerName || item.coordinatorName)} selected={selected} disabled={disabled} onPress={onPress}>
    <Label bold>{item.providerName || 'Đơn vị chưa có tên'}</Label>
    <Label muted size={13}>{item.coordinatorName || 'Chưa có tên đầu mối'}{item.phoneNumber ? ' · ' + item.phoneNumber : ''}</Label>
    {!!item.address && <Label muted size={12}>{item.address}</Label>}
    {!!item.email && <Label muted size={12}>{item.email}</Label>}
    {!!item.contractCode && <Label size={12}>Hợp đồng: {item.contractCode}{item.contractName ? ' · ' + item.contractName : ''}</Label>}
    {item.isPrimary && <Label size={12} bold style={{ color: colors.primary }}>Đầu mối chính</Label>}
    {!!item.note && <Label muted size={12}>{item.note}</Label>}
  </Radio>;
}

function ProviderWorkspace({ id, userId }: { id: string; userId: string }) {
  const cache = useQueryClient();
  const writeLock = useRef(false);
  const [search, setSearch] = useState('');
  const [selectedCoordinator, setSelectedCoordinator] = useState<number | null>(null);
  const [assignNote, setAssignNote] = useState('');
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [contactMethod, setContactMethod] = useState('');
  const [contactResult, setContactResult] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [contactedAt, setContactedAt] = useState('');
  const [success, setSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const incidentKey = staffKeys.incident(userId, id);
  const assignmentKey = executionKeys.assignment(userId, id);
  const incidentQuery = useQuery({ queryKey: incidentKey, queryFn: ({ signal }) => staffApi.incident(id, signal), enabled: Boolean(id && userId), retry: 1 });
  const assignmentQuery = useQuery({ queryKey: assignmentKey, queryFn: ({ signal }) => executionApi.assignment(id, signal), enabled: incidentQuery.isSuccess, retry: 1 });
  const assignment = assignmentQuery.data;
  const canEditIncident = Boolean(incidentQuery.isSuccess && incidentQuery.data && canEditIncidentExecution(incidentQuery.data, userId));
  const candidatesQuery = useQuery({ queryKey: executionKeys.candidates(userId, id), queryFn: ({ signal }) => executionApi.candidates(id, signal), enabled: canEditIncident && assignmentQuery.isSuccess && assignment === null, retry: 1 });
  const contactsQuery = useQuery({ queryKey: executionKeys.contacts(userId, id, assignment?.providerAssignmentId || 0), queryFn: ({ signal }) => executionApi.contacts(assignment!.providerAssignmentId, signal), enabled: Boolean(assignmentQuery.isSuccess && assignment?.providerAssignmentId), retry: 1 });
  const refresh = useCallback(() => {
    void cache.invalidateQueries({ queryKey: staffKeys.incident(userId, id) });
    void cache.invalidateQueries({ queryKey: executionKeys.all(userId, id) });
  }, [cache, userId, id]);
  useFocusEffect(refresh);

  const refreshAfterWrite = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: executionKeys.all(userId, id) }),
      cache.invalidateQueries({ queryKey: incidentKey }),
      cache.invalidateQueries({ queryKey: ['staff', userId, 'incidents'] }),
      cache.invalidateQueries({ queryKey: ['staff', userId, 'timeline', id] }),
    ]);
  };
  const onWriteError = async (error: unknown) => {
    if (!isCurrentSession()) return;
    setSuccess('');
    const data = asRecord(error);
    const message = error instanceof Error && !data.isAxiosError && !data.response ? error.message : staffError(error);
    setActionError(message + ' Nội dung bạn nhập vẫn được giữ.');
    const status = Number(asRecord(data.response).status ?? data.status);
    if (status === 403 || status === 409) await refreshAfterWrite();
  };
  const isCurrentSession = () => {
    const currentUser = useAuthStore.getState().user;
    return Boolean(currentUser && sameIncident(currentUser.id, userId) && canAccessMobileWorkspace(currentUser, APP_ROLES.SYSTEM_STAFF));
  };
  const assertCurrentSession = () => {
    if (!isCurrentSession()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại hồ sơ bằng tài khoản nhân viên phụ trách.');
  };
  const freshAssignment = async (expectedAssignmentId?: number) => {
    // A deep link or stale tab is not authority to mutate: recheck the Incident and its assignment.
    assertCurrentSession();
    const freshIncident = await staffApi.incident(id);
    assertCurrentSession();
    cache.setQueryData(incidentKey, freshIncident);
    if (!canEditIncidentExecution(freshIncident, userId)) throw new Error('Sự vụ không còn thuộc phạm vi xử lý của bạn hoặc đã chuyển sang trạng thái chỉ xem.');
    const current = await executionApi.assignment(id);
    assertCurrentSession();
    cache.setQueryData(assignmentKey, current);
    if (expectedAssignmentId !== undefined && (!current || current.providerAssignmentId !== expectedAssignmentId || !sameIncident(current.incidentId, id))) throw new Error('Phân công đơn vị đã thay đổi. Hãy kiểm tra lại hồ sơ.');
    return current;
  };
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCoordinator) throw new Error('Vui lòng chọn đơn vị xử lý.');
      if (await freshAssignment()) throw new Error('Sự vụ đã được phân công đơn vị xử lý và không thể đổi đơn vị.');
      const candidates = await executionApi.candidates(id);
      assertCurrentSession();
      cache.setQueryData(executionKeys.candidates(userId, id), candidates);
      if (!candidates.some((item) => item.coordinatorId === selectedCoordinator)) throw new Error('Đơn vị đã chọn không còn phù hợp với sự vụ. Vui lòng chọn lại.');
      return executionApi.assign(id, { coordinatorId: selectedCoordinator, note: assignNote.trim() || undefined });
    },
    onSuccess: async (item) => {
      if (!isCurrentSession()) return;
      cache.setQueryData(assignmentKey, item);
      setConfirmAssign(false); setAssignNote(''); setSelectedCoordinator(null); setSuccess('Đã phân công đơn vị xử lý.');
      await refreshAfterWrite();
    },
    onError: onWriteError,
    onSettled: () => { writeLock.current = false; },
  });
  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error('Chưa có phân công đơn vị xử lý.');
      const current = await freshAssignment(assignment.providerAssignmentId);
      if (!current || !canTransitionProviderReportStatus(current.reportStatus, nextStatus)) throw new Error('Trạng thái đơn vị đã thay đổi hoặc không hỗ trợ bước chuyển này.');
      assertCurrentSession();
      return executionApi.updateProviderStatus(current.providerAssignmentId, { status: nextStatus, note: statusNote.trim() || undefined });
    },
    onSuccess: async (item) => {
      if (!isCurrentSession()) return;
      cache.setQueryData(assignmentKey, item);
      setNextStatus(''); setStatusNote(''); setConfirmStatus(false); setSuccess('Đã cập nhật trạng thái đơn vị.');
      await refreshAfterWrite();
    },
    onError: onWriteError,
    onSettled: () => { writeLock.current = false; },
  });
  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error('Chưa có phân công đơn vị xử lý.');
      if (!contactMethod.trim() || !contactResult.trim()) throw new Error('Vui lòng nhập phương thức và kết quả liên hệ.');
      const date = localContactTime(contactedAt);
      if (date === null) throw new Error('Thời gian liên hệ cần đúng định dạng ngày/tháng/năm giờ:phút.');
      const current = await freshAssignment(assignment.providerAssignmentId);
      assertCurrentSession();
      return executionApi.addContact(current!.providerAssignmentId, { contactMethod: contactMethod.trim(), contactResult: contactResult.trim(), contactNote: contactNote.trim() || undefined, contactedAt: date || new Date().toISOString() });
    },
    onSuccess: async () => {
      if (!isCurrentSession()) return;
      setContactMethod(''); setContactResult(''); setContactNote(''); setContactedAt(''); setSuccess('Đã lưu lịch sử liên hệ.');
      await refreshAfterWrite();
    },
    onError: onWriteError,
    onSettled: () => { writeLock.current = false; },
  });
  const busy = assignMutation.isPending || statusMutation.isPending || contactMutation.isPending;
  const canWrite = canEditIncident && assignmentQuery.isSuccess && !incidentQuery.isFetching && !assignmentQuery.isFetching && !busy;
  const selected = candidatesQuery.data?.find((item) => item.coordinatorId === selectedCoordinator);
  const filteredCandidates = candidatesQuery.data?.filter((item) => (item.providerName + ' ' + item.coordinatorName + ' ' + item.address).toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'))) || [];
  const nextStatuses = assignment ? providerStatusOptions.filter((status) => canTransitionProviderReportStatus(assignment.reportStatus, status)) : [];
  const validContactTime = localContactTime(contactedAt) !== null;
  const beginWrite = (action: () => void) => {
    if (writeLock.current || !canWrite) return;
    writeLock.current = true; setActionError(''); setSuccess(''); action();
  };
  const openContact = async (url: string) => {
    try { setActionError(''); await Linking.openURL(url); }
    catch { setActionError('Không mở được ứng dụng liên hệ. Bạn có thể sao chép số điện thoại hoặc email bên trên.'); }
  };
  const phone = assignment?.phoneNumber.replace(/[^\d+]/g, '') || '';
  const email = assignment?.email.trim() || '';
  return <>
    <Stack.Screen options={{ title: 'Đơn vị xử lý' }} />
    <StaffScrollView refreshControl={<RefreshControl refreshing={incidentQuery.isRefetching || assignmentQuery.isRefetching || contactsQuery.isRefetching} onRefresh={refresh} />}>
      <BackLink href={('/(staff)/staff/incidents/' + encodeURIComponent(id)) as Href} label="Chi tiết sự vụ" />
      <QueryState pending={incidentQuery.isPending} error={incidentQuery.error} retry={() => { void incidentQuery.refetch(); }} />
      {incidentQuery.data && <PageHeading eyebrow={recordCode(id, true)} title={incidentQuery.data.title} accessory={<Status value={incidentQuery.data.status} />} description="Phân công và theo dõi đơn vị phối hợp ở cấp sự vụ." />}
      {!!success && <Notice>{success}</Notice>}
      {!!actionError && <Notice error>{actionError}</Notice>}
      {incidentQuery.isSuccess && !canEditIncident && <Notice>Sự vụ không được giao cho bạn hoặc không ở trạng thái cho phép cập nhật. Bạn chỉ có thể xem thông tin đơn vị.</Notice>}
      {incidentQuery.isSuccess && <QueryState pending={assignmentQuery.isPending} error={assignmentQuery.error} retry={() => { void assignmentQuery.refetch(); }} />}
      {assignmentQuery.isSuccess && assignment === null && <Section title="Chọn đơn vị xử lý">
        <Notice>Mỗi sự vụ chỉ được phân công một đơn vị xử lý. Sau khi xác nhận, bạn không thể đổi đơn vị.</Notice>
        {!canEditIncident ? <Label muted>Chưa có đơn vị được phân công.</Label> : <>
          <Label muted size={13}>Danh sách phù hợp với khu vực và danh mục do máy chủ cung cấp.</Label>
          <Field label="Tìm đơn vị xử lý" placeholder="Tên đơn vị hoặc đầu mối…" value={search} onChangeText={setSearch} editable={!busy && !confirmAssign} />
          <QueryState pending={candidatesQuery.isPending} error={candidatesQuery.error} empty={!candidatesQuery.isPending && !candidatesQuery.error && !filteredCandidates.length && (search.trim() ? 'Không có đơn vị phù hợp với từ khóa.' : 'Chưa có đơn vị phù hợp với sự vụ.')} retry={() => { void candidatesQuery.refetch(); }} />
          <View accessibilityRole="radiogroup" accessibilityLabel="Đơn vị xử lý phù hợp" style={{ gap: 10 }}>{filteredCandidates.map((item) => <Candidate key={item.coordinatorId} item={item} selected={selectedCoordinator === item.coordinatorId} disabled={!canWrite || confirmAssign} onPress={() => { setSelectedCoordinator(item.coordinatorId); setActionError(''); }} />)}</View>
          {!!selected && <>
            <Field label="Ghi chú phân công" placeholder="Thông tin cần lưu ý cho đơn vị…" value={assignNote} onChangeText={setAssignNote} multiline editable={!busy && !confirmAssign} />
            {confirmAssign ? <View style={panelStyle}><Label bold>Xác nhận phân công</Label><Label>{selected.providerName} · {selected.coordinatorName || 'Đầu mối xử lý'}</Label><Label muted size={13}>Đây là phân công duy nhất của sự vụ và không thể đổi đơn vị.</Label><Button label="Xác nhận phân công" busy={assignMutation.isPending} disabled={!canWrite || candidatesQuery.isFetching || candidatesQuery.isError} onPress={() => beginWrite(() => assignMutation.mutate())} /><Button secondary label="Chọn lại đơn vị" disabled={busy} onPress={() => setConfirmAssign(false)} /></View> : <Button label="Phân công đơn vị" disabled={!canWrite || candidatesQuery.isFetching || candidatesQuery.isError} onPress={() => { setActionError(''); setConfirmAssign(true); }} />}
          </>}
        </>}
      </Section>}
      {assignment && <>
        <Section title="Phân công hiện tại"><View style={panelStyle}>
          <Label size={20} bold>{assignment.providerName || 'Đơn vị chưa có tên'}</Label>
          <Fact label="Đầu mối điều phối" value={assignment.coordinatorName} />
          <Fact label="Điện thoại" value={assignment.phoneNumber} /><Fact label="Email" value={assignment.email} /><Fact label="Địa chỉ" value={assignment.address} />
          <Fact label="Người phân công" value={assignment.assignedByStaffUserName} /><Fact label="Phân công lúc" value={formatDate(assignment.assignedAt)} />
          {!!assignment.note && <Fact label="Ghi chú phân công" value={assignment.note} />}
          <Label muted size={12}>Đơn vị đã được phân công cho sự vụ và không thể thay đổi.</Label>
          {(/^\+?\d{6,15}$/.test(phone) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) && <View style={{ gap: 8 }}>
            {/^[+]?\d{6,15}$/.test(phone) && <Button secondary label="Gọi đầu mối điều phối" onPress={() => { void openContact('tel:' + phone); }} />}
            {/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && <Button secondary label="Email đầu mối điều phối" onPress={() => { void openContact('mailto:' + encodeURIComponent(email)); }} />}
          </View>}
        </View></Section>
        <Section title="Trạng thái đơn vị">
          <View style={{ ...panelStyle, gap: 10 }}><Label bold style={{ color: colors.primary }}>{providerStatusLabel(assignment.reportStatus)}</Label><Fact label="Cập nhật" value={formatDate(assignment.updatedAt)} />{!!assignment.reportNote && <Fact label="Ghi chú trạng thái" value={assignment.reportNote} />}<Fact label="Hạn dự kiến của đơn vị" value={formatDate(assignment.dueDate)} /></View>
          <Label muted size={13}>Trạng thái này chỉ phản ánh tiến độ của đơn vị; không tự thay đổi trạng thái hay duyệt kết quả sự vụ.</Label>
          {canEditIncident && nextStatuses.length > 0 ? <>
            <View accessibilityRole="radiogroup" accessibilityLabel="Trạng thái mới của đơn vị" style={{ gap: 8 }}>{nextStatuses.map((status) => <Radio key={status} label={'Trạng thái: ' + providerStatusLabel(status)} selected={nextStatus === status} disabled={!canWrite || confirmStatus} onPress={() => { setNextStatus(status); setActionError(''); }}><Label bold size={14}>{providerStatusLabel(status)}</Label></Radio>)}</View>
            <Field label="Ghi chú trạng thái" value={statusNote} onChangeText={setStatusNote} multiline placeholder="Tiến độ, kết quả hoặc lý do cập nhật…" editable={!busy && !confirmStatus} />
            {confirmStatus ? <View style={panelStyle}><Label bold>Xác nhận cập nhật trạng thái</Label><Label>{providerStatusLabel(assignment.reportStatus)} → {providerStatusLabel(nextStatus)}</Label><Label muted size={13}>Kiểm tra trạng thái và ghi chú trước khi lưu. Các trạng thái kết thúc không có bước chuyển tiếp.</Label><Button label="Xác nhận cập nhật trạng thái" busy={statusMutation.isPending} disabled={!canWrite || !nextStatuses.includes(nextStatus)} onPress={() => beginWrite(() => statusMutation.mutate())} /><Button secondary label="Quay lại trạng thái" disabled={busy} onPress={() => setConfirmStatus(false)} /></View> : <Button label="Cập nhật trạng thái đơn vị" disabled={!canWrite || !nextStatuses.includes(nextStatus)} onPress={() => { setActionError(''); setConfirmStatus(true); }} />}
          </> : <Label muted size={13}>{['Done', 'Failed', 'Cancelled'].includes(normalizeProviderReportStatus(assignment.reportStatus)) ? 'Đơn vị đã ở trạng thái kết thúc. Thông tin được giữ lại để tra cứu.' : 'Không có bước chuyển trạng thái phù hợp để thực hiện trên màn hình này.'}</Label>}
        </Section>
        {canEditIncident && <Section title="Ghi nhận liên hệ">
          <Label muted size={13}>Lưu lại trao đổi với đầu mối để các nhân sự liên quan có thể theo dõi.</Label>
          <Field label="Phương thức liên hệ" value={contactMethod} onChangeText={setContactMethod} placeholder="Gọi điện, email, gặp trực tiếp…" editable={!busy} />
          <Field label="Kết quả liên hệ" value={contactResult} onChangeText={setContactResult} placeholder="Ví dụ: đã thống nhất lịch kiểm tra" editable={!busy} />
          <Field label="Nội dung liên hệ" value={contactNote} onChangeText={setContactNote} multiline placeholder="Thông tin đã trao đổi và bước tiếp theo…" editable={!busy} />
          <Field label="Thời gian liên hệ" value={contactedAt} onChangeText={setContactedAt} placeholder="dd/MM/yyyy HH:mm" editable={!busy} maxLength={16} />
          <Label muted size={12}>Theo giờ địa phương trên thiết bị. Để trống để ghi nhận thời điểm lưu.</Label>
          {!validContactTime && <Notice error>Thời gian chưa hợp lệ. Dùng định dạng ngày/tháng/năm giờ:phút, ví dụ 01/09/2026 14:30.</Notice>}
          <Button label="Lưu liên hệ" busy={contactMutation.isPending} disabled={!canWrite || !contactsQuery.isSuccess || contactsQuery.isFetching || !contactMethod.trim() || !contactResult.trim() || !validContactTime} onPress={() => beginWrite(() => contactMutation.mutate())} />
        </Section>}
        <Section title="Lịch sử liên hệ">
          <QueryState pending={contactsQuery.isPending} error={contactsQuery.error} empty={!contactsQuery.isPending && !contactsQuery.error && !contactsQuery.data?.length && 'Chưa có lịch sử liên hệ với đơn vị.'} retry={() => { void contactsQuery.refetch(); }} />
          {contactsQuery.data?.map((item) => <View key={item.contactLogId} style={panelStyle}><Label muted size={12}>{formatDate(item.contactedAt)}</Label><Label bold>{item.contactMethod || 'Liên hệ đơn vị'}</Label><Fact label="Kết quả" value={item.contactResult} />{!!item.contactNote && <Fact label="Nội dung" value={item.contactNote} />}<Label muted size={12}>{item.contactedByUserName || 'Chưa có người ghi nhận'}{item.coordinatorName ? ' · ' + item.coordinatorName : ''}</Label></View>)}
        </Section>
      </>}
    </StaffScrollView>
  </>;
}

export function StaffProviderScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const userId = useAuthStore((state) => state.user?.id || '');
  return <ProviderWorkspace key={userId + ':' + id} id={id} userId={userId} />;
}
