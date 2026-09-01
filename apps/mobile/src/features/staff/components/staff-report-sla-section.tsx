import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { staffError } from '../staff-api';
import {
  formatSlaRemaining,
  normalizeReportSlaTargets,
  slaStatusLabel,
  type StaffFeedbackSlaStatus,
  type StaffSlaMetric,
  type StaffSlaReportInput,
  type StaffSlaReportTarget,
} from '../staff-sla-models';
import { useStaffReportSlaQueries } from '../staff-sla-query';
import {
  Button,
  Label,
  Notice,
  Section,
  colors,
  panelStyle,
} from './staff-ui';

type StaffReportSlaSectionProps = {
  userId: string;
  incidentId: string;
  reports: readonly StaffSlaReportInput[];
};

type QueryResult = ReturnType<typeof useStaffReportSlaQueries>[number];

const reportCode = (feedbackId: string) =>
  `UM-${feedbackId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const formatDueAt = (value: string) => {
  if (!value || Number.isNaN(Date.parse(value))) return 'Chưa có thời hạn';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function SlaBadge({ data }: { data: StaffFeedbackSlaStatus }) {
  const breached = data.response.breached || data.resolution.breached;
  const warning = data.response.warning || data.resolution.warning;
  const backgroundColor = breached
    ? colors.redLight
    : warning
      ? colors.amberLight
      : colors.primarySoft;
  const color = breached
    ? colors.redDark
    : warning
      ? colors.amberDark
      : colors.primaryDark;

  return <View style={{ alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 8, backgroundColor, paddingHorizontal: 10, paddingVertical: 5 }}>
    <Label bold size={12} style={{ color }}>
      {breached ? 'Có chỉ tiêu vi phạm' : warning ? 'Có chỉ tiêu sắp đến hạn' : slaStatusLabel(data.status)}
    </Label>
  </View>;
}

function MetricProgress({ metric }: { metric: StaffSlaMetric }) {
  const percent = metric.progressPercent;
  const progress = percent ?? 0;
  const completed = ['completed', 'resolved', 'met', 'done']
    .includes(metric.status.replace(/[\s_-]/g, '').toLowerCase());
  const tone = metric.breached
    ? colors.red
    : metric.warning
      ? colors.amber
      : colors.primary;
  const stateLabel = metric.breached
    ? 'Vi phạm'
    : metric.warning
      ? 'Sắp đến hạn'
      : slaStatusLabel(metric.status);

  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Label bold size={13}>{stateLabel}</Label>
      <Label bold size={13} style={{ color: tone, fontVariant: ['tabular-nums'] }}>
        {completed
          ? metric.breached ? 'Hoàn thành quá hạn' : 'Hoàn thành đúng hạn'
          : formatSlaRemaining(metric.remainingSeconds, metric.breached)}
      </Label>
    </View>
    {percent !== null && <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Tiến độ SLA ${Math.round(percent)} phần trăm`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={{ height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: colors.borderLight }}
    >
      <View style={{ height: '100%', width: `${progress}%`, borderRadius: 999, backgroundColor: tone }} />
    </View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
      <Label muted size={12}>Hạn: {formatDueAt(metric.dueAt)}</Label>
      {percent !== null && <Label muted size={12} style={{ fontVariant: ['tabular-nums'] }}>{Math.round(percent)}%</Label>}
    </View>
  </View>;
}

function ReportHeader({ report }: { report: StaffSlaReportTarget }) {
  return <View style={{ gap: 4, minWidth: 0 }}>
    <Label muted bold size={12}>{reportCode(report.feedbackId)}</Label>
    <Label bold size={16}>{report.title}</Label>
    {report.feedbackStatus ? <Label muted size={12}>Report: {report.feedbackStatus}</Label> : null}
  </View>;
}

function ReportSlaCard({ report, query }: { report: StaffSlaReportTarget; query: QueryResult }) {
  return <View style={{ ...panelStyle, gap: 16 }}>
    <ReportHeader report={report} />
    {query.isPending ? <View accessibilityLabel="Đang tải SLA của Report" style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.primary} />
      <Label muted size={13}>Đang tải SLA…</Label>
    </View> : query.error ? <View style={{ gap: 12 }}>
      <Notice error>{staffError(query.error)}</Notice>
      <Button secondary label="Tải lại SLA Report" onPress={() => { void query.refetch(); }} />
    </View> : !query.data ? <Notice>Report này chưa có SLA đang áp dụng.</Notice> : <>
      <SlaBadge data={query.data} />
      <View style={{ gap: 10 }}>
        <Label bold size={14}>Phản hồi lần đầu</Label>
        <MetricProgress metric={query.data.response} />
      </View>
      <View style={{ height: 1, backgroundColor: colors.borderLight }} />
      <View style={{ gap: 10 }}>
        <Label bold size={14}>Hoàn thành xử lý</Label>
        <MetricProgress metric={query.data.resolution} />
      </View>
      {query.isFetching ? <Label muted size={12}>Đang cập nhật dữ liệu SLA…</Label> : null}
    </>}
  </View>;
}

/**
 * Read-only SLA panel for an Incident's embedded Reports. Integrate it inside
 * the Incident overview/reports tab; do not label these values as Incident SLA.
 */
export function StaffReportSlaSection({
  userId,
  incidentId,
  reports,
}: StaffReportSlaSectionProps) {
  const targets = useMemo(() => normalizeReportSlaTargets(reports), [reports]);
  const queries = useStaffReportSlaQueries({ userId, incidentId, reports: targets });

  return <Section title="SLA theo từng Report">
    <Label muted size={13}>
      Mỗi Report có đồng hồ SLA riêng do backend tính toán; thời hạn dưới đây không phải SLA tổng hợp của sự vụ.
    </Label>
    {!userId.trim() || !incidentId.trim() ? <Notice error>Không xác định được phạm vi Staff hoặc sự vụ để tải SLA.</Notice> : targets.length === 0 ? <View style={{ ...panelStyle, alignItems: 'center' }}>
      <Label muted style={{ textAlign: 'center' }}>Sự vụ chưa có Report đang liên kết để hiển thị SLA.</Label>
    </View> : targets.map((report, index) => <ReportSlaCard
      key={report.feedbackId}
      report={report}
      query={queries[index]}
    />)}
  </Section>;
}
