// src/components/layout/DashboardLayout.jsx
import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { FeedbackMessagesProvider } from '../../contexts/FeedbackMessagesContext';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import PageTransition from '../motion/PageTransition';
import { PublicThemeStyles } from '../public/PublicLayout';
import { APP_ROLES } from '@urbanmind/shared-types';
import { normalizeRole } from '../../utils/roleMap';
import { useAuth } from '../../contexts/AuthContext';

export const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isCitizen =
    normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainScrollRef = useRef(null);

  useLayoutEffect(() => {
    const scrollContainer = mainScrollRef.current;

    if (!scrollContainer || typeof window === 'undefined') {
      return undefined;
    }

    // Trang danh sách sẽ tự khôi phục đúng card khi quay lại từ chi tiết.
    // Không reset vùng cuộn dùng chung trong trường hợp này để tránh ghi đè vị trí.
    const preserveScrollOnEnter =
      location.state?.restoreFeedbackId ||
      location.state?.restoreTicketId ||
      location.state?.restoreCoordinatorList ||
      location.state?.focusMap ||
      location.state?.focusFeedbackId ||
      location.state?.mapState?.focusMap ||
      location.state?.mapState?.focusFeedbackId ||
      location.state?.preserveScroll;

    if (preserveScrollOnEnter) {
      return undefined;
    }

    const rawHash = String(location.hash || '').replace(/^#/, '');
    let targetId = '';

    if (rawHash) {
      try {
        targetId = decodeURIComponent(rawHash);
      } catch {
        targetId = rawHash;
      }
    }

    const scrollToTop = () => {
      scrollContainer.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    };

    const scrollToTarget = () => {
      if (!targetId) {
        scrollToTop();
        return;
      }

      const target = document.getElementById(targetId);

      if (!target) {
        scrollToTop();
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const targetTop =
        scrollContainer.scrollTop +
        targetRect.top -
        containerRect.top -
        12;

      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        left: 0,
        behavior: 'auto',
      });
    };

    // Reset ngay, sau đó chạy lại sau transition để tránh giữ scroll của route cũ.
    scrollToTop();

    const frameId = window.requestAnimationFrame(scrollToTarget);

    const timerIds = [120, 280, 520].map((delay) =>
      window.setTimeout(scrollToTarget, delay)
    );

    return () => {
      window.cancelAnimationFrame(frameId);

      timerIds.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [
    location.hash,
    location.key,
    location.state?.restoreFeedbackId,
    location.state?.restoreTicketId,
    location.state?.restoreCoordinatorList,
    location.state?.focusMap,
    location.state?.focusFeedbackId,
    location.state?.mapState?.focusMap,
    location.state?.mapState?.focusFeedbackId,
    location.state?.preserveScroll,
  ]);

  const toggleSidebar = () => {
    setSidebarOpen((current) => !current);
  };

  const showFooter = isCitizen;

  const isStaffFeedbackDetailRoute =
    /^\/staff\/feedbacks\/[^/]+\/?$/.test(location.pathname);

  const staffDetailFeedbackId = isStaffFeedbackDetailRoute
    ? location.pathname.split('/').filter(Boolean).pop()
    : null;

  const shouldWrapFeedbackMessages =
    isStaffFeedbackDetailRoute && Boolean(staffDetailFeedbackId);

  const renderMainContent = () => (
    <main
      ref={mainScrollRef}
      data-dashboard-scroll-container
      className={`min-h-0 flex-1 overflow-y-scroll overflow-x-hidden ${
        isCitizen
          ? 'bg-transparent'
          : 'bg-slate-50 dark:bg-slate-950'
      }`}
    >
      <div className="flex min-h-full flex-col">
        <PageTransition
          key={location.pathname}
          className={`mx-auto w-full flex-1 ${
            isCitizen
              ? 'citizen-content-shell max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9'
              : 'max-w-7xl space-y-6 p-5 sm:p-6'
          }`}
        >
          {children}
        </PageTransition>

        {showFooter ? <Footer /> : null}
      </div>
    </main>
  );

  return (
    <div
      className={`flex h-screen w-full flex-col overflow-hidden font-sans ${
        isCitizen
          ? 'public-page text-[var(--public-title)]'
          : 'bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100'
      }`}
    >
      {isCitizen ? <PublicThemeStyles /> : null}

      <div className="flex h-screen w-full overflow-hidden">
        {/* Sidebar navigation */}
        {!isCitizen && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main container */}
        <div
          className={`flex min-w-0 w-full flex-1 flex-col overflow-hidden ${
            isCitizen
              ? 'bg-transparent'
              : 'bg-slate-50 dark:bg-slate-950'
          }`}
        >
          <Header onMenuToggle={toggleSidebar} />

          {/* Main scrollable workspace */}
          {shouldWrapFeedbackMessages ? (
            <FeedbackMessagesProvider feedbackId={staffDetailFeedbackId}>
              {renderMainContent()}
            </FeedbackMessagesProvider>
          ) : (
            renderMainContent()
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
    </div>
  );
};