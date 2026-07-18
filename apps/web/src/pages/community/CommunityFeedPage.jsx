import CommunityFeed from '../../components/community/CommunityFeed';

export const CommunityFeedPage = () => {
  return (
    <main className="relative isolate text-base-content">
      <div
        className="pointer-events-none absolute -inset-x-3 -inset-y-4 -z-10 rounded-[36px] bg-base-200/45 sm:-inset-x-5 sm:-inset-y-5"
        aria-hidden="true"
      />
      <CommunityFeed />
    </main>
  );
};
