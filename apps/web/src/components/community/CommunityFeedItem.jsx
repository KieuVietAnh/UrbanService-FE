import { memo } from 'react';
import { getAttachmentUrl } from '@urbanmind/shared-utils';
import SupportButton from './SupportButton';

const CommunityFeedItem = ({ item, onOpenComments, onOpen }) => {
  const imageUrl = item.attachments?.length ? getAttachmentUrl(item.attachments[0]) : null;
  const dateText = item.createdAt || item.createdDate ? new Date(item.createdAt || item.createdDate).toLocaleString() : 'Không rõ';

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
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${item.statusClass || 'bg-slate-100 text-slate-700'}`}>{item.status || 'Chưa rõ'}</span>
        </div>

        <div className="space-y-3">
          <h3 className="font-black text-lg text-slate-900 leading-tight">{item.title}</h3>
          <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{dateText}</div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="block overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm transition duration-200 group-hover:border-slate-300"
          aria-label={imageUrl ? `Xem ảnh ${item.title}` : 'Không có ảnh'}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title || 'Ảnh phản ánh'}
              className="h-72 w-full object-cover transition duration-300 ease-in-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-slate-100 text-slate-400 text-sm font-semibold">Không có ảnh</div>
          )}
        </button>

        <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">{item.description}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <SupportButton feedbackId={item.feedbackId} initialCount={item.supportCount || 0} initialSupported={item.isSupportedByCurrentUser} />
            <button onClick={() => onOpenComments(item.feedbackId)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-slate-600 shadow-sm transition hover:bg-slate-200 hover:text-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16l-3 3v-6a9 9 0 0118 0v3" /></svg>
              <span className="font-semibold">{(item.comments || []).length}</span>
            </button>
          </div>

          <button onClick={() => onOpen(item)} className="rounded-full border border-[#0b56d9] bg-[#0b56d9] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a4fb8]">Xem</button>
        </div>
      </div>
    </article>
  );
};

export default memo(CommunityFeedItem);
