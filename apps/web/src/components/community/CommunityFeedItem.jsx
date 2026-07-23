import { memo, useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { getAttachmentUrl } from '@urbanmind/shared-utils';
import { managementTypes } from '@urbanmind/shared-types';
import SupportButton from './SupportButton';

const loadedMediaUrls = new Set();
const mediaKeepers = new Map();

const rememberLoadedMedia = (mediaUrl, mediaElement) => {
  if (!mediaUrl) return;

  loadedMediaUrls.add(mediaUrl);

  if (mediaKeepers.has(mediaUrl)) return;

  if (mediaElement?.cloneNode) {
    mediaKeepers.set(mediaUrl, mediaElement.cloneNode(false));
    return;
  }

  if (typeof Image !== 'undefined') {
    const keeper = new Image();
    keeper.src = mediaUrl;
    mediaKeepers.set(mediaUrl, keeper);
  }
};

const STATUS_META = {
  [managementTypes.feedbackStatus.VERIFIED]: {
    label: 'Đã xác minh',
    className: 'border-info/20 bg-info/10 text-info',
    accentClassName: 'bg-info',
    icon: Lucide.BadgeCheck,
  },
  [managementTypes.feedbackStatus.ASSIGNED]: {
    label: 'Đã chuyển xử lý',
    className: 'border-secondary/20 bg-secondary/10 text-secondary',
    accentClassName: 'bg-secondary',
    icon: Lucide.SendToBack,
  },
  [managementTypes.feedbackStatus.IN_PROGRESS]: {
    label: 'Đang xử lý',
    className: 'border-warning/25 bg-warning/10 text-warning',
    accentClassName: 'bg-warning',
    icon: Lucide.LoaderCircle,
  },
  [managementTypes.feedbackStatus.RESOLVED]: {
    label: 'Đã có kết quả',
    className: 'border-success/20 bg-success/10 text-success',
    accentClassName: 'bg-success',
    icon: Lucide.ClipboardCheck,
  },
  [managementTypes.feedbackStatus.SUBMITTED_FOR_APPROVAL]: {
    label: 'Đang kiểm tra kết quả',
    className: 'border-secondary/20 bg-secondary/10 text-secondary',
    accentClassName: 'bg-secondary',
    icon: Lucide.SearchCheck,
  },
  [managementTypes.feedbackStatus.APPROVED]: {
    label: 'Chờ bạn đánh giá',
    className: 'border-success/20 bg-success/10 text-success',
    accentClassName: 'bg-success',
    icon: Lucide.Star,
  },
  [managementTypes.feedbackStatus.CLOSED]: {
    label: 'Đã kết thúc',
    className: 'border-success/25 bg-success/10 text-success',
    accentClassName: 'bg-success',
    icon: Lucide.CircleCheckBig,
  },
};

const getItemId = (item) => (
  item?.feedbackId ||
  item?.id ||
  item?.ticketId
);

const getAuthorName = (item) => (
  item?.userName ||
  item?.reporterName ||
  item?.createdByName ||
  'Người dân'
);

const getAreaName = (item) => (
  item?.areaName ||
  item?.wardName ||
  item?.districtName ||
  item?.locationText ||
  'Chưa xác định khu vực'
);

const CATEGORY_LABELS = {
  'garbage collection': 'Thu gom rác',
  'waste management': 'Quản lý chất thải',
  'road maintenance': 'Bảo trì đường bộ',
  'street lighting': 'Chiếu sáng đô thị',
  drainage: 'Thoát nước',
  'water supply': 'Cấp nước',
  'public safety': 'An toàn công cộng',
};

const translateCategoryName = (categoryName) => {
  const normalizedCategory = String(categoryName || '')
    .trim()
    .toLocaleLowerCase('en-US');

  return CATEGORY_LABELS[normalizedCategory] || categoryName;
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa rõ thời gian';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const isVideoAttachment = (attachment) => {
  const raw = typeof attachment === 'string'
    ? attachment
    : (
        attachment?.fileUrl ||
        attachment?.url ||
        attachment?.path ||
        attachment?.attachmentUrl ||
        ''
      );
  const mimeType = String(
    attachment?.mimeType ||
    attachment?.contentType ||
    attachment?.fileType ||
    ''
  ).toLowerCase();
  const normalized = String(raw)
    .toLowerCase()
    .split('?')[0];

  return (
    mimeType.startsWith('video/') ||
    ['.mp4', '.webm', '.ogg', '.mov', '.m4v']
      .some((extension) => normalized.endsWith(extension))
  );
};

const MediaTile = ({
  attachment,
  itemTitle,
  index,
  onOpen,
  priority = false,
  className = '',
}) => {
  const mediaUrl = getAttachmentUrl(attachment);
  const video = isVideoAttachment(attachment);
  const [mediaStatus, setMediaStatus] = useState(() => (
    mediaUrl
      ? (loadedMediaUrls.has(mediaUrl) ? 'ready' : 'loading')
      : 'error'
  ));

  useEffect(() => {
    setMediaStatus(
      mediaUrl
        ? (loadedMediaUrls.has(mediaUrl) ? 'ready' : 'loading')
        : 'error'
    );

    if (!mediaUrl || loadedMediaUrls.has(mediaUrl)) return undefined;

    const timeoutId = globalThis.setTimeout(() => {
      setMediaStatus((currentStatus) => (
        currentStatus === 'loading' ? 'error' : currentStatus
      ));
    }, 15000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [mediaUrl]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group/media relative min-h-0 overflow-hidden bg-base-200 text-left ${className}`}
      aria-label={`Mở ${itemTitle || `minh chứng ${index + 1}`}`}
    >
      {mediaUrl ? (
        <>
          {video ? (
            <>
              <video
                src={mediaUrl}
                className={`h-full w-full object-cover transition-opacity duration-200 ${
                  mediaStatus === 'ready' ? 'opacity-100' : 'opacity-0'
                }`}
                muted
                playsInline
                preload="metadata"
                onLoadedData={(event) => {
                  rememberLoadedMedia(mediaUrl, event.currentTarget);
                  setMediaStatus('ready');
                }}
                onError={() => {
                  loadedMediaUrls.delete(mediaUrl);
                  mediaKeepers.delete(mediaUrl);
                  setMediaStatus('error');
                }}
              />
              {mediaStatus === 'ready' ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition group-hover/media:bg-black/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 shadow-lg backdrop-blur">
                    <Lucide.Play
                      size={17}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            <img
              src={mediaUrl}
              alt={itemTitle || `Minh chứng ${index + 1}`}
              className={`h-full w-full object-cover transition duration-200 group-hover/media:scale-[1.012] ${
                mediaStatus === 'ready' ? 'opacity-100' : 'opacity-0'
              }`}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={(event) => {
                rememberLoadedMedia(mediaUrl, event.currentTarget);
                setMediaStatus('ready');
              }}
              onError={() => {
                loadedMediaUrls.delete(mediaUrl);
                mediaKeepers.delete(mediaUrl);
                setMediaStatus('error');
              }}
            />
          )}

          {mediaStatus === 'loading' ? (
            <span className="absolute inset-0 animate-pulse bg-base-300/55" aria-hidden="true">
              <span className="absolute inset-x-6 bottom-5 h-3 rounded-full bg-base-100/55" />
              <span className="absolute bottom-10 left-6 h-3 w-2/5 rounded-full bg-base-100/45" />
            </span>
          ) : null}

          {mediaStatus === 'error' ? (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-base-200 px-4 text-center text-sm text-base-content/45">
              <Lucide.ImageOff size={19} aria-hidden="true" />
              Không thể hiển thị tệp
            </span>
          ) : null}
        </>
      ) : (
        <span className="flex h-full min-h-28 items-center justify-center text-sm text-base-content/40">
          Không thể hiển thị tệp
        </span>
      )}
    </button>
  );
};

const CommunityFeedItem = ({
  item,
  priority = false,
  highlighted = false,
  onOpenComments,
  onOpen,
}) => {
  const feedbackId = getItemId(item);
  const attachments = Array.isArray(item?.attachments)
    ? item.attachments
    : [];
  const fallbackAttachment = (
    item?.imageUrl ||
    item?.image ||
    item?.coverImageUrl ||
    item?.thumbnailUrl ||
    item?.mediaUrl ||
    item?.attachmentUrl
  );
  const mediaItems = attachments.length > 0
    ? attachments
    : fallbackAttachment
      ? [fallbackAttachment]
      : [];
  const mediaState = item?.__mediaState || (
    mediaItems.length > 0
      ? 'ready'
      : Number(item?.attachmentCount || 0) > 0
        ? 'loading'
        : 'empty'
  );
  const authorName = getAuthorName(item);
  const areaName = getAreaName(item);
  const statusMeta = STATUS_META[item?.status] || {
    label: 'Đang cập nhật',
    className: 'border-base-300 bg-base-200 text-base-content/60',
    accentClassName: 'bg-base-content/25',
    icon: Lucide.Clock3,
  };
  const StatusIcon = statusMeta.icon;
  const commentCount = item?.commentCount ?? (
    Array.isArray(item?.comments)
      ? item.comments.length
      : 0
  );
  const categoryName = translateCategoryName(
    item?.categoryName || item?.category?.name
  );

  const handleComments = (event) => {
    event.stopPropagation();
    onOpenComments(feedbackId);
  };

  return (
    <article
      data-community-feedback-id={feedbackId}
      className={`relative overflow-hidden rounded-[26px] border bg-base-100 shadow-[0_8px_24px_rgba(15,23,42,0.055)] transition duration-200 hover:border-primary/18 hover:shadow-[0_12px_28px_rgba(15,23,42,0.075)] ${
        highlighted
          ? 'border-primary/45 ring-2 ring-primary/20'
          : 'border-base-300'
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-[3px] ${statusMeta.accentClassName}`}
        aria-hidden="true"
      />

      <header className="flex items-start justify-between gap-3 px-5 pb-2.5 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-content shadow-sm">
            {authorName.charAt(0).toUpperCase()}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {authorName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/48">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Lucide.MapPin
                  size={13}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {areaName}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lucide.Clock3 size={13} aria-hidden="true" />
                {formatDateTime(
                  item?.createdAt ||
                  item?.createdDate
                )}
              </span>
            </div>
          </div>
        </div>

        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.className}`}>
          <StatusIcon size={13} aria-hidden="true" />
          {statusMeta.label}
        </span>
      </header>

      <div className="px-5 pb-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {categoryName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/8 px-2.5 py-1 text-[11px] font-semibold text-secondary">
              <Lucide.Tag size={12} aria-hidden="true" />
              {categoryName}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-2 block w-full text-left"
        >
          <h2 className="text-lg font-bold leading-7 tracking-tight transition hover:text-primary sm:text-xl">
            {item?.title || 'Phản ánh đô thị'}
          </h2>
        </button>

        {item?.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-base-content/58">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="px-5 sm:px-6">
        {mediaState === 'loading' ? (
          <div
            className="h-44 animate-pulse overflow-hidden rounded-2xl border border-base-300 bg-base-300/45 sm:h-52"
            role="status"
            aria-label="Đang tải hình ảnh minh chứng"
          >
            <span className="sr-only">Đang tải hình ảnh minh chứng</span>
            <div className="mx-6 mt-6 h-3 w-2/5 rounded-full bg-base-100/55" />
            <div className="mx-6 mt-3 h-3 w-3/5 rounded-full bg-base-100/45" />
          </div>
        ) : mediaState === 'error' ? (
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-error/25 bg-error/5 px-4 text-center text-sm text-base-content/50 sm:h-52"
          >
            <Lucide.ImageOff size={20} className="text-error/60" aria-hidden="true" />
            <span className="font-semibold">Không thể tải hình ảnh</span>
            <span className="text-xs text-base-content/40">Mở chi tiết để thử lại</span>
          </button>
        ) : mediaItems.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex h-44 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-base-300 bg-base-200/30 text-sm text-base-content/42 sm:h-52"
          >
            <Lucide.ImageOff size={18} aria-hidden="true" />
            Chưa có hình ảnh công khai
          </button>
        ) : mediaItems.length === 1 ? (
          <div className="h-44 overflow-hidden rounded-2xl border border-base-300 sm:h-52">
            <MediaTile
              attachment={mediaItems[0]}
              itemTitle={item?.title}
              index={0}
              priority={priority}
              onOpen={() => onOpen(item)}
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="grid h-44 grid-cols-[minmax(0,1.7fr)_minmax(110px,0.7fr)] gap-1 overflow-hidden rounded-2xl border border-base-300 sm:h-52">
            <MediaTile
              attachment={mediaItems[0]}
              itemTitle={item?.title}
              index={0}
              priority={priority}
              onOpen={() => onOpen(item)}
              className="h-full w-full"
            />

            <div className="grid min-h-0 grid-rows-2 gap-1">
              <MediaTile
                attachment={mediaItems[1]}
                itemTitle={item?.title}
                index={1}
                onOpen={() => onOpen(item)}
                className="h-full w-full"
              />

              <div className="relative min-h-0 overflow-hidden">
                {mediaItems[2] ? (
                  <MediaTile
                    attachment={mediaItems[2]}
                    itemTitle={item?.title}
                    index={2}
                    onOpen={() => onOpen(item)}
                    className="h-full w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex h-full w-full items-center justify-center bg-base-200 text-sm font-semibold text-base-content/45"
                  >
                    Xem chi tiết
                  </button>
                )}

                {mediaItems.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white backdrop-blur-[1px] transition hover:bg-black/65"
                    aria-label={`Xem thêm ${mediaItems.length - 3} tệp`}
                  >
                    +{mediaItems.length - 3}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-base-300 bg-base-200/20 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <SupportButton
            feedbackId={feedbackId}
            initialCount={
              item?.supportCount ||
              item?.supports ||
              0
            }
            initialSupported={
              item?.isSupportedByCurrentUser
            }
            className="h-9"
          />
          <button
            type="button"
            onClick={handleComments}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3 text-sm font-semibold text-base-content/58 transition hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <Lucide.MessageCircle
              size={16}
              aria-hidden="true"
            />
            {commentCount}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary transition hover:bg-primary/8"
        >
          Xem chi tiết
          <Lucide.ArrowRight
            size={16}
            aria-hidden="true"
          />
        </button>
      </footer>
    </article>
  );
};

export default memo(CommunityFeedItem);
