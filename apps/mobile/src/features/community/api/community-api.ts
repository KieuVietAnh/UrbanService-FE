import { axiosClient, toolsApi } from '@urbanmind/shared-api';
import type { CommunityFeedItem, CommunityFeedParams, CommunityFeedResponse } from '../types/community.types';

type ApiRecord = Record<string, unknown>;

const isApiRecord = (value: unknown): value is ApiRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const resolveMediaUrl = (value: unknown) => {
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

const normalizeAttachment = (attachment: unknown) => {
  if (typeof attachment === 'string') {
    return { fileUrl: resolveMediaUrl(attachment), url: resolveMediaUrl(attachment) };
  }

  const record = isApiRecord(attachment) ? attachment : {};
  const rawUrl = record.fileUrl || record.url || record.path || record.attachmentUrl || record.displayUrl || '';
  const url = resolveMediaUrl(rawUrl);
  return {
    ...record,
    attachmentId: record.attachmentId || record.attachmentID || record.feedbackAttachmentId || record.fileId || record.id || null,
    fileUrl: url,
    url,
  };
};

const normalizeFeedItem = (item: unknown): CommunityFeedItem => {
  const record = isApiRecord(item) ? item : {};
  const user = isApiRecord(record.user) ? record.user : {};
  const id = record.feedbackId ?? record.id ?? record.feedbackID ?? null;
  const title = record.title ?? record.subject ?? '';
  const description = record.description ?? record.content ?? record.message ?? '';
  const locationText = record.locationText ?? record.address ?? record.location ?? '';
  const attachments = Array.isArray(record.attachments)
    ? record.attachments.map(normalizeAttachment)
    : Array.isArray(record.attachmentList)
      ? record.attachmentList.map(normalizeAttachment)
      : [];

  const imageCandidates = [
    ...(Array.isArray(record.imageUrls) ? record.imageUrls : []),
    ...(Array.isArray(record.images) ? record.images : []),
    ...(Array.isArray(record.mediaUrls) ? record.mediaUrls : []),
    ...(Array.isArray(record.attachments) ? record.attachments : []),
    ...(Array.isArray(record.attachmentList) ? record.attachmentList : []),
  ];

  const firstImage = imageCandidates[0];
  const firstImageRecord = isApiRecord(firstImage) ? firstImage : {};

  const imageUrl = resolveMediaUrl(
    attachments[0]?.fileUrl ||
    record.imageUrl ||
    record.coverImageUrl ||
    record.thumbnailUrl ||
    record.mediaUrl ||
    record.attachmentUrl ||
    (typeof firstImage === 'string' ? firstImage : firstImageRecord.fileUrl || firstImageRecord.url || firstImageRecord.path || '') ||
    ''
  );

  return {
    ...record,
    id,
    feedbackId: id,
    title,
    description,
    locationText,
    authorName: record.authorName ?? record.userName ?? record.createdByName ?? record.displayName ?? record.fullName ?? user.userName ?? user.fullName ?? user.name ?? '',
    createdAt: record.createdAt ?? record.created_at ?? record.updatedAt ?? null,
    attachments,
    imageUrl,
    supportCount: Number(record.supportCount ?? record.supports ?? record.likeCount ?? record.upvotes ?? 0),
    commentCount: Number(record.commentCount ?? record.commentsCount ?? record.comment_count ?? (Array.isArray(record.comments) ? record.comments.length : 0)),
    isSupported: Boolean(record.isSupported ?? record.supported ?? record.isLiked ?? false),
    latitude: record.latitude ?? record.lat ?? null,
    longitude: record.longitude ?? record.lng ?? record.lon ?? null,
  } as CommunityFeedItem;
};

const normalizeFeedPayload = (value: unknown): CommunityFeedResponse => {
  const valueRecord = isApiRecord(value) ? value : null;
  const unwrappedValue = valueRecord && isApiRecord(valueRecord.data)
    ? valueRecord.data
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

  if (!isApiRecord(unwrappedValue)) {
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
  const normalized: Record<string, string | number> = {};
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

const resolveFeedItemImages = async (item: CommunityFeedItem) => {
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
  async getAreas() {
    return toolsApi.getAreas({}, { throwOnError: true });
  },

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
