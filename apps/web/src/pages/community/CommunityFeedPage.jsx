import CommunityFeed from '../../components/community/CommunityFeed';

export const CommunityFeedPage = () => {
  return (
    <main className="space-y-5 text-base-content">
      <section className="rounded-[28px] border border-base-300 bg-base-100 px-5 py-5 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:px-7 sm:py-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Bảng tin đô thị
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-base-content/60 sm:text-base">
          Theo dõi các phản ánh đã được xác minh, cùng trao đổi và giám sát tiến độ xử lý trong cộng đồng.
        </p>
      </section>

      <CommunityFeed />
    </main>
  );
};
