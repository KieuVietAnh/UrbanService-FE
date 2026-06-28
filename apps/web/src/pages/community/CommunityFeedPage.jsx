// src/pages/community/CommunityFeedPage.jsx
import CommunityFeed from '../../components/community/CommunityFeed';

export const CommunityFeedPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Bảng Tin Ý Kiến Đô Thị</h2>
        <p className="text-xs text-gray-500 font-semibold">Theo dõi phản ánh công cộng của cộng đồng dân cư và cùng nhau biểu quyết giám sát chất lượng giải quyết.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-6">
        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sticky top-20">
            <h4 className="font-bold text-sm text-slate-900">Cộng đồng</h4>
            <p className="text-xs text-slate-500 mt-2">Khám phá và tương tác với phản ánh từ cộng đồng.</p>
            <div className="mt-4">
              <button className="rounded-full border border-[#0b56d9] bg-[#0b56d9] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0a4fb8]">Tạo phản ánh</button>
            </div>
          </div>
        </aside>

        <main>
          <CommunityFeed />
        </main>

        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sticky top-20">
            <h4 className="font-bold text-sm text-slate-900">Xu hướng</h4>
            <p className="text-xs text-slate-500 mt-2">Các phản ánh được hỗ trợ nhiều nhất.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};
