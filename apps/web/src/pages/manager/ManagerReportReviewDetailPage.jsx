import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import {
  getStatusIntent,
  getStatusLabel,
  managementTypes,
} from '@urbanmind/shared-types';
import { toolsApi } from '@urbanmind/shared-api';

import { managementFeedbackApi } from '../../services/api/managementFeedbackApi';
import Badge from '../../components/design-system/Badge';
import Button from '../../components/design-system/Button';
import EmptyState from '../../components/design-system/EmptyState';
import Select from '../../components/design-system/Select';
import { ManagerPageHeader, ManagerSectionHeader } from '../../components/manager/ManagerPageElements';
import FeedbackLocationMapCard from '../../components/maps/FeedbackLocationMapCard';
import { buildExternalMapUrl } from '../../config/mapConfig';
import { getCategoryLabel } from '../../utils/categoryLabels';
import {
  MISSING_VALUE,
  findReviewReport,
  formatConfidence,
  formatReportCode,
  formatReviewDateTime,
  getAiCategoryId,
  getAiCategoryName,
  getPriorityLabel,
  getRelatedIncidentId,
  getReportAttachments,
  getReviewPriority,
  getSubmissionChannelLabel,
  isAiReviewedStatus,
  isImageAttachment,
  isVideoAttachment,
} from './managerReportReviewUtils';

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Thấp' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'High', label: 'Cao' },
  { value: 'Critical', label: 'Khẩn cấp' },
];

const SENTIMENT_LABELS = {
  positive: 'Tích cực',
  neutral: 'Trung tính',
  negative: 'Tiêu cực',
  unknown: 'Chưa có dữ liệu',
};

const DETAIL_ICON_TONES = {
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/70',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/70',
};

const normalizeKey = (value) => String(value ?? '').trim().replace(/[-_\s]+/g, '').toLowerCase();

function DetailSkeleton() {
  return (
    <section className="space-y-5" aria-busy="true" aria-label="Đang tải chi tiết phản ánh">
      <div className="admin-panel p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-5 h-7 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <span className="sr-only">Đang tải dữ liệu</span>
    </section>
  );
}

function DetailValue({ label, value, icon: Icon, tone = 'blue' }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${DETAIL_ICON_TONES[tone] || DETAIL_ICON_TONES.blue}`} aria-hidden="true">
        <Icon size={15} />
      </span>
      <dl className="min-w-0">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">{value || MISSING_VALUE}</dd>
      </dl>
    </div>
  );
}

function ReportInformationSection({ report }) {
  return (
    <section className="admin-panel overflow-hidden border-t-[3px] border-t-blue-500" aria-labelledby="manager-review-report-info">
      <ManagerSectionHeader
        id="manager-review-report-info"
        title="Thông tin phản ánh"
        description="Nội dung do người dân gửi và thông tin tiếp nhận của phản ánh."
        icon={Lucide.FileText}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-[0_10px_24px_rgba(37,99,235,0.14)] dark:bg-blue-950/45 dark:text-blue-300 dark:ring-blue-800"
        iconSize={20}
      />
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
              {formatReportCode(report?.feedbackId)}
            </p>
            <h2 className="mt-2 text-xl font-bold leading-7 text-slate-950 dark:text-white">
              {report?.title || MISSING_VALUE}
            </h2>
          </div>
          <Badge intent={getStatusIntent(report?.status)}>
            {getStatusLabel(report?.status, MISSING_VALUE)}
          </Badge>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-200 sm:px-5">
          {report?.description || MISSING_VALUE}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailValue icon={Lucide.UserRound} label="Người gửi" value={report?.userName || report?.reporterName} />
          <DetailValue icon={Lucide.CalendarClock} label="Thời gian gửi" value={formatReviewDateTime(report?.createdAt)} />
          <DetailValue icon={Lucide.Radio} label="Kênh gửi" value={getSubmissionChannelLabel(report?.submissionChannel)} />
          <DetailValue icon={Lucide.Tag} label="Danh mục hiện tại" value={getCategoryLabel(report?.categoryName, MISSING_VALUE)} />
        </div>
      </div>
    </section>
  );
}

function LocationSection({ report }) {
  const latitude = Number(report?.latitude);
  const longitude = Number(report?.longitude);
  const hasCoordinates = Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180;
  const mapUrl = hasCoordinates ? buildExternalMapUrl(latitude, longitude) : '';

  return (
    <div className="space-y-3">
      <FeedbackLocationMapCard
        feedbackId={report?.feedbackId}
        latitude={report?.latitude}
        longitude={report?.longitude}
        locationText={report?.locationText}
        areaName={report?.areaName}
        variant="admin"
        externalMapUrl={mapUrl}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 shadow-[0_10px_24px_rgba(16,185,129,0.14)] dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-800"
        iconSize={20}
        className="border-t-[3px] border-t-emerald-500 shadow-[0_18px_44px_rgba(16,185,129,0.08)]"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailValue tone="emerald" icon={Lucide.Landmark} label="Phường / Khu vực" value={report?.areaName} />
        <DetailValue
          tone="emerald"
          icon={Lucide.Crosshair}
          label="Tọa độ"
          value={hasCoordinates ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : MISSING_VALUE}
        />
      </div>
    </div>
  );
}

function EvidenceSection({ report }) {
  const attachments = useMemo(() => getReportAttachments(report), [report]);
  return (
    <section className="admin-panel overflow-hidden border-t-[3px] border-t-amber-500" aria-labelledby="manager-review-evidence">
      <ManagerSectionHeader
        id="manager-review-evidence"
        title="Hình ảnh / Minh chứng"
        description={attachments.length > 0 ? `${attachments.length} tệp do người dân gửi kèm phản ánh.` : 'Phản ánh này không có tệp đính kèm.'}
        icon={Lucide.Images}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200 shadow-[0_10px_24px_rgba(245,158,11,0.14)] dark:bg-amber-950/45 dark:text-amber-300 dark:ring-amber-800"
        iconSize={20}
      />
      {attachments.length > 0 ? (
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
          {attachments.map((attachment, index) => {
            const label = attachment?.name || `Minh chứng ${index + 1}`;
            if (isVideoAttachment(attachment)) {
              return (
                <figure key={attachment.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700">
                  <video src={attachment.url} controls preload="metadata" className="aspect-video w-full object-contain">
                    Trình duyệt không hỗ trợ phát video.
                  </video>
                  <figcaption className="bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">{label}</figcaption>
                </figure>
              );
            }
            if (isImageAttachment(attachment)) {
              return (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-900"
                  aria-label={`Mở hình ảnh ${index + 1}: ${label}`}
                >
                  <img src={attachment.url} alt={`Minh chứng phản ánh ${index + 1}`} loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-[1.02]" />
                  <span className="flex items-center justify-between gap-2 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <span className="truncate">{label}</span>
                    <Lucide.ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                  </span>
                </a>
              );
            }
            return (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Lucide.Paperclip size={18} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <Lucide.ExternalLink size={15} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-6">
          <EmptyState
            icon={Lucide.ImageOff}
            title="Chưa có hình ảnh hoặc minh chứng"
            description="Phản ánh này không kèm theo tệp đính kèm từ người dân."
          />
        </div>
      )}
    </section>
  );
}

function AiAnalysisSection({ aiReport }) {
  const analysis = aiReport?.analysisResult || null;
  if (!analysis) {
    return (
      <section className="admin-panel overflow-hidden border-t-[3px] border-t-violet-500" aria-labelledby="manager-review-ai-analysis">
        <ManagerSectionHeader
          id="manager-review-ai-analysis"
          title="Phân tích của AI"
          icon={Lucide.Sparkles}
          iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200 shadow-[0_10px_24px_rgba(124,58,237,0.14)] dark:bg-violet-950/45 dark:text-violet-300 dark:ring-violet-800"
          iconSize={20}
        />
        <div className="px-5 py-5">
          <EmptyState
            icon={Lucide.BotOff}
            title="Chưa có dữ liệu phân tích AI"
            description="API chi tiết không trả về phân tích AI và phản ánh này không còn trong hàng chờ AI hiện tại."
          />
        </div>
      </section>
    );
  }

  const sentiment = SENTIMENT_LABELS[normalizeKey(analysis?.sentiment)] || analysis?.sentiment || MISSING_VALUE;
  const keywords = Array.isArray(aiReport?.keywords)
    ? aiReport.keywords
    : Array.isArray(analysis?.keywords)
      ? analysis.keywords
      : [];

  return (
    <section className="admin-panel overflow-hidden border-t-[3px] border-t-violet-500 shadow-[0_18px_44px_rgba(124,58,237,0.07)]" aria-labelledby="manager-review-ai-analysis">
      <ManagerSectionHeader
        id="manager-review-ai-analysis"
        title="Phân tích của AI"
        description="Thông tin tham khảo để quản lý kiểm tra, không thay thế quyết định xác nhận."
        icon={Lucide.Sparkles}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200 shadow-[0_10px_24px_rgba(124,58,237,0.14)] dark:bg-violet-950/45 dark:text-violet-300 dark:ring-violet-800"
        iconSize={20}
      />
      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <DetailValue tone="violet" icon={Lucide.Tags} label="Danh mục đề xuất" value={getCategoryLabel(getAiCategoryName(aiReport))} />
          <DetailValue tone="violet" icon={Lucide.Gauge} label="Mức ưu tiên đề xuất" value={getPriorityLabel(getReviewPriority(aiReport))} />
          <DetailValue tone="violet" icon={Lucide.Percent} label="Độ tin cậy" value={formatConfidence(aiReport?.confidenceScore ?? analysis?.confidenceScore)} />
          <DetailValue tone="violet" icon={Lucide.MessageCircleMore} label="Cảm xúc" value={sentiment} />
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4 dark:border-blue-900/60 dark:bg-blue-950/20">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">Tóm tắt AI</p>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{aiReport?.summary || analysis?.summary || MISSING_VALUE}</p>
        </div>

        {keywords.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Từ khóa trích xuất</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {keywords.map((keyword) => <Badge key={keyword} intent="neutral">{keyword}</Badge>)}
            </div>
          </div>
        ) : null}

        <DetailValue tone="violet" icon={Lucide.Cpu} label="Mô hình phân tích" value={analysis?.modelName} />
      </div>
    </section>
  );
}

function DecisionSuccess({ decision, onBack }) {
  const verified = decision?.type === 'verified';
  return (
    <section className={`rounded-2xl border px-4 py-4 ${verified ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}`} aria-live="polite">
      <div className="flex items-start gap-3">
        {verified ? <Lucide.BadgeCheck size={21} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Lucide.XCircle size={21} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <div>
          <h3 className="font-bold">{verified ? 'Đã xác nhận phản ánh' : 'Đã từ chối phản ánh'}</h3>
          <p className="mt-1 text-sm leading-6">
            {verified
              ? 'Quyết định đã được backend ghi nhận.'
              : 'Phản ánh đã được chuyển sang trạng thái bị từ chối.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col">
        {verified && decision?.incidentId ? (
          <Link
            to={`/manager/incidents/${decision.incidentId}`}
            state={{ from: decision?.returnPath }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            Xem sự vụ
            <Lucide.ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <Lucide.List size={16} aria-hidden="true" />
          Về hàng chờ
        </Button>
      </div>

      {verified && !decision?.incidentId ? (
        <p className="mt-4 border-t border-emerald-200 pt-3 text-xs leading-5 dark:border-emerald-900">
          Chưa có API hỗ trợ xác định sự vụ liên quan sau khi xác nhận.
        </p>
      ) : null}
    </section>
  );
}

function ConfirmationSection({
  report,
  aiReport,
  categories,
  selectedCategoryId,
  selectedPriority,
  onCategoryChange,
  onPriorityChange,
  onOpenDecision,
  actionError,
  submitting,
  decision,
  onBack,
}) {
  const reviewable = isAiReviewedStatus(report?.status) && !decision;
  const currentCategoryId = getAiCategoryId({ ...aiReport, categoryId: report?.categoryId });
  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({
      id: category?.categoryId ?? category?.id,
      label: getCategoryLabel(category?.categoryName || category?.name),
    })).filter((category) => category.id !== null && category.id !== undefined);

    const selectedId = String(selectedCategoryId || currentCategoryId || '');
    if (selectedId && !options.some((category) => String(category.id) === selectedId)) {
      options.push({
        id: selectedId,
        label: getCategoryLabel(report?.categoryName || getAiCategoryName(aiReport), MISSING_VALUE),
      });
    }
    return options;
  }, [aiReport, categories, currentCategoryId, report?.categoryName, selectedCategoryId]);

  return (
    <section className="admin-panel overflow-hidden border-t-[3px] border-t-emerald-500 shadow-[0_18px_44px_rgba(16,185,129,0.06)]" aria-labelledby="manager-review-confirmation">
      <ManagerSectionHeader
        id="manager-review-confirmation"
        title="Thông tin xác nhận"
        description="Quản lý kiểm tra và điều chỉnh dữ liệu được backend cho phép trước khi xác nhận."
        icon={Lucide.ClipboardPenLine}
        iconClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 shadow-[0_10px_24px_rgba(16,185,129,0.14)] dark:bg-emerald-950/45 dark:text-emerald-300 dark:ring-emerald-800"
        iconSize={20}
      />
      <div className="space-y-4 px-5 py-5">
        {decision ? <DecisionSuccess decision={decision} onBack={onBack} /> : null}

        {!decision ? (
          <>
            <label className="block" htmlFor="manager-review-category">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Danh mục xác nhận</span>
              <Select
                id="manager-review-category"
                value={selectedCategoryId}
                onChange={(event) => onCategoryChange(event.target.value)}
                disabled={!reviewable || submitting}
                className="mt-2 h-11"
              >
                <option value="">Chọn danh mục</option>
                {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </Select>
            </label>

            <label className="block" htmlFor="manager-review-priority">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mức ưu tiên xác nhận</span>
              <Select
                id="manager-review-priority"
                value={selectedPriority}
                onChange={(event) => onPriorityChange(event.target.value)}
                disabled={!reviewable || submitting}
                className="mt-2 h-11"
              >
                <option value="">Chọn mức ưu tiên</option>
                {PRIORITY_OPTIONS.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </Select>
            </label>

            <aside className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100" role="note">
              Nếu danh mục hoặc mức ưu tiên thay đổi, hệ thống sẽ lưu qua API chỉnh sửa phản ánh trước khi gọi API xác nhận.
            </aside>

            {actionError ? (
              <aside className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100" role="alert">
                <strong className="block">{actionError.title}</strong>
                {actionError.message}
              </aside>
            ) : null}

            {reviewable ? (
              <div className="space-y-2 pt-1">
                <Button type="button" size="md" className="w-full" disabled={submitting} onClick={() => onOpenDecision('verify')}>
                  <Lucide.BadgeCheck size={18} aria-hidden="true" />
                  Xác nhận phản ánh
                </Button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onOpenDecision('reject')}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <Lucide.XCircle size={18} aria-hidden="true" />
                  Từ chối phản ánh
                </button>
              </div>
            ) : (
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Phản ánh này không còn ở trạng thái chờ xác nhận sau phân tích AI nên không thể ra quyết định tại màn hình này.
              </aside>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function DecisionDialog({ mode, open, submitting, rejectNote, onRejectNoteChange, onClose, onSubmit, selectedCategoryLabel, selectedPriority }) {
  if (!open) return null;
  const verifying = mode === 'verify';
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} aria-label="Đóng hộp thoại" disabled={submitting} />
      <section role="dialog" aria-modal="true" aria-labelledby="manager-review-dialog-title" className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${verifying ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`} aria-hidden="true">
              {verifying ? <Lucide.BadgeCheck size={20} /> : <Lucide.XCircle size={20} />}
            </span>
            <div>
              <h2 id="manager-review-dialog-title" className="text-lg font-bold text-slate-950 dark:text-white">
                {verifying ? 'Xác nhận phản ánh' : 'Từ chối phản ánh'}
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {verifying
                  ? 'Kiểm tra lần cuối dữ liệu phân loại trước khi đưa phản ánh vào quy trình sự vụ.'
                  : 'Quyết định này chuyển phản ánh sang trạng thái bị từ chối.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Đóng">
            <Lucide.X size={18} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {verifying ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-950/30">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Danh mục</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedCategoryLabel}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-950/30">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Mức ưu tiên</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{getPriorityLabel(selectedPriority)}</dd>
                </div>
              </dl>
            ) : (
              <label className="block" htmlFor="manager-review-reject-note">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lý do từ chối <span className="text-rose-600">*</span></span>
                <textarea
                  id="manager-review-reject-note"
                  rows="4"
                  value={rejectNote}
                  onChange={(event) => onRejectNoteChange(event.target.value)}
                  placeholder="Nhập lý do để lưu cùng quyết định từ chối"
                  required
                  autoFocus
                  disabled={submitting}
                  className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-rose-900/40"
                />
              </label>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-950/30">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>Hủy</Button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${verifying ? 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-200' : 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-200'}`}
            >
              {submitting ? <Lucide.LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : null}
              {submitting ? 'Đang xử lý' : verifying ? 'Xác nhận phản ánh' : 'Xác nhận từ chối'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function ManagerReportReviewDetailPage() {
  const { feedbackId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialReport = location.state?.report;
  const initialReportMatches = String(initialReport?.feedbackId || initialReport?.id || '').toLowerCase() === String(feedbackId || '').toLowerCase();
  const [feedback, setFeedback] = useState(null);
  const [aiReport, setAiReport] = useState(initialReportMatches ? initialReport : null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [dialogMode, setDialogMode] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    let active = true;
    const loadDetail = async () => {
      setLoading(true);
      setLoadError('');
      setNotFound(false);

      const [detailResult, queueResult, categoryResult] = await Promise.allSettled([
        managementFeedbackApi.getFeedbackById(feedbackId),
        managementFeedbackApi.getAiReviewedFeedbackPage({
          pageNumber: 1,
          pageSize: 20,
          search: feedbackId,
        }),
        toolsApi.getCategories(),
      ]);

      if (!active) return;
      if (detailResult.status === 'rejected') {
        const status = Number(detailResult.reason?.status ?? detailResult.reason?.response?.status);
        if ([400, 404].includes(status)) setNotFound(true);
        else setLoadError(detailResult.reason?.message || 'Không thể tải phản ánh');
        setLoading(false);
        return;
      }

      if (!detailResult.value) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const liveQueueReport = queueResult.status === 'fulfilled'
        ? findReviewReport(queueResult.value?.items, feedbackId)
        : null;
      setFeedback(detailResult.value);
      if (liveQueueReport) setAiReport(liveQueueReport);
      setCategories(categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value) ? categoryResult.value : []);
      setLoading(false);
    };

    void loadDetail();
    return () => { active = false; };
  }, [feedbackId, reloadKey]);

  useEffect(() => {
    if (!feedback && !aiReport) return;
    setSelectedCategoryId(String(feedback?.categoryId ?? getAiCategoryId(aiReport) ?? ''));
    setSelectedPriority(getReviewPriority(feedback) || getReviewPriority(aiReport));
  }, [aiReport, feedback]);

  useEffect(() => {
    if (!dialogMode) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !submitting) setDialogMode('');
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [dialogMode, submitting]);

  const report = useMemo(() => ({ ...(aiReport || {}), ...(feedback || {}) }), [aiReport, feedback]);
  const returnPath = location.state?.from || '/manager/reports/review';

  const selectedCategoryLabel = useMemo(() => {
    const match = categories.find((category) => String(category?.categoryId ?? category?.id) === String(selectedCategoryId));
    return getCategoryLabel(match?.categoryName || match?.name || report?.categoryName || getAiCategoryName(aiReport), MISSING_VALUE);
  }, [aiReport, categories, report?.categoryName, selectedCategoryId]);

  const openDecision = (mode) => {
    setActionError(null);
    if (mode === 'verify') {
      if (!Number.isInteger(Number(selectedCategoryId)) || Number(selectedCategoryId) <= 0) {
        setActionError({
          title: 'Chưa đủ thông tin xác nhận',
          message: 'Vui lòng chọn danh mục hợp lệ trước khi xác nhận.',
        });
        return;
      }
      if (!selectedPriority) {
        setActionError({
          title: 'Chưa đủ thông tin xác nhận',
          message: 'Vui lòng chọn mức ưu tiên trước khi xác nhận.',
        });
        return;
      }
    }
    setRejectNote('');
    setDialogMode(mode);
  };

  const handleDecision = async (event) => {
    event.preventDefault();
    if (!dialogMode || submitting) return;
    if (dialogMode === 'reject' && !rejectNote.trim()) return;

    setSubmitting(true);
    setActionError(null);
    try {
      if (dialogMode === 'verify') {
        const changes = {};
        if (String(feedback?.categoryId ?? '') !== String(selectedCategoryId)) {
          changes.categoryId = Number(selectedCategoryId);
        }
        if (getReviewPriority(feedback) !== selectedPriority) {
          changes.priority = selectedPriority;
        }
        if (Object.keys(changes).length > 0) {
          await managementFeedbackApi.updateFeedback(feedbackId, changes);
        }

        const verifyResponse = await managementFeedbackApi.verifyFeedback(feedbackId);
        let refreshedFeedback = null;
        try {
          refreshedFeedback = await managementFeedbackApi.getFeedbackById(feedbackId);
        } catch {
          refreshedFeedback = null;
        }

        const nextFeedback = refreshedFeedback || {
          ...feedback,
          ...changes,
          status: managementTypes.feedbackStatus.VERIFIED,
        };
        setFeedback(nextFeedback);
        setDecision({
          type: 'verified',
          incidentId: getRelatedIncidentId(refreshedFeedback || verifyResponse || nextFeedback),
          returnPath,
        });
      } else {
        await managementFeedbackApi.updateStatus(feedbackId, {
          status: managementTypes.feedbackStatus.REJECTED,
          note: rejectNote.trim(),
        });
        setFeedback((current) => ({ ...current, status: managementTypes.feedbackStatus.REJECTED }));
        setDecision({ type: 'rejected', returnPath });
      }
      setDialogMode('');
    } catch (error) {
      setDialogMode('');
      setActionError({
        title: dialogMode === 'verify' ? 'Không thể xác nhận phản ánh' : 'Không thể từ chối phản ánh',
        message: error?.response?.data?.message
          || error?.response?.data?.title
          || error?.message
          || 'Đã xảy ra lỗi khi gửi quyết định. Vui lòng thử lại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !feedback) {
    return (
      <article className="admin-page-shell space-y-6">
        <ManagerPageHeader title="Chi tiết xác nhận phản ánh" description="Đang tải dữ liệu phản ánh và phân tích AI." icon={Lucide.ClipboardCheck} />
        <DetailSkeleton />
      </article>
    );
  }

  if (notFound) {
    return (
      <article className="admin-page-shell space-y-6">
        <EmptyState
          icon={Lucide.FileQuestion}
          title="Không tìm thấy phản ánh"
          description="Phản ánh không tồn tại hoặc không còn khả dụng trong phạm vi của bạn."
          action={<Button type="button" variant="outline" size="sm" onClick={() => navigate('/manager/reports/review')}>Về hàng chờ</Button>}
        />
      </article>
    );
  }

  if (loadError || !feedback) {
    return (
      <article className="admin-page-shell space-y-6">
        <EmptyState
          icon={Lucide.TriangleAlert}
          title="Không thể tải phản ánh"
          description={loadError || 'Đã xảy ra lỗi khi tải dữ liệu phản ánh.'}
          action={<Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((current) => current + 1)}><Lucide.RefreshCw size={16} aria-hidden="true" />Thử lại</Button>}
        />
      </article>
    );
  }

  return (
    <article className="admin-page-shell space-y-6">
      <nav className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium text-slate-500 dark:text-slate-400" aria-label="Đường dẫn trang">
        <Link to="/manager/reports/review" className="transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:hover:text-blue-300">
          Xác nhận phản ánh
        </Link>
        <Lucide.ChevronRight size={15} aria-hidden="true" />
        <span className="text-slate-800 dark:text-slate-200">Chi tiết phản ánh</span>
      </nav>

      <ManagerPageHeader
        title={report?.title || 'Chi tiết xác nhận phản ánh'}
        description={`${formatReportCode(feedbackId)} · Kiểm tra phản ánh và kết quả phân tích trước khi ra quyết định.`}
        icon={Lucide.ClipboardCheck}
        statusLabel="Trạng thái"
        statusValue={getStatusLabel(report?.status, MISSING_VALUE)}
        statusTone={isAiReviewedStatus(report?.status) ? 'review' : 'info'}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,0.8fr)]">
        <main className="space-y-5">
          <ReportInformationSection report={report} />
          <LocationSection report={report} />
          <EvidenceSection report={report} />
        </main>

        <aside className="space-y-5 xl:sticky xl:top-5">
          <AiAnalysisSection aiReport={aiReport} />
          <ConfirmationSection
            report={report}
            aiReport={aiReport}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            selectedPriority={selectedPriority}
            onCategoryChange={setSelectedCategoryId}
            onPriorityChange={setSelectedPriority}
            onOpenDecision={openDecision}
            actionError={actionError}
            submitting={submitting}
            decision={decision}
            onBack={() => navigate('/manager/reports/review')}
          />
        </aside>
      </div>

      <DecisionDialog
        mode={dialogMode}
        open={Boolean(dialogMode)}
        submitting={submitting}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
        onClose={() => {
          if (!submitting) setDialogMode('');
        }}
        onSubmit={handleDecision}
        selectedCategoryLabel={selectedCategoryLabel}
        selectedPriority={selectedPriority}
      />
    </article>
  );
}

export default ManagerReportReviewDetailPage;
