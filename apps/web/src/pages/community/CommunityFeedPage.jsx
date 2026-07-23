import CommunityFeed from '../../components/community/CommunityFeed';
import PublicPageMotion from '../../components/public/PublicPageMotion';

export const CommunityFeedPage = () => {
  return (
    <PublicPageMotion>
      <main
        data-public-reveal
        className="relative isolate text-[var(--public-title)]"
      >
        <div
          className="pointer-events-none absolute -inset-x-3 -inset-y-5 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-6"
          aria-hidden="true"
        />
        <CommunityFeed />
      </main>
    </PublicPageMotion>
  );
};
