const getTextValue = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return String(value);
};

export const normalizeDuplicateCandidatePayload = (candidate = {}) => {
  const primaryFeedback = candidate?.primaryFeedback || candidate?.primary || candidate?.feedback || null;
  const duplicateFeedback = candidate?.duplicateFeedback || candidate?.duplicate || candidate?.potentialParentFeedback || candidate?.potentialParent || null;

  return {
    ...candidate,
    primaryFeedback: primaryFeedback ? {
      ...primaryFeedback,
      title: getTextValue(primaryFeedback?.title, 'Không có tiêu đề'),
      description: getTextValue(primaryFeedback?.description ?? primaryFeedback?.details ?? primaryFeedback?.content, 'Không có mô tả'),
      categoryName: getTextValue(primaryFeedback?.categoryName || primaryFeedback?.category?.name || primaryFeedback?.categoryType || primaryFeedback?.type, '—'),
      locationText: getTextValue(primaryFeedback?.locationText || primaryFeedback?.location || primaryFeedback?.address, '—'),
      reporterName: getTextValue(primaryFeedback?.reporterName || primaryFeedback?.userName || primaryFeedback?.reporter?.name, '—'),
      status: getTextValue(primaryFeedback?.status, '—'),
    } : null,
    duplicateFeedback: duplicateFeedback ? {
      ...duplicateFeedback,
      title: getTextValue(duplicateFeedback?.title, 'Không có tiêu đề'),
      description: getTextValue(duplicateFeedback?.description ?? duplicateFeedback?.details ?? duplicateFeedback?.content, 'Không có mô tả'),
      categoryName: getTextValue(duplicateFeedback?.categoryName || duplicateFeedback?.category?.name || duplicateFeedback?.categoryType || duplicateFeedback?.type, '—'),
      locationText: getTextValue(duplicateFeedback?.locationText || duplicateFeedback?.location || duplicateFeedback?.address, '—'),
      reporterName: getTextValue(duplicateFeedback?.reporterName || duplicateFeedback?.userName || duplicateFeedback?.reporter?.name, '—'),
      status: getTextValue(duplicateFeedback?.status, '—'),
    } : null,
  };
};

export const getCandidateReasoning = (candidate = {}) => {
  const reasoningCandidates = [
    candidate?.reasoning,
    candidate?.duplicateReasoning,
    candidate?.analysis?.reasoning,
    candidate?.details?.reasoning,
    candidate?.metadata?.reasoning,
    candidate?.reason,
  ];

  return reasoningCandidates.find((value) => typeof value === 'string' && value.trim()) || '';
};
