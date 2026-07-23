import CommunityFeed from '../../components/community/CommunityFeed';
import PublicPageMotion from '../../components/public/PublicPageMotion';

export const CommunityFeedPage = () => {
  return (
    <PublicPageMotion>
      <main
        data-public-reveal
        className="relative isolate text-base-content"
      >
        <div
          className="pointer-events-none absolute -inset-x-3 -inset-y-4 -z-10 rounded-[36px] bg-base-200/45 sm:-inset-x-5 sm:-inset-y-5"
          aria-hidden="true"
        />
        <CommunityFeed />
      </main>
    </PublicPageMotion>
  );
};
