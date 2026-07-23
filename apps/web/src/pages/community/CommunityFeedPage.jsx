import CommunityFeed from '../../components/community/CommunityFeed';
import PublicPageMotion from '../../components/public/PublicPageMotion';

const CommunityFeedThemeStyles = () => (
  <style>{`
    html:not([data-theme="dark"]) .community-feed-page {
      --public-surface: rgba(248, 251, 255, 0.97);
      --public-surface-soft: rgba(232, 239, 248, 0.95);
      --public-surface-strong: #f7faff;
      --public-border: rgba(148, 163, 184, 0.52);
      --public-border-soft: rgba(186, 205, 229, 0.86);
      --public-copy: #4f6077;
      --public-muted: #718198;
      --public-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
    }

    html:not([data-theme="dark"]) .community-feed-page .community-feed-page-shell {
      border-color: rgba(148, 163, 184, 0.38);
      background:
        linear-gradient(
          180deg,
          rgba(226, 235, 247, 0.84) 0%,
          rgba(242, 247, 252, 0.58) 52%,
          rgba(235, 242, 250, 0.72) 100%
        );
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.78),
        0 24px 70px rgba(15, 23, 42, 0.06);
    }
  `}</style>
);

export const CommunityFeedPage = () => {
  return (
    <PublicPageMotion>
      <CommunityFeedThemeStyles />
      <main
        data-public-reveal
        className="community-feed-page relative isolate text-[var(--public-title)]"
      >
        <div
          className="community-feed-page-shell pointer-events-none absolute -inset-x-3 -inset-y-5 -z-10 overflow-hidden rounded-[36px] border border-[var(--public-border-soft)] bg-[linear-gradient(180deg,var(--public-surface-soft),transparent)] sm:-inset-x-5 sm:-inset-y-6"
          aria-hidden="true"
        />
        <CommunityFeed />
      </main>
    </PublicPageMotion>
  );
};
