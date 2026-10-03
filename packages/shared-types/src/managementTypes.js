export const managementTypes = {
  feedbackStatus: {
    SUBMITTED: 'Submitted',
    AI_REVIEWED: 'AI Reviewed',
    VERIFIED: 'Verified',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'InProgress',
    RESOLVED: 'Resolved',
    SUBMITTED_FOR_APPROVAL: 'SubmittedForApproval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    NEED_REWORK: 'NeedRework',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  },

  statusFlow: {
    // Backend cho phép xác minh thẳng từ Submitted, không bắt buộc qua AI. Thiếu
    // 'Verified' ở đây thì phản ánh kẹt lại khi AI lỗi và không ai duyệt được.
    'Submitted': ['AI Reviewed', 'Verified', 'Rejected'],
    'AI Reviewed': ['Verified', 'Rejected'],
    'Verified': ['Assigned', 'Rejected'],
    'Assigned': ['InProgress', 'Rejected'],
    'InProgress': ['SubmittedForApproval', 'NeedRework'],
    'SubmittedForApproval': ['Approved', 'NeedRework'],
    'Approved': ['Closed'],
    'NeedRework': ['InProgress', 'Rejected'],
    'Rejected': [],
    'Cancelled': [],
  },

  updatePayload: {
    edit: {
      categoryId: 0,
      title: '',
      description: '',
      locationText: '',
      latitude: 0,
      longitude: 0,
      priority: '',
      dueDate: '',
    },
    status: {
      status: '',
      note: '',
    },
    assignment: {
      feedbackId: '',
      operatorId: '',
      staffUserId: '',
      note: '',
    },
  },
};
