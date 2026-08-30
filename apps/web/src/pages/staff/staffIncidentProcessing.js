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

export const isAssignedToAnotherStaff = (incident, currentUser) => {
  const assignedStaffUserId = String(incident?.assignedStaffUserId ?? '').trim().toLowerCase();
  const currentUserId = String(currentUser?.userId ?? currentUser?.id ?? '').trim().toLowerCase();

  return Boolean(assignedStaffUserId && currentUserId && assignedStaffUserId !== currentUserId);
};
