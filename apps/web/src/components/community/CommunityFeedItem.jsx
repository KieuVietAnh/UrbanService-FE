import { memo } from 'react';
import { getAttachmentUrl } from '@urbanmind/shared-utils';
import SupportButton from './SupportButton';
import { getStatusLabel, managementTypes } from '@urbanmind/shared-types';

const CommunityFeedItem = ({ item, onOpenComments, onOpen }) => {
  const attachments = Array.isArray(item?.attachments) ? item.attachments : [];
  const firstAttachment = attachments[0] || item?.imageUrl || item?.image || item?.coverImageUrl || item?.thumbnailUrl || item?.mediaUrl || item?.attachmentUrl;
  const imageUrl = firstAttachment ? getAttachmentUrl(firstAttachment) : null;
  const dateText = item.createdAt || item.createdDate ? new Date(item.createdAt || item.createdDate).toLocaleString() : 'Không rõ';

  const statusClassMap = {
    [managementTypes.feedbackStatus.SUBMITTED]: 'bg-blue-50 text-blue-700',
    [managementTypes.feedbackStatus.AI_REVIEWED]: 'bg-purple-50 text-purple-700',
    [managementTypes.feedbackStatus.VERIFIED]: 'bg-amber-50 text-amber-700',
    [managementTypes.feedbackStatus.ASSIGNED]: 'bg-indigo-50 text-indigo-700',
    [managementTypes.feedbackStatus.IN_PROGRESS]: 'bg-amber-50 text-amber-700',
    [managementTypes.feedbackStatus.RESOLVED]: 'bg-emerald-50 text-emerald-700',
    [managementTypes.feedbackStatus.CLOSED]: 'bg-slate-100 text-slate-700',
  };
  const badgeClass = statusClassMap[item.status] || 'bg-slate-100 text-slate-700';

  return (
    <article className="group bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">{(item.userName || 'NG').charAt(0)}</div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 truncate">{item.userName || 'Người dân'}</div>
              <div className="text-[11px] text-slate-400 truncate">{item.locationText || 'Không có vị trí'}</div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${badgeClass}`}>{getStatusLabel(item.status, item.status || 'Chưa rõ')}</span>
        </div>

        <div className="space-y-3">
          <h3 className="font-black text-lg text-slate-900 leading-tight">{item.title}</h3>
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{dateText}</div>
        </div>

        <div className="relative block overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm transition duration-200 group-hover:border-slate-300">
          {attachments.length > 1 ? (
            // grid gallery preview (mobile-first)
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {attachments.slice(0, 4).map((a, i) => (
                <button key={i} onClick={() => onOpen(item)} className="w-full h-36 sm:h-44 overflow-hidden bg-slate-100">
                  <img src={getAttachmentUrl(a)} alt={item.title || `Ảnh ${i+1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="w-full h-44 sm:h-72 overflow-hidden"
              aria-label={imageUrl ? `Xem ảnh ${item.title}` : 'Không có ảnh'}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.title || 'Ảnh phản ánh'}
                  className="w-full h-full object-cover transition duration-300 ease-in-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-44 sm:h-72 items-center justify-center bg-slate-100 text-slate-400 text-sm font-semibold">Không có ảnh</div>
              )}
            </button>
          )}
          {attachments.length > 4 && (
            <div className="absolute right-3 top-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">+{attachments.length - 4}</div>
          )}
        </div>

        <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">{item.description}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <SupportButton feedbackId={item.feedbackId} initialCount={item.supportCount || item.supports || 0} initialSupported={item.isSupportedByCurrentUser} />
            <button onClick={() => onOpenComments(item.feedbackId)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600 shadow-sm transition hover:bg-slate-200 hover:text-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16l-3 3v-6a9 9 0 0118 0v3" /></svg>
              <span className="font-semibold">{item.commentCount ?? (Array.isArray(item.comments) ? item.comments.length : 0)}</span>
            </button>
          </div>

          <button onClick={() => onOpen(item)} className="rounded-full border border-[#0b56d9] bg-[#0b56d9] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a4fb8]">Xem</button>
        </div>
      </div>
    </article>
  );
};

export default memo(CommunityFeedItem);
