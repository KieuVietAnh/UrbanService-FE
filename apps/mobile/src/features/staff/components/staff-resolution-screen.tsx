import React, { useCallback, useRef, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuthStore } from '@/features/auth';
import { canAccessMobileWorkspace } from '@/features/auth/mobile-access';
import { staffApi, staffError, staffKeys } from '../staff-api';
import { executionApi, executionKeys } from '../staff-execution-api';
import { canEditIncidentExecution, incidentResolutionSubmissionMode, sameIncident, type CompletionEvidence, type EvidenceUploadAsset } from '../staff-execution-models';
import { formatDate, normalizeKey, recordCode } from '../staff-models';
import { BackLink, Button, colors, Field, Label, NavigationRow, Notice, PageHeading, panelStyle, QueryState, Section, Segments, Status } from './staff-ui';
import { StaffScrollView } from './staff-scroll-view';

type ResolutionTab = 'evidence' | 'form' | 'history';
const tabs: { value: ResolutionTab; label: string }[] = [
  { value: 'evidence', label: 'Minh chứng' }, { value: 'form', label: 'Gửi kết quả' }, { value: 'history', label: 'Đã gửi' },
];
const isImage = (file: CompletionEvidence) => /^image(?:\/|$)/i.test(file.fileType) || /\.(jpe?g|png|webp|heic)(?:[?#]|$)/i.test(file.fileUrl);
const isSelectedImage = (file: EvidenceUploadAsset) => /^image(?:\/|$)/i.test(file.mimeType || '') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);

function EvidenceCard({ file }: { file: CompletionEvidence }) {
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const safeUrl = /^https?:\/\//i.test(file.fileUrl);
  const open = async () => {
    if (!safeUrl) return;
    try { setError(''); await Linking.openURL(file.fileUrl); } catch { setError('Không mở được minh chứng. Vui lòng thử lại.'); }
  };
  return <View style={panelStyle}>
    {safeUrl && isImage(file) && !failed && <Image accessibilityLabel={file.description || 'Ảnh minh chứng đã tải lên'} source={{ uri: file.fileUrl }} resizeMode="cover" style={{ width: '100%', aspectRatio: 1.5, borderRadius: 12, backgroundColor: colors.borderLight }} onError={() => setFailed(true)} />}
    <Label bold size={14}>{file.description || 'Minh chứng #' + file.completionDocumentId}</Label>
    <Label muted size={12}>{file.uploadedByUserName || 'Nhân viên'} · {formatDate(file.receivedAt)}</Label>
    {error ? <Notice error>{error}</Notice> : null}
    {safeUrl ? <Button secondary label={'Mở minh chứng #' + file.completionDocumentId} onPress={() => { void open(); }} /> : <Label muted size={12}>Liên kết tệp chưa khả dụng.</Label>}
  </View>;
}

function ResolutionWorkspace({ id, userId }: { id: string; userId: string }) {
  const cache = useQueryClient();
  const scroll = useRef<ScrollView>(null);
  const operation = useRef(false);
  const [tab, setTab] = useState<ResolutionTab>('evidence');
  const [assets, setAssets] = useState<EvidenceUploadAsset[]>([]);
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [action, setAction] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'clear' | 'submit' | 'picker' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittedStatus, setSubmittedStatus] = useState('');
  const incident = useQuery({ queryKey: staffKeys.incident(userId, id), queryFn: ({ signal }) => staffApi.incident(id, signal), enabled: !!id && !!userId, retry: 1 });
  const readable = incident.isSuccess && !incident.error;
  const assignment = useQuery({ queryKey: executionKeys.assignment(userId, id), queryFn: ({ signal }) => executionApi.assignment(id, signal), enabled: readable, retry: 1 });
  const assignmentId = assignment.data?.providerAssignmentId || 0;
  const checkEvidence = (files: CompletionEvidence[]) => {
    if (files.some((file) => !sameIncident(file.incidentId, id))) throw new Error('Minh chứng trả về không thuộc sự vụ này. Vui lòng tải lại.');
    return files;
  };
  const evidence = useQuery({ queryKey: executionKeys.evidence(userId, id, assignmentId), queryFn: async ({ signal }) => checkEvidence(await executionApi.evidence(assignmentId, signal)), enabled: readable && assignment.isSuccess && assignmentId > 0, retry: 1 });
  const history = useQuery({ queryKey: executionKeys.resolutions(userId, id), queryFn: ({ signal }) => executionApi.resolutions(id, signal), enabled: readable, retry: 1 });
  const refresh = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['staff', userId] });
  }, [cache, userId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const item = incident.data;
  const assignmentReady = assignment.isSuccess && !assignment.error;
  const evidenceReady = !assignmentId || (evidence.isSuccess && !evidence.error);
  const currentStatus = normalizeKey(item?.status);
  const submittedForCurrentStatus = !!currentStatus && submittedStatus === currentStatus;
  const submissionMode = readable && item && history.isSuccess && !history.error
    ? incidentResolutionSubmissionMode(item, userId, history.data.length) : null;
  const canEdit = readable && !!item && canEditIncidentExecution(item, userId) && !submittedForCurrentStatus;
  const canSubmit = !!submissionMode && !submittedForCurrentStatus && assignmentReady && evidenceReady;
  const canClearEvidence = canEdit && currentStatus === 'needrework' && assignmentReady && assignmentId > 0
    && evidenceReady && !!evidence.data?.length;
  const submissionUnavailableMessage = item && !sameIncident(item.assignedStaffUserId, userId)
    ? 'Chỉ nhân viên đang phụ trách mới được gửi kết quả.'
    : currentStatus === 'assigned'
      ? 'Bắt đầu xử lý tại màn chi tiết sự vụ trước khi gửi kết quả.'
      : currentStatus === 'inprogress' && !!history.data?.length
        ? 'Kết quả lần đầu đã được lưu trong mục “Đã gửi”; chờ Manager duyệt hoặc yêu cầu xử lý lại.'
        : submittedForCurrentStatus
          ? 'Kết quả vừa gửi được lưu trong mục “Đã gửi”. Làm mới để lấy trạng thái mới nhất.'
          : 'Trạng thái hiện tại không cho phép gửi kết quả. Làm mới để kiểm tra dữ liệu mới nhất.';
  const isCurrentSession = () => {
    const currentUser = useAuthStore.getState().user;
    return !!currentUser && sameIncident(currentUser.id, userId) && canAccessMobileWorkspace(currentUser, APP_ROLES.SYSTEM_STAFF);
  };
  const requireSession = () => {
    if (!isCurrentSession()) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng mở lại sự vụ bằng tài khoản nhân viên phụ trách.');
  };
  const requireCurrentOwner = async () => {
    requireSession();
    const latest = await staffApi.incident(id);
    requireSession();
    cache.setQueryData(staffKeys.incident(userId, id), latest);
    if (!canEditIncidentExecution(latest, userId)) {
      throw new Error('Sự vụ không còn ở trạng thái hoặc phạm vi cho phép thao tác. Nội dung bạn nhập vẫn được giữ.');
    }
    const current = await executionApi.assignment(id);
    requireSession();
    cache.setQueryData(executionKeys.assignment(userId, id), current);
    if ((current?.providerAssignmentId || 0) !== assignmentId) throw new Error('Phân công đơn vị vừa thay đổi. Hãy kiểm tra dữ liệu mới trước khi gửi.');
    return { latest, current };
  };
  const messageFor = (value: unknown) => value instanceof Error && !('response' in value) && !('status' in value) ? value.message : staffError(value);
  const pickImages = async () => {
    if (!canEdit || !assignmentReady || !assignmentId || operation.current) return;
    operation.current = true; setBusy('picker'); setError(''); setSuccess('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
      if (isCurrentSession() && !result.canceled) setAssets((previous) => [...previous, ...result.assets.map((asset, index) => ({ uri: asset.uri, name: asset.fileName || 'minh-chung-' + Date.now() + '-' + index + '.jpg', mimeType: asset.mimeType || 'image/jpeg', file: asset.file }))].filter((asset, index, all) => all.findIndex((other) => other.uri === asset.uri) === index));
    } catch { setError('Không mở được thư viện ảnh. Hãy kiểm tra quyền truy cập ảnh và thử lại.'); }
    finally { operation.current = false; setBusy(null); }
  };
  const pickDocuments = async () => {
    if (!canEdit || !assignmentReady || !assignmentId || operation.current) return;
    operation.current = true; setBusy('picker'); setError(''); setSuccess('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
      if (isCurrentSession() && !result.canceled) {
        setAssets((previous) => [...previous, ...result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || undefined, file: asset.file }))]
          .filter((asset, index, all) => all.findIndex((other) => other.uri === asset.uri) === index));
      }
    } catch { setError('Không mở được trình chọn tài liệu. Hãy thử lại hoặc chọn ảnh từ thư viện.'); }
    finally { operation.current = false; setBusy(null); }
  };
  const upload = async () => {
    if (!canEdit || !assignmentReady || !assignmentId || !assets.length || operation.current) return;
    operation.current = true; setBusy('upload'); setError(''); setSuccess('');
    try {
      await requireCurrentOwner();
      const uploaded = checkEvidence(await executionApi.uploadEvidence(assignmentId, assets, description));
      if (!isCurrentSession()) return;
      if (!uploaded.length) throw new Error('Máy chủ chưa trả về minh chứng đã lưu. Kiểm tra danh sách trước khi tải lại để tránh trùng tệp.');
      setAssets([]); setDescription(''); setSuccess('Đã tải minh chứng lên.');
      await refresh();
    } catch (value) { if (isCurrentSession()) { setError(messageFor(value) + ' Tệp đã chọn và mô tả vẫn được giữ.'); void refresh(); } }
    finally { operation.current = false; setBusy(null); }
  };
  const clearEvidence = async () => {
    if (!canClearEvidence || operation.current) return;
    operation.current = true; setBusy('clear'); setError(''); setSuccess('');
    try {
      const { latest, current } = await requireCurrentOwner();
      if (normalizeKey(latest.status) !== 'needrework') {
        throw new Error('Chỉ được xóa toàn bộ minh chứng khi Manager đang yêu cầu xử lý lại. Nội dung bạn nhập vẫn được giữ.');
      }
      if (!current || current.providerAssignmentId !== assignmentId) {
        throw new Error('Phân công đơn vị vừa thay đổi. Hãy kiểm tra dữ liệu mới trước khi xóa minh chứng.');
      }
      await executionApi.clearEvidence(current.providerAssignmentId);
      requireSession();
      cache.setQueryData(executionKeys.evidence(userId, id, assignmentId), []);
      setConfirmingClear(false);
      setSuccess('Đã xóa toàn bộ minh chứng cũ. Tệp đang chọn và nội dung kết quả vẫn được giữ.');
      await refresh();
    } catch (value) {
      if (isCurrentSession()) {
        setConfirmingClear(false);
        setError(messageFor(value) + ' Tệp đang chọn và nội dung kết quả vẫn được giữ.');
        void refresh();
      }
    } finally { operation.current = false; setBusy(null); }
  };
  const previewSubmission = () => {
    setError(''); setSuccess('');
    if (!summary.trim()) { setError('Vui lòng nhập tóm tắt kết quả.'); return; }
    if (assets.length) { setError('Bạn còn tệp chưa tải lên. Hãy tải minh chứng hoặc bỏ tệp đã chọn trước khi gửi.'); return; }
    setConfirming(true);
  };
  const submit = async () => {
    if (!canSubmit || !summary.trim() || assets.length || operation.current) return;
    operation.current = true; setBusy('submit'); setError(''); setSuccess('');
    try {
      const { latest, current } = await requireCurrentOwner();
      const existing = await executionApi.resolutions(id);
      requireSession();
      cache.setQueryData(executionKeys.resolutions(userId, id), existing);
      const latestMode = incidentResolutionSubmissionMode(latest, userId, existing.length);
      if (!latestMode) {
        if (normalizeKey(latest.status) === 'inprogress' && existing.length) {
          throw new Error('Sự vụ đã có kết quả được gửi. Không thể gửi trùng kết quả lần đầu; hãy chờ Manager duyệt hoặc yêu cầu xử lý lại.');
        }
        throw new Error('Sự vụ không còn ở trạng thái cho phép gửi kết quả.');
      }
      const files = current ? checkEvidence(await executionApi.evidence(current.providerAssignmentId)) : [];
      requireSession();
      await executionApi.submitResolution(id, { ...(current ? { providerAssignmentId: current.providerAssignmentId } : {}), resolutionSummary: summary.trim(), actionTaken: action.trim(), resultNote: note.trim(), imageUrls: files.filter(isImage).map((file) => file.fileUrl).filter((url) => /^https?:\/\//i.test(url)) });
      if (!isCurrentSession()) return;
      setSubmittedStatus(normalizeKey(latest.status)); setConfirming(false); setSummary(''); setAction(''); setNote('');
      setSuccess(latestMode === 'resubmit' ? 'Đã gửi lại kết quả cho Manager duyệt.' : 'Đã gửi kết quả cho Manager duyệt.'); setTab('history'); scroll.current?.scrollTo({ y: 0, animated: false });
      await refresh();
    } catch (value) { if (isCurrentSession()) { setError(messageFor(value) + ' Nội dung vẫn được giữ; kiểm tra lịch sử trước khi gửi lại nếu kết nối bị gián đoạn.'); setConfirming(false); void refresh(); } }
    finally { operation.current = false; setBusy(null); }
  };

  return <>
    <Stack.Screen options={{ title: 'Minh chứng & kết quả' }} />
    <StaffScrollView ref={scroll} refreshControl={<RefreshControl refreshing={incident.isRefetching || assignment.isRefetching || evidence.isRefetching || history.isRefetching} onRefresh={() => { if (!operation.current) void refresh(); }} />}>
      <BackLink href={('/(staff)/staff/incidents/' + encodeURIComponent(id)) as Href} label="Chi tiết sự vụ" />
      <QueryState pending={incident.isPending} error={incident.error} retry={() => { void incident.refetch(); }} />
      {readable && item && <>
        <PageHeading eyebrow={recordCode(id, true)} title={item.title} accessory={<Status value={item.status} />} />
        <Segments options={tabs} value={tab} disabled={!!busy} onChange={(value) => { setTab(value); setConfirming(false); setConfirmingClear(false); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
        {error ? <Notice error>{error}</Notice> : null}
        {success ? <Notice>{success}</Notice> : null}
        {!canEdit && <Notice>{!sameIncident(item.assignedStaffUserId, userId) ? 'Chỉ nhân viên đang phụ trách mới được cập nhật. Bạn đang xem dữ liệu ở chế độ chỉ đọc.' : 'Sự vụ hiện ở chế độ chỉ đọc. Bạn có thể xem minh chứng và các kết quả đã gửi.'}</Notice>}
        {tab === 'evidence' && <>
          <Section title="Minh chứng xử lý">
            <Label muted size={14}>Ảnh và tài liệu PDF được lưu vào phân công đơn vị xử lý của chính sự vụ này.</Label>
            <QueryState pending={assignment.isPending} error={assignment.error} retry={() => { void assignment.refetch(); }} />
            {assignmentReady && !assignment.data && <><Notice>Chưa có đơn vị xử lý. Phân công đơn vị trước khi tải minh chứng.</Notice><NavigationRow href={('/(staff)/staff/incidents/' + encodeURIComponent(id) + '/provider') as Href} label="Chọn đơn vị xử lý" icon="account" /></>}
            {assignmentReady && assignment.data && <>
              <Label bold size={15}>{assignment.data.providerName || 'Đơn vị xử lý'} · #{assignmentId}</Label>
              {canEdit && <View style={panelStyle}>
                <Button secondary label="Chọn ảnh minh chứng" onPress={() => { void pickImages(); }} disabled={!!busy} busy={busy === 'picker'} />
                <Button secondary label="Chọn tài liệu PDF" onPress={() => { void pickDocuments(); }} disabled={!!busy} />
                {assets.map((asset, index) => <View key={asset.uri} style={{ gap: 8 }}>{isSelectedImage(asset) ? <Image accessibilityLabel={'Ảnh đã chọn ' + (index + 1)} source={{ uri: asset.uri }} style={{ width: '100%', aspectRatio: 1.6, borderRadius: 12 }} /> : <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.borderLight, gap: 4 }}><Label bold size={14}>Tài liệu PDF</Label><Label size={12} muted>{asset.name}</Label></View>}<Button secondary label={'Bỏ tệp đã chọn ' + (index + 1)} disabled={!!busy} onPress={() => setAssets((previous) => previous.filter((_, assetIndex) => assetIndex !== index))} /></View>)}
                <Field label="Mô tả minh chứng" multiline value={description} onChangeText={setDescription} editable={!busy} placeholder="Vị trí, tình trạng sau xử lý…" />
                <Label size={12} muted>{assets.length ? assets.length + ' tệp đang chờ tải lên.' : 'Chọn ảnh hoặc tài liệu rồi tải lên trước khi gửi kết quả.'}</Label>
                <Button label="Tải minh chứng lên" disabled={!assets.length || !!busy} busy={busy === 'upload'} onPress={() => { void upload(); }} />
              </View>}
              <QueryState pending={evidence.isPending} error={evidence.error} empty={evidence.isSuccess && !evidence.data?.length && 'Chưa có minh chứng đã tải lên.'} retry={() => { void evidence.refetch(); }} />
              {evidence.data?.map((file) => <EvidenceCard key={file.completionDocumentId} file={file} />)}
              {canClearEvidence && (confirmingClear ? <View style={{ ...panelStyle, borderColor: colors.redDark, backgroundColor: colors.redLight }}>
                <Label bold style={{ color: colors.redDark }}>Xóa toàn bộ minh chứng cũ?</Label>
                <Label size={14}>Thao tác này xóa tất cả tệp đã lưu của phân công hiện tại và không thể hoàn tác. Tệp đang chọn trên thiết bị cùng nội dung ở biểu mẫu kết quả sẽ không bị xóa.</Label>
                <Button danger label="Xác nhận xóa toàn bộ" busy={busy === 'clear'} disabled={!!busy} onPress={() => { void clearEvidence(); }} />
                <Button secondary label="Giữ lại minh chứng" disabled={!!busy} onPress={() => setConfirmingClear(false)} />
              </View> : <Button danger label="Xóa toàn bộ minh chứng cũ" disabled={!!busy} onPress={() => { setError(''); setSuccess(''); setConfirmingClear(true); }} />)}
            </>}
          </Section>
        </>}
        {tab === 'form' && <Section title="Kết quả xử lý">
          <Label muted size={14}>Tóm tắt công việc đã hoàn thành để Manager xem xét. Gửi kết quả không tự phê duyệt hoặc đóng sự vụ.</Label>
          {normalizeKey(item.status) === 'needrework' ? <Notice>Manager đã yêu cầu xử lý lại. Bổ sung nội dung hoặc minh chứng cần thiết rồi gửi một kết quả mới; các lần gửi trước vẫn được giữ trong mục “Đã gửi”.</Notice> : normalizeKey(item.status) === 'assigned' ? <Notice>Hãy dùng thao tác “Bắt đầu xử lý” tại màn chi tiết sự vụ trước khi gửi kết quả.</Notice> : null}
          <QueryState pending={assignment.isPending || history.isPending || (!!assignmentId && evidence.isPending)} error={assignment.error || history.error || (assignmentId ? evidence.error : null)} retry={() => { void refresh(); }} />
          {!!history.data?.length && normalizeKey(item.status) === 'inprogress' && <Notice>Sự vụ đã có kết quả lần đầu. Không thể gửi trùng khi đang chờ trạng thái mới; xem mục “Đã gửi” để kiểm tra nội dung.</Notice>}
          {canSubmit && <>
            <Field label="Tóm tắt kết quả" multiline value={summary} onChangeText={setSummary} editable={!busy && !confirming} placeholder="Kết quả xử lý sự vụ…" />
            <Field label="Công việc đã thực hiện" multiline value={action} onChangeText={setAction} editable={!busy && !confirming} placeholder="Các bước kiểm tra, sửa chữa…" />
            <Field label="Ghi chú kết quả" multiline value={note} onChangeText={setNote} editable={!busy && !confirming} placeholder="Thông tin bổ sung (không bắt buộc)" />
            <Label muted size={13}>{assignment.data ? 'Đơn vị: ' + (assignment.data.providerName || '#' + assignmentId) + ' · ' + (evidence.data?.length || 0) + ' minh chứng đã lưu.' : 'Chưa phân công đơn vị. Kết quả sẽ được gửi trực tiếp theo Incident.'}</Label>
            {confirming ? <View style={panelStyle}><Label bold>{submissionMode === 'resubmit' ? 'Xác nhận gửi lại cho Manager' : 'Xác nhận gửi Manager'}</Label><Label size={14}>Kiểm tra nội dung và ảnh đã lưu. Sau khi gửi, kết quả sẽ chờ Manager xem xét.</Label><Button label={submissionMode === 'resubmit' ? 'Xác nhận gửi lại kết quả' : 'Xác nhận gửi kết quả'} busy={busy === 'submit'} disabled={!!busy} onPress={() => { void submit(); }} /><Button secondary label="Quay lại chỉnh sửa" disabled={!!busy} onPress={() => setConfirming(false)} /></View> : <Button label={submissionMode === 'resubmit' ? 'Gửi lại kết quả cho Manager' : 'Gửi kết quả cho Manager'} disabled={!!busy} onPress={previewSubmission} />}
          </>}
          {!canSubmit && !incident.isFetching && !assignment.isPending && !history.isPending && (!assignmentId || !evidence.isPending) && <Label muted size={13}>{submissionUnavailableMessage}</Label>}
        </Section>}
        {tab === 'history' && <Section title="Lịch sử kết quả">
          <QueryState pending={history.isPending} error={history.error} empty={history.isSuccess && !history.data?.length && 'Chưa có kết quả xử lý được gửi.'} retry={() => { void history.refetch(); }} />
          {history.data?.map((resolution) => <View key={resolution.resolutionId} style={panelStyle}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}><Label bold size={14}>Kết quả #{resolution.resolutionId}</Label><Status value={resolution.status} /></View>
            <Label bold size={17}>{resolution.resolutionSummary || 'Chưa có tóm tắt'}</Label>
            <Label muted size={12}>{resolution.createdByStaffUserName || 'Nhân viên'} · {formatDate(resolution.resolvedAt)}</Label>
            {resolution.actionTaken ? <><Label muted size={12}>Công việc đã thực hiện</Label><Label size={14}>{resolution.actionTaken}</Label></> : null}
            {resolution.resultNote ? <><Label muted size={12}>Ghi chú kết quả của Staff</Label><Label size={14}>{resolution.resultNote}</Label></> : null}
            {resolution.completionDocuments.map((file) => <EvidenceCard key={file.completionDocumentId} file={file} />)}
          </View>)}
        </Section>}
      </>}
    </StaffScrollView>
  </>;
}

export function StaffResolutionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const userId = useAuthStore((state) => state.user?.id || '');
  return <ResolutionWorkspace key={userId + ':' + id} id={id} userId={userId} />;
}
