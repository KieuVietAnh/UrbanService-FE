import { managementTypes } from '@urbanmind/shared-types';

export const getApprovalQueueStatus = (item = {}) => {
  const status = item?.status;
  if (status === managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL) {
    return 'awaiting';
  }
  return 'other';
};

export const getApprovalQueueTitle = (item = {}) => {
  if (item?.title) return item.title;
  if (item?.description) return item.description;
  return 'Phản ánh cần xem xét';
};
