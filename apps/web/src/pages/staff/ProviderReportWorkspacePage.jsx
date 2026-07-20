import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { LoadingSpinner, CompletionDocumentsCard, ConfirmationModal } from '@urbanmind/shared-ui';
import { canTransitionProviderReportStatus, normalizeProviderReportStatus } from '@urbanmind/shared-api';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import DelightToast from '../../components/delight/DelightToast';

const toLocalDateTimeValue = (date = new Date()) => {
  const pad = (value) => `${value}`.padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatContactDateTime = (value) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không xác định';
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Không xác định';
  }
};

export const ProviderReportWorkspacePage = () => {
  const { providerReportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackIdFromState = location.state?.feedbackId || location.state?.feedback?.feedbackId || null;
  const initialReport = location.state?.providerReport || location.state?.report || null;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [contactLogs, setContactLogs] = useState([]);
  const [contactLogsLoading, setContactLogsLoading] = useState(false);
  const [contactLogsError, setContactLogsError] = useState('');
  const [logForm, setLogForm] = useState({
    contactMethod: '',
    contactResult: '',
    contactNote: '',
    contactedAt: toLocalDateTimeValue(),
  });
  const [logSaving, setLogSaving] = useState(false);
  const [logFormError, setLogFormError] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [resolutionForm, setResolutionForm] = useState({
    resolutionSummary: '',
    actionTaken: '',
    resultNote: '',
  });
  const [resolutionView, setResolutionView] = useState('edit');
  const [resolutionImages, setResolutionImages] = useState([]);
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState('');
  const [existingResolutions, setExistingResolutions] = useState([]);
  const [resolutionsLoading, setResolutionsLoading] = useState(false);
  const [resolutionsError, setResolutionsError] = useState('');
  const [resolutionPreviewOpen, setResolutionPreviewOpen] = useState(false);
  const [confirmingResolutionSubmit, setConfirmingResolutionSubmit] = useState(false);
  const [statusUpdateForm, setStatusUpdateForm] = useState({ status: '', note: '' });
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        if (!providerReportId) {
          if (active) setReport(null);
          return;
        }

        const res = await managementFeedbackApi.getProviderReportById(providerReportId, feedbackIdFromState);
        if (active) setReport(res || null);
      } catch (err) {
        console.error('Failed to load provider report', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [providerReportId, feedbackIdFromState]);

  useEffect(() => {
    if (report?.resolution) {
      setResolutionForm({
        resolutionSummary: report.resolution.resolutionSummary || report.resolution.summary || '',
        actionTaken: report.resolution.actionTaken || '',
        resultNote: report.resolution.resultNote || report.resolution.note || report.resolution.result || '',
      });
    }
  }, [report]);

  useEffect(() => {
    const loadContactLogs = async () => {
      if (!providerReportId || activeTab !== 'contact-logs') return;
      setContactLogsLoading(true);
      setContactLogsError('');
      try {
        const logs = await managementFeedbackApi.getProviderReportContactLogs(providerReportId);
        setContactLogs(Array.isArray(logs) ? logs : []);
      } catch (err) {
        console.error('Failed to load contact logs', err);
        setContactLogsError('Không thể tải lịch sử liên hệ.');
      } finally {
        setContactLogsLoading(false);
      }
    };

    loadContactLogs();
  }, [providerReportId, activeTab]);

  useEffect(() => {
    const loadCompletionDocuments = async () => {
      if (!providerReportId || activeTab !== 'completion-documents') return;
      setDocumentsLoading(true);
      setDocumentsError('');
      try {
        const response = await managementFeedbackApi.getProviderReportCompletionDocuments(providerReportId);
        const nextDocuments = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
              ? response.data
              : [];
        setDocuments(nextDocuments);
      } catch (err) {
        console.error('Failed to load completion documents', err);
        setDocumentsError(err?.message || 'Không thể tải tài liệu hoàn thành.');
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadCompletionDocuments();
  }, [providerReportId, activeTab]);

  useEffect(() => {
    let active = true;

    const loadExistingResolutions = async () => {
      const feedbackId = report?.feedbackId || report?.feedback?.feedbackId || null;
      if (!feedbackId || activeTab !== 'resolution') return;

      setResolutionsLoading(true);
      setResolutionsError('');

      try {
        const response = await managementFeedbackApi.getResolutions(feedbackId);
        const nextResolutions = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
              ? response.data
              : [];

        if (active) {
          setExistingResolutions(nextResolutions);
          setResolutionView(nextResolutions.length > 0 ? 'preview' : 'edit');
        }
      } catch (err) {
        console.error('Failed to load existing resolutions', err);
        if (active) {
          setResolutionsError(err?.message || 'Không thể tải dữ liệu resolution hiện có.');
          setExistingResolutions([]);
        }
      } finally {
        if (active) {
          setResolutionsLoading(false);
        }
      }
    };

    loadExistingResolutions();

    return () => {
      active = false;
    };
  }, [activeTab, report?.feedbackId, report?.feedback?.feedbackId]);

  const provider = report?.provider || report?.operator || report?.assignedOperator || {};
  const coordinator = report?.coordinator || report?.contact || {};
  const providerName = report?.providerName || provider?.operatorName || provider?.providerName || provider?.name || '—';
  const coordinatorName = report?.coordinatorName || coordinator?.name || coordinator?.contactName || '—';
  const providerPhone = report?.phoneNumber || coordinator?.phone || provider?.phoneNumber || '—';
  const providerEmail = report?.email || coordinator?.email || provider?.email || '—';
  const currentProviderReportStatus = normalizeProviderReportStatus(report?.status || report?.reportStatus || '');
  const canAccessResolution = currentProviderReportStatus === 'Done';
  const statusHistoryItems = useMemo(() => {
    const historyFromReport = Array.isArray(report?.statusHistory)
      ? report.statusHistory.map((item) => ({
          status: normalizeProviderReportStatus(item?.status || item?.newStatus || item?.value || ''),
          updatedAt: item?.updatedAt || item?.changedAt || report?.updatedAt || report?.lastUpdated || report?.createdAt || '',
          note: item?.note || item?.comment || '',
        }))
      : [];

    if (historyFromReport.length > 0) {
      return historyFromReport;
    }

    return [
      {
        status: currentProviderReportStatus || 'Assigned',
        updatedAt: report?.updatedAt || report?.lastUpdated || report?.createdAt || '',
        note: 'Current provider report status',
      },
    ];
  }, [report, currentProviderReportStatus]);

  const sortedContactLogs = useMemo(() => {
    return [...contactLogs].sort((a, b) => {
      const aDate = new Date(a.contactedAt).getTime() || 0;
      const bDate = new Date(b.contactedAt).getTime() || 0;
      return bDate - aDate;
    });
  }, [contactLogs]);

  const imageDocuments = useMemo(() => {
    return documents.filter((document) => {
      const fileName = String(document?.fileName || document?.name || '').toLowerCase();
      return fileName.match(/\.(png|jpe?g|gif|webp|svg)$/) || document?.contentType?.includes('image');
    });
  }, [documents]);

  const openImagePreview = (document, index) => {
    const fileUrl = document?.fileUrl || document?.url || document?.downloadUrl || document?.documentUrl;
    if (!fileUrl) return;
    const imageIndex = imageDocuments.findIndex((item) => {
      const currentFileName = String(item?.fileName || item?.name || '').toLowerCase();
      const targetFileName = String(document?.fileName || document?.name || '').toLowerCase();
      return currentFileName === targetFileName && (item?.fileUrl || item?.url || item?.downloadUrl || item?.documentUrl) === fileUrl;
    });
    setSelectedImage(fileUrl);
    setSelectedImageIndex(imageIndex >= 0 ? imageIndex : index);
  };

  const closeImagePreview = () => {
    setSelectedImage(null);
    setSelectedImageIndex(0);
  };

  const showImagePreview = (direction) => {
    if (imageDocuments.length === 0) return;
    const nextIndex = (selectedImageIndex + direction + imageDocuments.length) % imageDocuments.length;
    const nextDocument = imageDocuments[nextIndex];
    const nextUrl = nextDocument?.fileUrl || nextDocument?.url || nextDocument?.downloadUrl || nextDocument?.documentUrl;
    if (nextUrl) {
      setSelectedImage(nextUrl);
      setSelectedImageIndex(nextIndex);
    }
  };

  const openToast = (title, sub) => {
    setToastTitle(title);
    setToastSubtitle(sub);
    setToastOpen(true);
  };

  const handleDocumentDownload = (document) => {
    const fileUrl = document?.fileUrl || document?.url || document?.downloadUrl || document?.documentUrl;
    if (!fileUrl) {
      setUploadError('Không có đường dẫn tải xuống cho tài liệu này.');
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDocumentUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const supportedFiles = files.filter((file) => {
      const acceptTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const extension = String(file.name || '').split('.').pop()?.toLowerCase();
      return acceptTypes.includes(file.type) || ['jpg', 'jpeg', 'png', 'pdf'].includes(extension);
    });

    const trimmedDescription = String(documentDescription || '').trim();

    if (trimmedDescription.length > 1000) {
      setUploadError('Mô tả không được vượt quá 1000 ký tự.');
      event.target.value = '';
      return;
    }

    if (supportedFiles.length !== files.length) {
      setUploadError('Chỉ hỗ trợ tệp JPG, PNG hoặc PDF.');
    }

    if (!supportedFiles.length) {
      event.target.value = '';
      return;
    }

    setUploadingDocuments(true);
    setUploadError('');

    try {
      for (const file of supportedFiles) {
        await managementFeedbackApi.uploadCompletionDocument(providerReportId, file, {
          fileName: file.name,
          description: trimmedDescription,
        });
      }

      const response = await managementFeedbackApi.getProviderReportCompletionDocuments(providerReportId);
      const nextDocuments = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data)
            ? response.data
            : [];
      setDocuments(nextDocuments);
      setDocumentDescription('');
      openToast('Completion document uploaded successfully', 'Tài liệu hoàn thành đã được tải lên và hiển thị trong danh sách.');
    } catch (err) {
      console.error('Failed to upload completion documents', err);
      setUploadError(err?.message || 'Không thể tải lên tài liệu hoàn thành.');
    } finally {
      setUploadingDocuments(false);
      event.target.value = '';
    }
  };

  const handleResolutionInputChange = (key, value) => {
    setResolutionForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleResolutionImagesChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextImages = files.map((file) => ({
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setResolutionImages((prev) => [...prev, ...nextImages]);
    event.target.value = '';
  };

  const removeResolutionImage = (index) => {
    setResolutionImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleStatusUpdate = async () => {
    const nextStatus = String(statusUpdateForm.status || '').trim();
    const note = String(statusUpdateForm.note || '').trim();

    if (!nextStatus) {
      setStatusUpdateError('Vui lòng chọn trạng thái mới.');
      return;
    }

    if (!canTransitionProviderReportStatus(currentProviderReportStatus, nextStatus)) {
      if (currentProviderReportStatus === 'Done') {
        setStatusUpdateError('Provider report đã ở trạng thái Done và không thể quay lại.');
      } else if (currentProviderReportStatus === 'Reported') {
        setStatusUpdateError('Reported chỉ có thể chuyển sang Contacted, Accepted, Failed hoặc Cancelled.');
      } else if (currentProviderReportStatus === 'Contacted') {
        setStatusUpdateError('Contacted chỉ có thể chuyển sang Accepted, Failed hoặc Cancelled.');
      } else if (currentProviderReportStatus === 'Accepted') {
        setStatusUpdateError('Accepted chỉ có thể chuyển sang InProgress, Failed hoặc Cancelled.');
      } else if (currentProviderReportStatus === 'InProgress') {
        setStatusUpdateError('InProgress chỉ có thể chuyển sang Done, Failed hoặc Cancelled.');
      } else {
        setStatusUpdateError('Chuyển trạng thái không hợp lệ cho provider report này.');
      }
      return;
    }

    setStatusUpdating(true);
    setStatusUpdateError('');

    try {
      await managementFeedbackApi.updateProviderReportStatus(providerReportId, {
        status: nextStatus,
        note: note || null,
      });

      const refreshedReport = await managementFeedbackApi.getProviderReportById(providerReportId);
      setReport(refreshedReport || null);
      setStatusUpdateForm({ status: '', note: '' });
      openToast('Provider report status updated', 'Trạng thái báo cáo nhà thầu đã được cập nhật.');
    } catch (err) {
      console.error('Failed to update provider report status', err);
      setStatusUpdateError(err?.message || 'Không thể cập nhật trạng thái provider report.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSubmitResolution = async () => {
    const trimmedSummary = String(resolutionForm.resolutionSummary || '').trim();
    const trimmedAction = String(resolutionForm.actionTaken || '').trim();
    const trimmedResultNote = String(resolutionForm.resultNote || '').trim();

    if (!trimmedSummary || !trimmedAction) {
      setResolutionError('Vui lòng nhập Resolution Summary và Action Taken.');
      return;
    }

    setSubmittingResolution(true);
    setResolutionError('');

    try {
      const payload = {
        feedbackId: report?.feedbackId || report?.feedback?.feedbackId || report?.id || providerReportId,
        status: 'SubmittedForApproval',
        resolutionSummary: trimmedSummary,
        actionTaken: trimmedAction,
        resultNote: trimmedResultNote,
        completionImages: resolutionImages.map((image) => ({
          fileName: image.fileName,
          previewUrl: image.previewUrl,
        })),
      };

      await managementFeedbackApi.submitResolution(payload);
      setExistingResolutions([{ 
        resolutionSummary: trimmedSummary,
        actionTaken: trimmedAction,
        resultNote: trimmedResultNote,
        status: 'SubmittedForApproval',
        createdByStaffUserName: 'You',
        resolvedAt: new Date().toISOString(),
      }]);
      setResolutionView('preview');
      openToast('Resolution submitted successfully', 'Kết quả xử lý đã được gửi đi chờ quản lý phê duyệt.');
      navigate(`/staff/feedbacks/${report?.feedbackId || report?.feedback?.feedbackId || report?.id || providerReportId}`);
    } catch (err) {
      console.error('Failed to submit resolution', err);
      setResolutionError(err?.message || 'Không thể gửi kết quả xử lý.');
    } finally {
      setSubmittingResolution(false);
      setConfirmingResolutionSubmit(false);
    }
  };

  if (loading) {
    return (<div className="py-12 flex justify-center"><LoadingSpinner /></div>);
  }

  if (!report) {
    return (
      <div className="space-y-6 p-4">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm text-center">
          <h3 className="text-lg font-black text-slate-900">Báo cáo nhà thầu không tìm thấy</h3>
          <p className="mt-2 text-sm text-slate-600">Không thể tìm thấy báo cáo tương ứng với id cung cấp.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => navigate(-1)} className="btn btn-outline">Quay lại</button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogInputChange = (key, value) => {
    setLogForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveLog = async (event) => {
    event.preventDefault();
    setLogFormError('');

    const trimmedMethod = String(logForm.contactMethod || '').trim();
    const trimmedResult = String(logForm.contactResult || '').trim();
    const trimmedContactedAt = String(logForm.contactedAt || '').trim();

    if (!trimmedMethod || !trimmedResult || !trimmedContactedAt) {
      setLogFormError('Vui lòng điền phương thức, kết quả và thời điểm liên hệ.');
      return;
    }

    setLogSaving(true);

    try {
      const payload = {
        contactMethod: trimmedMethod,
        contactResult: trimmedResult,
        contactNote: String(logForm.contactNote || '').trim() || null,
        contactedAt: trimmedContactedAt,
      };

      const createdLog = await managementFeedbackApi.createProviderReportContactLog(providerReportId, payload);
      setContactLogs((prev) => [createdLog, ...(Array.isArray(prev) ? prev : [])]);
      openToast('Đã lưu lịch sử liên hệ', 'Nhật ký liên hệ mới đã được thêm vào báo cáo.');
      setLogForm({
        contactMethod: '',
        contactResult: '',
        contactNote: '',
        contactedAt: toLocalDateTimeValue(),
      });
    } catch (err) {
      console.error('Failed to save contact log', err);
      setLogFormError(err?.message || 'Không thể lưu bản ghi liên hệ.');
    } finally {
      setLogSaving(false);
    }
  };

  const pageTextStyle = `
    .provider-report-workspace-page .text-slate-700,
    .provider-report-workspace-page .text-slate-600,
    .provider-report-workspace-page .text-slate-500,
    .provider-report-workspace-page .text-slate-400,
    .provider-report-workspace-page .text-slate-800,
    .provider-report-workspace-page .text-slate-200 {
      color: #000 !important;
    }
  `;

  return (
    <div className="provider-report-workspace-page space-y-6 p-4 bg-slate-50/70 min-h-screen text-black">
      <style>{pageTextStyle}</style>
      <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-700">Provider Report Workspace</div>
          <h1 className="text-2xl font-black text-slate-900">Báo cáo nhà thầu: {report.providerReportId || report.id || provider.providerId || provider.operatorId}</h1>
          <div className="mt-2 text-sm text-slate-700">Quản lý vòng đời báo cáo nhà thầu từ một màn hình duy nhất.</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-slate-700 font-bold">Provider</div>
                <div className="mt-1 font-semibold text-slate-900">{providerName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">Coordinator</div>
                <div className="mt-1 font-semibold text-slate-900">{coordinatorName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">Status</div>
                <div className="mt-1 font-semibold text-slate-900">{report.status || report.reportStatus || '—'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Assigned Date</div>
                <div className="mt-1 font-semibold text-slate-900">{report.assignedAt || report.assignedDate || report.createdAt || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">Last Updated</div>
                <div className="mt-1 font-semibold text-slate-900">{report.updatedAt || report.lastUpdated || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-700 font-bold">Provider Report ID</div>
                <div className="mt-1 font-semibold text-slate-900">{report.providerReportId || report.id || '—'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('overview')} className={`btn btn-ghost btn-sm ${activeTab === 'overview' ? 'btn-active' : ''}`}>Overview</button>
              <button onClick={() => setActiveTab('status')} className={`btn btn-ghost btn-sm ${activeTab === 'status' ? 'btn-active' : ''}`}>Status</button>
              <button onClick={() => setActiveTab('contact-logs')} className={`btn btn-ghost btn-sm ${activeTab === 'contact-logs' ? 'btn-active' : ''}`}>Contact Logs</button>
              <button onClick={() => setActiveTab('completion-documents')} className={`btn btn-ghost btn-sm ${activeTab === 'completion-documents' ? 'btn-active' : ''}`}>Completion Documents</button>
              <button onClick={() => setActiveTab('resolution')} className={`btn btn-ghost btn-sm ${activeTab === 'resolution' ? 'btn-active' : ''}`} disabled={!canAccessResolution}>Resolution</button>
            </div>

            <div className="mt-4">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="font-bold">Overview</h3>
                  <p className="mt-2 text-sm text-slate-700">Provider report overview scaffold. (Details and actions will be implemented later.)</p>
                </div>
              )}

              {activeTab === 'status' && (
                <div className="space-y-6">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold">Provider Report Status</h3>
                        <p className="mt-2 text-sm text-slate-700">Advance the provider report through Reported → Contacted → Accepted → InProgress → Done before submission.</p>
                      </div>
                      <span className={`badge ${currentProviderReportStatus === 'Done' ? 'badge-success' : currentProviderReportStatus === 'InProgress' ? 'badge-warning' : currentProviderReportStatus === 'Failed' ? 'badge-error' : currentProviderReportStatus === 'Cancelled' ? 'badge-neutral' : 'badge-info'}`}>
                        {currentProviderReportStatus || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {statusUpdateError ? (
                    <div><ErrorAlert message={statusUpdateError} onClose={() => setStatusUpdateError('')} /></div>
                  ) : null}

                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 space-y-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Provider Report Status</span>
                        <select
                          value={statusUpdateForm.status}
                          onChange={(event) => setStatusUpdateForm((prev) => ({ ...prev, status: event.target.value }))}
                          className="select select-bordered w-full"
                        >
                          <option value="">-- Chọn trạng thái --</option>
                          <option value="Reported" disabled={currentProviderReportStatus !== '' && currentProviderReportStatus !== 'Reported'}>Reported</option>
                          <option value="Contacted" disabled={!['Reported', 'Contacted'].includes(currentProviderReportStatus)}>Contacted</option>
                          <option value="Accepted" disabled={!['Reported', 'Contacted', 'Accepted'].includes(currentProviderReportStatus)}>Accepted</option>
                          <option value="InProgress" disabled={!['Accepted', 'InProgress'].includes(currentProviderReportStatus)}>InProgress</option>
                          <option value="Done" disabled={currentProviderReportStatus !== 'InProgress'}>Done</option>
                          <option value="Failed" disabled={!['Reported', 'Contacted', 'Accepted', 'InProgress'].includes(currentProviderReportStatus)}>Failed</option>
                          <option value="Cancelled" disabled={!['Reported', 'Contacted', 'Accepted', 'InProgress'].includes(currentProviderReportStatus)}>Cancelled</option>
                        </select>
                      </label>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">Last updated</div>
                        <div className="mt-2 font-semibold text-slate-900">{report.updatedAt || report.lastUpdated || '—'}</div>
                      </div>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Note</span>
                      <textarea
                        value={statusUpdateForm.note}
                        onChange={(event) => setStatusUpdateForm((prev) => ({ ...prev, note: event.target.value }))}
                        rows={4}
                        placeholder="Ghi chú cho cập nhật trạng thái..."
                        className="textarea textarea-bordered w-full"
                      />
                    </label>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={statusUpdating || !statusUpdateForm.status}
                        onClick={handleStatusUpdate}
                      >
                        {statusUpdating ? <span className="loading loading-spinner loading-xs" /> : null}
                        {statusUpdating ? 'Đang cập nhật...' : 'Update'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Status history timeline</div>
                    <div className="mt-4 space-y-4">
                      {statusHistoryItems.map((item, index) => (
                        <div key={`${item.status}-${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`mt-1 h-3 w-3 rounded-full ${index === 0 ? 'bg-[#0052CC]' : 'bg-slate-300'}`} />
                            {index < statusHistoryItems.length - 1 ? <div className="mt-1 h-full w-px bg-slate-200" /> : null}
                          </div>
                          <div className="flex-1 rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{item.status || 'Unknown'}</span>
                              <span className="text-xs text-slate-700">{item.updatedAt ? formatContactDateTime(item.updatedAt) : '—'}</span>
                            </div>
                            {item.note ? <div className="mt-2 text-sm text-slate-700">{item.note}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contact-logs' && (
                <div className="space-y-6">
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-bold">Contact Logs</h3>
                        <p className="mt-2 text-sm text-slate-700">Lịch sử liên hệ với nhà thầu và ghi chú liên hệ mới.</p>
                      </div>
                      {sortedContactLogs.length > 0 && (
                        <span className="badge badge-outline lowercase">{sortedContactLogs.length} bản ghi</span>
                      )}
                    </div>

                    <div className="mt-4">
                      {contactLogsLoading ? (
                        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                      ) : contactLogsError ? (
                        <ErrorAlert message={contactLogsError} onClose={() => setContactLogsError('')} />
                      ) : sortedContactLogs.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                          Chưa có bản ghi liên hệ nào. Hãy thêm nhật ký liên hệ mới ở bên dưới.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sortedContactLogs.map((log) => (
                            <div key={log.contactLogId || `${log.contactedAt}-${log.contactMethod}` } className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Liên hệ lúc</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatContactDateTime(log.contactedAt)}</div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="badge badge-outline">Phương thức: {log.contactMethod || '—'}</span>
                                  <span className="badge badge-outline">Kết quả: {log.contactResult || '—'}</span>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div>
                                  <div className="text-xs text-slate-700">Người thực hiện</div>
                                  <div className="mt-1 font-semibold text-slate-900">{log.contactedByUserName || 'Không rõ'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-700">Nhà thầu</div>
                                  <div className="mt-1 font-semibold text-slate-900">{log.providerName || provider.operatorName || provider.providerName || '—'}</div>
                                </div>
                              </div>

                              {log.contactNote ? (
                                <div className="mt-4 rounded-2xl bg-white p-3 border border-slate-200 text-sm text-slate-700">
                                  {log.contactNote}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                    <div>
                      <h3 className="font-bold">Ghi nhật ký liên hệ</h3>
                      <p className="mt-2 text-sm text-slate-700">Ghi lại chi tiết cuộc gọi, email hoặc tin nhắn với nhà thầu.</p>
                    </div>

                    {logFormError && (
                      <div className="mt-4"><ErrorAlert message={logFormError} onClose={() => setLogFormError('')} /></div>
                    )}

                    <form onSubmit={handleSaveLog} className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Phương thức liên hệ</span>
                          <input
                            value={logForm.contactMethod}
                            onChange={(event) => handleLogInputChange('contactMethod', event.target.value)}
                            placeholder="Gọi điện / Email / Tin nhắn"
                            className="input input-bordered w-full"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Kết quả</span>
                          <input
                            value={logForm.contactResult}
                            onChange={(event) => handleLogInputChange('contactResult', event.target.value)}
                            placeholder="Đã liên hệ thành công / Không có phản hồi"
                            className="input input-bordered w-full"
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Nội dung liên hệ</span>
                        <textarea
                          value={logForm.contactNote}
                          onChange={(event) => handleLogInputChange('contactNote', event.target.value)}
                          placeholder="Ghi chú thêm về cuộc gọi hoặc email..."
                          rows={4}
                          className="textarea textarea-bordered w-full"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Thời điểm liên hệ</span>
                        <input
                          type="datetime-local"
                          value={logForm.contactedAt}
                          onChange={(event) => handleLogInputChange('contactedAt', event.target.value)}
                          className="input input-bordered w-full"
                        />
                      </label>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className={`btn btn-primary ${logSaving ? 'loading' : ''}`}
                          disabled={logSaving}
                        >
                          {logSaving ? 'Đang lưu...' : 'Lưu liên hệ'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'completion-documents' && (
                <div className="space-y-6">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold">Completion Documents</h3>
                        <p className="mt-2 text-sm text-slate-700">Tải lên bằng chứng hoàn thành từ nhà thầu và xem lại trước khi duyệt.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={handleDocumentUpload}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingDocuments}
                        >
                          {uploadingDocuments ? <span className="loading loading-spinner loading-xs" /> : <Lucide.UploadCloud size={14} />}
                          {uploadingDocuments ? 'Đang tải...' : 'Tải lên'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      <label className="block space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Description</span>
                        <textarea
                          value={documentDescription}
                          onChange={(event) => setDocumentDescription(event.target.value)}
                          placeholder="Thêm mô tả cho bằng chứng hoàn thành..."
                          rows={4}
                          maxLength={1000}
                          className="textarea textarea-bordered w-full"
                        />
                      </label>
                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <span>Hỗ trợ: JPG, PNG, PDF</span>
                        <span>{documentDescription.trim().length}/1000</span>
                      </div>
                    </div>
                    {uploadError ? (
                      <div className="mt-3"><ErrorAlert message={uploadError} onClose={() => setUploadError('')} /></div>
                    ) : null}
                  </div>

                  {documentsLoading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                  ) : documentsError ? (
                    <ErrorAlert message={documentsError} onClose={() => setDocumentsError('')} />
                  ) : documents.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                      Chưa có tài liệu hoàn thành nào được tải lên.
                    </div>
                  ) : (
                    <CompletionDocumentsCard
                      documents={documents}
                      onPreview={openImagePreview}
                      onDownload={handleDocumentDownload}
                      emptyMessage="Chưa có tài liệu hoàn thành nào được tải lên."
                    />
                  )}
                </div>
              )}

              {activeTab === 'resolution' && (
                <div className="space-y-6">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-bold">Resolution</h3>
                        <p className="mt-2 text-sm text-slate-700">Gửi kết quả xử lý cuối cùng để chuyển sang trạng thái chờ quản lý phê duyệt.</p>
                      </div>
                      {existingResolutions.length > 0 ? (
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => setResolutionPreviewOpen(true)}>Preview Resolution</button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {resolutionError ? (
                    <div><ErrorAlert message={resolutionError} onClose={() => setResolutionError('')} /></div>
                  ) : null}

                  {!canAccessResolution ? (
                    <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="font-semibold">Provider Report must be Done before submitting Resolution.</div>
                      <div className="mt-1">Update the provider report status to Done from the Status tab first.</div>
                    </div>
                  ) : null}

                  {resolutionsLoading ? (
                    <div className="py-12 flex justify-center"><LoadingSpinner /></div>
                  ) : resolutionsError ? (
                    <ErrorAlert message={resolutionsError} onClose={() => setResolutionsError('')} />
                  ) : existingResolutions.length > 0 || resolutionView === 'preview' ? (
                    <div className="space-y-4 rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Resolution Summary</div>
                        <div className="mt-2 font-semibold text-slate-800">{existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary || '—'}</div>
                      </div>
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Action Taken</div>
                        <div className="mt-2 font-semibold text-slate-800">{existingResolutions[0]?.actionTaken || resolutionForm.actionTaken || '—'}</div>
                      </div>
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Result Note</div>
                        <div className="mt-2 font-semibold text-slate-800">{existingResolutions[0]?.resultNote || resolutionForm.resultNote || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <label className="block space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Resolution Summary</span>
                        <textarea
                          value={resolutionForm.resolutionSummary}
                          onChange={(event) => handleResolutionInputChange('resolutionSummary', event.target.value)}
                          rows={4}
                          placeholder="Tóm tắt kết quả xử lý..."
                          className="textarea textarea-bordered w-full"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Action Taken</span>
                        <textarea
                          value={resolutionForm.actionTaken}
                          onChange={(event) => handleResolutionInputChange('actionTaken', event.target.value)}
                          rows={4}
                          placeholder="Các bước công việc đã thực hiện..."
                          className="textarea textarea-bordered w-full"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Result Note</span>
                        <textarea
                          value={resolutionForm.resultNote}
                          onChange={(event) => handleResolutionInputChange('resultNote', event.target.value)}
                          rows={4}
                          placeholder="Ghi chú kết quả cuối cùng..."
                          className="textarea textarea-bordered w-full"
                        />
                      </label>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Completion Images</span>
                          <label className="btn btn-outline btn-sm cursor-pointer">
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleResolutionImagesChange} />
                            Add Images
                          </label>
                        </div>

                        {resolutionImages.length === 0 ? (
                          <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">No completion images selected.</div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {resolutionImages.map((image, index) => (
                              <div key={`${image.fileName}-${index}`} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                                <img src={image.previewUrl} alt={image.fileName} className="h-32 w-full rounded-[1rem] object-cover" />
                                <div className="mt-2 truncate text-sm font-semibold text-slate-700">{image.fileName}</div>
                                <button type="button" className="btn btn-ghost btn-xs mt-2 text-rose-600" onClick={() => removeResolutionImage(index)}>Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-primary" disabled={submittingResolution || !canAccessResolution} onClick={() => setConfirmingResolutionSubmit(true)}>
                          {submittingResolution ? <span className="loading loading-spinner loading-xs" /> : null}
                          Submit Resolution
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Feedback</div>
            <div className="mt-1 font-semibold text-slate-900">{report.feedbackId || report.feedback?.feedbackId || '—'}</div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">Provider Contact</div>
            <div className="mt-1 font-semibold text-slate-900">{providerPhone || providerEmail}</div>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <button className="btn btn-outline w-full" onClick={() => navigate(`/staff/feedbacks/${report.feedbackId || report.feedback?.feedbackId || ''}`)}>
              Open Feedback Detail
            </button>
          </div>
        </aside>
      </div>

      {selectedImage ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 py-6">
          <div className="relative w-full max-w-5xl rounded-[1.5rem] border border-slate-700 bg-slate-950 p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-200">
              <div className="truncate">{imageDocuments[selectedImageIndex]?.fileName || imageDocuments[selectedImageIndex]?.name || 'Preview'}</div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-ghost btn-sm text-slate-200" onClick={() => showImagePreview(-1)}>
                  <Lucide.ChevronLeft size={16} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm text-slate-200" onClick={() => showImagePreview(1)}>
                  <Lucide.ChevronRight size={16} />
                </button>
                <button type="button" className="btn btn-ghost btn-sm text-slate-200" onClick={closeImagePreview}>
                  <Lucide.X size={16} />
                </button>
              </div>
            </div>
            <div className="flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-900">
              <img src={selectedImage} alt="Completion document preview" className="max-h-[70vh] max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        open={resolutionPreviewOpen}
        title="Resolution Details"
        message="Thông tin resolution hiện có"
        confirmLabel="Đóng"
        cancelLabel="Đóng"
        onConfirm={() => setResolutionPreviewOpen(false)}
        onCancel={() => setResolutionPreviewOpen(false)}
      >
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Resolution Summary</div>
            <div className="mt-1 font-semibold text-slate-800">{existingResolutions[0]?.resolutionSummary || resolutionForm.resolutionSummary || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Action Taken</div>
            <div className="mt-1 font-semibold text-slate-800">{existingResolutions[0]?.actionTaken || resolutionForm.actionTaken || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Result Note</div>
            <div className="mt-1 font-semibold text-slate-800">{existingResolutions[0]?.resultNote || resolutionForm.resultNote || '—'}</div>
          </div>
          {resolutionImages.length > 0 ? (
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Images</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {resolutionImages.map((image, index) => (
                  <img key={`${image.fileName}-${index}`} src={image.previewUrl} alt={image.fileName} className="h-24 w-full rounded-[0.9rem] object-cover" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={confirmingResolutionSubmit}
        title="Submit Resolution"
        message="Are you sure you want to submit this resolution for manager approval?"
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={handleSubmitResolution}
        onCancel={() => setConfirmingResolutionSubmit(false)}
      />

      <DelightToast
        open={toastOpen}
        message={toastTitle}
        sub={toastSubtitle}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
};

export default ProviderReportWorkspacePage;
