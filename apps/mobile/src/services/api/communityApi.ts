import { axiosClient } from '@urbanmind/shared-api';

interface CommunityFeedParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categoryId?: string | number;
}

interface CommunityFeedResponse {
  items: any[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const resolveMediaUrl = (value: any) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${axiosClient.defaults.baseURL || 'https://api.urbanservice.me'}${trimmed}`;
  }
  return `${axiosClient.defaults.baseURL || 'https://api.urbanservice.me'}/${trimmed}`;
};

const normalizeAttachment = (attachment: any) => {
  if (typeof attachment === 'string') {
    return { fileUrl: resolveMediaUrl(attachment), url: resolveMediaUrl(attachment) };
  }

  const rawUrl = attachment?.fileUrl || attachment?.url || attachment?.path || attachment?.attachmentUrl || attachment?.displayUrl || '';
  const url = resolveMediaUrl(rawUrl);
  return {
    ...attachment,
    attachmentId: attachment?.attachmentId || attachment?.attachmentID || attachment?.feedbackAttachmentId || attachment?.fileId || attachment?.id || null,
    fileUrl: url,
    url,
  };
};

const normalizeFeedItem = (item: any) => {
  const id = item?.feedbackId ?? item?.id ?? item?.feedbackID ?? null;
  const title = item?.title ?? item?.subject ?? '';
  const description = item?.description ?? item?.content ?? item?.message ?? '';
  const locationText = item?.locationText ?? item?.address ?? item?.location ?? '';
  const attachments = Array.isArray(item?.attachments)
    ? item.attachments.map(normalizeAttachment)
    : Array.isArray(item?.attachmentList)
      ? item.attachmentList.map(normalizeAttachment)
      : [];

  const imageCandidates = [
    ...(Array.isArray(item?.imageUrls) ? item.imageUrls : []),
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.mediaUrls) ? item.mediaUrls : []),
    ...(Array.isArray(item?.attachments) ? item.attachments : []),
    ...(Array.isArray(item?.attachmentList) ? item.attachmentList : []),
  ];

  const imageUrl = resolveMediaUrl(
    attachments[0]?.fileUrl ||
    item?.imageUrl ||
    item?.coverImageUrl ||
    item?.thumbnailUrl ||
    item?.mediaUrl ||
    item?.attachmentUrl ||
    (typeof imageCandidates[0] === 'string' ? imageCandidates[0] : imageCandidates[0]?.fileUrl || imageCandidates[0]?.url || imageCandidates[0]?.path || '') ||
    ''
  );

  return {
    ...item,
    id,
    feedbackId: id,
    title,
    description,
    locationText,
    authorName: item?.authorName ?? item?.userName ?? item?.createdByName ?? item?.displayName ?? item?.fullName ?? item?.user?.userName ?? item?.user?.fullName ?? item?.user?.name ?? '',
    createdAt: item?.createdAt ?? item?.created_at ?? item?.updatedAt ?? null,
    attachments,
    imageUrl,
    supportCount: Number(item?.supportCount ?? item?.supports ?? item?.likeCount ?? item?.upvotes ?? 0),
    commentCount: Number(item?.commentCount ?? item?.commentsCount ?? item?.comment_count ?? item?.comments?.length ?? 0),
    isSupported: Boolean(item?.isSupported ?? item?.supported ?? item?.isLiked ?? false),
    latitude: item?.latitude ?? item?.lat ?? null,
    longitude: item?.longitude ?? item?.lng ?? item?.lon ?? null,
  };
};

const normalizeFeedPayload = (value: any): CommunityFeedResponse => {
  const unwrappedValue = value?.data && !Array.isArray(value.data) && typeof value.data === 'object'
    ? value.data
    : value;

  if (Array.isArray(unwrappedValue)) {
    return {
      items: unwrappedValue.map(normalizeFeedItem),
      pageNumber: 1,
      pageSize: unwrappedValue.length,
      totalItems: unwrappedValue.length,
      totalPages: 1,
    };
  }

  if (!unwrappedValue || typeof unwrappedValue !== 'object') {
    return {
      items: [],
      pageNumber: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 1,
    };
  }

  const items = Array.isArray(unwrappedValue.items)
    ? unwrappedValue.items
    : Array.isArray(unwrappedValue.data)
      ? unwrappedValue.data
      : Array.isArray(unwrappedValue.content)
        ? unwrappedValue.content
        : Array.isArray(unwrappedValue.feedbacks)
          ? unwrappedValue.feedbacks
          : Array.isArray(unwrappedValue.results)
            ? unwrappedValue.results
            : [];

  const pageNumber = Number(unwrappedValue.pageNumber ?? unwrappedValue.page ?? 1);
  const pageSize = Number(unwrappedValue.pageSize ?? unwrappedValue.size ?? items.length);
  const totalItems = Number(unwrappedValue.totalItems ?? unwrappedValue.totalCount ?? unwrappedValue.count ?? items.length);
  const totalPages = Number(
    unwrappedValue.totalPages ?? unwrappedValue.pageCount ?? (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1)
  );

  return {
    items: items.map(normalizeFeedItem),
    pageNumber: Number.isFinite(pageNumber) ? pageNumber : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : items.length,
    totalItems: Number.isFinite(totalItems) ? totalItems : items.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
};

const normalizeFeedParams = (params: CommunityFeedParams = {}) => {
  const normalized: Record<string, any> = {};
  const pageNumber = Number(params?.pageNumber ?? 1);
  const pageSize = Number(params?.pageSize ?? 10);
  const status = params?.status;
  const categoryId = params?.categoryId;
  const search = params?.search;

  if (Number.isFinite(pageNumber) && pageNumber > 0) {
    normalized.PageNumber = pageNumber;
  }

  if (Number.isFinite(pageSize) && pageSize > 0) {
    normalized.PageSize = pageSize;
  }

  if (typeof status === 'string' && status.trim()) {
    normalized.Status = status.trim();
  }

  if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
    normalized.CategoryId = categoryId;
  }

  if (typeof search === 'string' && search.trim()) {
    normalized.Search = search.trim();
  }

  return normalized;
};

const resolveFeedItemImages = async (item: any) => {
  if (item?.imageUrl || !item?.feedbackId) return item;

  const attachmentCount = Number(item?.attachmentCount ?? item?.attachments?.length ?? 0);
  if (!attachmentCount) return item;

  try {
    const response = await axiosClient.get(`/api/user/feedbacks/feed/${encodeURIComponent(item.feedbackId)}`);
    const detail = response?.data && typeof response.data === 'object' ? response.data : response;
    return normalizeFeedItem(detail);
  } catch {
    return item;
  }
};

export const communityApi = {
  async getFeed(params: CommunityFeedParams = {}) {
    const normalizedParams = normalizeFeedParams(params);
    const response = await axiosClient.get('/api/user/feedbacks/feed', {
      params: normalizedParams,
    });

    const payload = normalizeFeedPayload(response);
    const itemsWithImages = await Promise.all(payload.items.map(resolveFeedItemImages));

    return {
      ...payload,
      items: itemsWithImages,
    };
  },

  async getFeedDetail(feedbackId: string) {
    if (!feedbackId) {
      throw new Error('Feedback ID is required.');
    }

    const response = await axiosClient.get(
      `/api/user/feedbacks/feed/${encodeURIComponent(feedbackId)}`
    );

    const detail = response?.data && typeof response.data === 'object'
      ? response.data
      : response;

    return normalizeFeedItem(detail);
  },
};

export default communityApi;
