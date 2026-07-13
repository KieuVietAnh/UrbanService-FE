import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import { ApprovalHeader, ApprovalSummaryCard, CompletionDocumentsCard, ConfirmationModal, ProviderReportCard, StatusTimeline } from '@urbanmind/shared-ui';
import { getStatusLabel, managementTypes } from '@urbanmind/shared-types';

const normalizeProviderReport = (value) => {
  if (Array.isArray(value)) return value[0] || null;
  if (value && typeof value === 'object') return value;
  return null;
};

const normalizeDocuments = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.documents)) return value.documents;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const InteractionApprovalDetailPage = () => {
  const { feedbackId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [providerReport, setProviderReport] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [note, setNote] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(null);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await managementFeedbackApi.getFeedbackById(feedbackId);
      setFeedback(detail);
      const [reportResult, documentsResult] = await Promise.allSettled([
        managementFeedbackApi.getProviderReports(feedbackId),
        managementFeedbackApi.getCompletionDocuments(feedbackId),
      ]);
      if (reportResult.status === 'fulfilled') {
        setProviderReport(normalizeProviderReport(reportResult.value));
      } else {
        setProviderReport(null);
      }
      if (documentsResult.status === 'fulfilled') {
        setDocuments(normalizeDocuments(documentsResult.value));
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load approval detail', err);
      setMessage({ type: 'error', text: err?.message || 'Không thể tải chi tiết duyệt.' });
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    if (feedbackId) {
      loadFeedback();
    }
  }, [feedbackId, loadFeedback]);

  const beforeImages = useMemo(() => {
    const attachments = Array.isArray(feedback?.attachments) ? feedback.attachments : [];
    return attachments.map((attachment) => typeof attachment === 'string' ? attachment : attachment?.fileUrl || attachment?.url || '').filter(Boolean);
  }, [feedback]);

  const afterImages = useMemo(() => {
    const attachments = Array.isArray(feedback?.resolution?.attachments) ? feedback.resolution.attachments : [];
    return attachments.map((attachment) => typeof attachment === 'string' ? attachment : attachment?.fileUrl || attachment?.url || '').filter(Boolean);
  }, [feedback]);

  const timelineItems = useMemo(() => [
    { title: getStatusLabel(managementTypes.feedbackStatus.SUBMITTED), subtitle: 'Feedback received' },
    { title: getStatusLabel(managementTypes.feedbackStatus.AI_REVIEWED), subtitle: 'Automated review complete' },
    { title: getStatusLabel(managementTypes.feedbackStatus.VERIFIED), subtitle: 'Staff confirmed the report' },
    { title: getStatusLabel(managementTypes.feedbackStatus.ASSIGNED), subtitle: 'Provider assigned' },
    { title: getStatusLabel(managementTypes.feedbackStatus.IN_PROGRESS), subtitle: 'Work in progress' },
    { title: getStatusLabel(managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL), subtitle: 'Waiting for manager approval' },
  ], []);

  const activeTimelineIndex = useMemo(() => {
    const status = feedback?.status;
    const map = {
      [managementTypes.feedbackStatus.SUBMITTED]: 0,
      [managementTypes.feedbackStatus.AI_REVIEWED]: 1,
      [managementTypes.feedbackStatus.VERIFIED]: 2,
      [managementTypes.feedbackStatus.ASSIGNED]: 3,
      [managementTypes.feedbackStatus.IN_PROGRESS]: 4,
      [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: 5,
    };
    return map[status] ?? -1;
  }, [feedback?.status]);

  const handleDecision = async (decision) => {
    setSubmitting(true);
    try {
      if (decision === 'approve') {
        await managementFeedbackApi.approveFeedback(feedbackId, note);
        setMessage({ type: 'success', text: 'Resolution approved successfully.' });
      } else {
        await managementFeedbackApi.requestRework(feedbackId, reworkReason || note);
        setMessage({ type: 'success', text: 'Rework request sent successfully.' });
      }
      await loadFeedback();
      navigate('/manager/approvals', { state: { refreshKey: Date.now() } });
    } catch (err) {
      console.error('Failed to complete approval decision', err);
      setMessage({ type: 'error', text: err?.message || 'Unable to update the approval decision.' });
    } finally {
      setSubmitting(false);
      setConfirmingAction(null);
      setReworkReason('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-8 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
            <div className="h-40 animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
          </div>
          <div className="h-60 animate-pulse rounded-[2rem] border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (feedback?.status !== managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL) {
    return (
      <div className="space-y-6 p-4">
        <ApprovalHeader title="Approval Workflow" description="This feedback is not waiting for approval." onBack={() => navigate('/manager/approvals')} backLabel="Back To Approval Queue" />
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-black text-slate-900">This feedback is not waiting for approval.</h2>
          <p className="mt-2 text-sm text-slate-500">Only feedback in the SubmittedForApproval state can be reviewed from this workflow.</p>
          <button type="button" onClick={() => navigate('/manager/approvals')} className="btn btn-primary mt-5 rounded-2xl">
            Back To Approval Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {message.type === 'success' ? <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} /> : null}
      {message.type === 'error' ? <ErrorAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} /> : null}

      <nav className="text-sm text-slate-500">
        <button type="button" onClick={() => navigate('/manager/approvals')} className="font-semibold text-emerald-700">Approval Queue</button>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Detail</span>
      </nav>

      <ApprovalHeader title="Approval Review" description="Check the submitted resolution, provider evidence, and supporting documents before approving or requesting rework." onBack={() => navigate('/manager/approvals')} backLabel="Back To Approval Queue" />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Feedback Details</div>
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              {feedback?.description || 'No detailed description.'}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Location</div>
                <div className="mt-2 font-semibold text-slate-700">{feedback?.locationText || '—'}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 text-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Provider</div>
                <div className="mt-2 font-semibold text-slate-700">{feedback?.assignment?.operatorName || 'Unassigned'}</div>
              </div>
            </div>
          </section>

          <ApprovalSummaryCard title="Resolution Summary">
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Resolution Summary</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.resolution?.resolutionSummary || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Action Taken</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.resolution?.actionTaken || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Result Note</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.resolution?.resultNote || feedback?.resolution?.note || feedback?.statusNote || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Resolution Date</div>
                <div className="mt-1 font-semibold text-slate-700">{feedback?.resolution?.resolvedAt || feedback?.updatedAt || feedback?.createdAt ? new Date(feedback?.resolution?.resolvedAt || feedback?.updatedAt || feedback?.createdAt).toLocaleString('vi-VN') : '—'}</div>
              </div>
            </div>
          </ApprovalSummaryCard>

          <ProviderReportCard report={providerReport} />
          <CompletionDocumentsCard documents={documents} />
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Status Timeline</div>
            <div className="mt-4">
              <StatusTimeline items={timelineItems} activeIndex={activeTimelineIndex} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Images</div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-600">Before</div>
                <div className="mt-3 grid gap-3">
                  {beforeImages.length > 0 ? beforeImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Before ${index + 1}`} className="h-40 w-full rounded-[1.1rem] object-cover" />) : <div className="flex h-40 items-center justify-center rounded-[1.1rem] border border-dashed border-rose-200 bg-white/70 text-sm text-slate-500">No before images.</div>}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">After</div>
                <div className="mt-3 grid gap-3">
                  {afterImages.length > 0 ? afterImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`After ${index + 1}`} className="h-40 w-full rounded-[1.1rem] object-cover" />) : <div className="flex h-40 items-center justify-center rounded-[1.1rem] border border-dashed border-emerald-200 bg-white/70 text-sm text-slate-500">No after images.</div>}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Decision</div>
            <div className="mt-4 space-y-3">
              <textarea rows="4" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add approval notes" className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm" />
              <div className="grid gap-2">
                <button type="button" onClick={() => setConfirmingAction('approve')} disabled={submitting} className="btn btn-success rounded-2xl text-sm">
                  <Lucide.CheckCircle2 size={16} className="mr-2" />Approve
                </button>
                <button type="button" onClick={() => setConfirmingAction('rework')} disabled={submitting} className="btn btn-outline rounded-2xl text-sm">
                  <Lucide.RefreshCw size={16} className="mr-2" />Need Rework
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal open={confirmingAction === 'approve'} title="Approve Resolution" message="Are you sure you want to approve this resolution?" confirmLabel="Approve" cancelLabel="Cancel" onConfirm={() => handleDecision('approve')} onCancel={() => setConfirmingAction(null)} />
      <ConfirmationModal open={confirmingAction === 'rework'} title="Request Rework" message="Describe the issue that must be corrected before approval." confirmLabel="Submit" cancelLabel="Cancel" onConfirm={() => handleDecision('rework')} onCancel={() => setConfirmingAction(null)}>
        <textarea rows="4" value={reworkReason} onChange={(event) => setReworkReason(event.target.value)} placeholder="Reason for rework" className="textarea textarea-bordered w-full rounded-[1.2rem] border-slate-200 bg-white text-sm" />
      </ConfirmationModal>
    </div>
  );
};
