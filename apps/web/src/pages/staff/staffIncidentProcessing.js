const normalizeStatus = (value) => String(value ?? '')
  .trim()
  .replace(/[-_\s]+/g, '')
  .toLowerCase();

const STAGES = Object.freeze([
  Object.freeze({ id: 'assigned', label: 'Đã phân công' }),
  Object.freeze({ id: 'in-progress', label: 'Đang xử lý' }),
  Object.freeze({ id: 'submitted', label: 'Chờ Manager duyệt' }),
  Object.freeze({ id: 'approved', label: 'Đã duyệt' }),
]);

const STATUS_STAGE_INDEX = Object.freeze({
  assigned: 0,
  inprogress: 1,
  needrework: 1,
  submittedforapproval: 2,
  approved: 3,
  resolved: 3,
  closed: 3,
});

export const getIncidentProcessingSteps = (status) => {
  const normalizedStatus = normalizeStatus(status);
  const currentIndex = STATUS_STAGE_INDEX[normalizedStatus];
  const terminal = ['resolved', 'closed'].includes(normalizedStatus);

  return STAGES.map((stage, index) => ({
    ...stage,
    state: currentIndex === undefined
      ? 'pending'
      : index < currentIndex || terminal
        ? 'complete'
        : index === currentIndex
          ? 'current'
          : 'pending',
  }));
};

export const getIncidentNextActionCopy = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === 'assigned') {
    return 'Sự vụ đã được phân công và đang chờ Staff bắt đầu xử lý.';
  }
  if (normalizedStatus === 'inprogress') {
    return 'Sự vụ đang trong quá trình xử lý.';
  }
  if (normalizedStatus === 'submittedforapproval') {
    return 'Kết quả xử lý đang chờ Manager xem xét.';
  }
  if (normalizedStatus === 'needrework') {
    return 'Manager đã yêu cầu xử lý lại sự vụ.';
  }
  if (['approved', 'resolved', 'closed'].includes(normalizedStatus)) {
    return 'Sự vụ đã hoàn tất bước xử lý hiện tại.';
  }
  if (normalizedStatus === 'merged') {
    return 'Sự vụ đã được gộp và không còn là đầu việc xử lý độc lập.';
  }

  return 'Chưa xác định được hành động xử lý tiếp theo từ trạng thái hiện tại.';
};

const normalizeIdentifier = (value) => String(value ?? '').trim().toLowerCase();

export const isIncidentAssignedToCurrentStaff = (incident, currentUser) => {
  const assignedStaffUserId = normalizeIdentifier(incident?.assignedStaffUserId);
  const currentUserId = normalizeIdentifier(currentUser?.userId ?? currentUser?.id);

  return Boolean(assignedStaffUserId && currentUserId && assignedStaffUserId === currentUserId);
};

export const isAssignedToAnotherStaff = (incident, currentUser) => {
  const assignedStaffUserId = normalizeIdentifier(incident?.assignedStaffUserId);
  const currentUserId = normalizeIdentifier(currentUser?.userId ?? currentUser?.id);

  return Boolean(assignedStaffUserId && currentUserId && assignedStaffUserId !== currentUserId);
};

export const canStartIncidentProcessing = (incident, currentUser) => (
  isIncidentAssignedToCurrentStaff(incident, currentUser)
  && normalizeStatus(incident?.status) === 'assigned'
);

export const getStartProcessingDeniedMessage = (incident, currentUser) => {
  if (!incident) {
    return 'Backend đã từ chối quyền bắt đầu xử lý. Không thể tải lại sự vụ để kiểm tra phân công hiện tại.';
  }
  if (!isIncidentAssignedToCurrentStaff(incident, currentUser)) {
    return 'Backend đã từ chối thao tác vì sự vụ không còn được phân công cho tài khoản Staff hiện tại.';
  }
  if (normalizeStatus(incident?.status) !== 'assigned') {
    return 'Trạng thái sự vụ đã thay đổi và không còn là Đã phân công nên không thể bắt đầu xử lý lại.';
  }
  return 'Backend đã từ chối quyền SYSTEMSTAFF dù sự vụ đang ở trạng thái Đã phân công và thuộc tài khoản hiện tại. Cần kiểm tra policy của endpoint cập nhật trạng thái Incident.';
};

export const canManageIncidentExecution = (incident, currentUser) => (
  isIncidentAssignedToCurrentStaff(incident, currentUser)
  && ['assigned', 'inprogress', 'needrework'].includes(normalizeStatus(incident?.status))
);

const PROVIDER_STATUS_LABELS = Object.freeze({
  reported: 'Đã tiếp nhận',
  inprogress: 'Đang thực hiện',
  done: 'Hoàn thành',
  failed: 'Không hoàn thành',
  cancelled: 'Đã hủy',
});

export const getProviderStatusLabel = (status) => {
  if (status === null || status === undefined || status === '') return 'Chưa có dữ liệu';
  return PROVIDER_STATUS_LABELS[normalizeStatus(status)] || 'Chưa xác định';
};

export const getProviderStatusIntent = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'done') return 'success';
  if (['failed', 'cancelled'].includes(normalized)) return 'danger';
  if (normalized === 'inprogress') return 'info';
  if (normalized === 'reported') return 'warning';
  return 'neutral';
};
