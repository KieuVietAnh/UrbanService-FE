// src/components/layout/Header.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemeToggle } from '../../components/design-system';
import { normalizeRole } from '../../utils/roleMap';

const citizenNavigation = [
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Phản ánh của tôi', to: '/tickets', end: true },
  { label: 'Bảng tin', to: '/community/feed' },
  { label: 'Bản đồ sự cố', to: '/community/map' },
];

const isCitizenNavigationActive = (targetPath, pathname) => {
  if (targetPath === '/') {
    return pathname === '/' || pathname === '/dashboard';
  }

  if (targetPath === '/tickets') {
    return (
      pathname === '/tickets' ||
      (
        pathname.startsWith('/tickets/') &&
        pathname !== '/tickets/create'
      )
    );
  }

  if (targetPath === '/community/feed') {
    return pathname.startsWith('/community/feed');
  }

  if (targetPath === '/community/map') {
    return pathname.startsWith('/community/map');
  }

  return pathname === targetPath;
};

const getInitials = (fullName) => {
  const normalizedName = String(fullName || '').trim();
  if (!normalizedName) return 'UM';

  return normalizedName
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const CitizenAvatar = ({ user }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.avatarUrl;
  const initials = useMemo(() => getInitials(user?.fullName), [user?.fullName]);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  if (!avatarUrl || imageFailed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-blue-600 text-xs font-bold text-white">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={`Ảnh đại diện của ${user?.fullName || 'người dùng'}`}
      className="h-full w-full object-cover"
      onError={() => setImageFailed(true)}
    />
  );
};

const CitizenHeader = ({ user, logout, navigate, pathname }) => {
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="public-header sticky top-0 z-[2000] w-full shrink-0 border-b shadow-[0_8px_30px_rgba(15,23,42,0.055)] backdrop-blur-xl">
      <nav
        className="public-wide-content flex h-[72px] w-full items-center justify-between gap-3 px-5 sm:px-7 lg:px-10 2xl:px-14"
        aria-label="Điều hướng người dân"
      >
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          aria-label="UrbanMind - Trang chủ"
        >
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.26)] transition-transform group-hover:-translate-y-0.5">
            <Lucide.MapPinned size={21} aria-hidden="true" />
            <span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-white/15" aria-hidden="true" />
          </span>
          <span className="hidden sm:block">
            <strong className="public-header-brand-title block text-[18px] font-bold tracking-[-0.025em]">
              UrbanMind
            </strong>
            <span className="public-header-brand-subtitle mt-0.5 block text-[11px] font-medium">
              Cổng phản ánh đô thị
            </span>
          </span>
        </Link>

        <ul className="hidden min-w-0 items-center justify-center gap-1 lg:flex">
          {citizenNavigation.map((item) => {
            const isActive = isCitizenNavigationActive(item.to, pathname);

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`public-nav-link inline-flex h-10 items-center rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 ${
                    isActive
                      ? 'public-nav-link-active border-blue-200/80 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-transparent hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex min-w-fit items-center justify-end gap-1.5 sm:gap-2">
          <NavLink
            to="/tickets/create"
            className={({ isActive }) => (
              `hidden h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 xl:inline-flex ${
                isActive ? 'bg-blue-700' : 'bg-blue-600'
              }`
            )}
          >
            <Lucide.Plus size={16} aria-hidden="true" />
            Gửi phản ánh
          </NavLink>

          <ThemeToggle className="public-theme-button h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" />
          <NotificationBell />

          <div className="dropdown dropdown-end hidden sm:block">
            <button
              type="button"
              tabIndex={0}
              className="public-login-button flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              aria-label="Mở menu tài khoản"
              title="Tài khoản"
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-lg">
                <CitizenAvatar user={user} />
              </span>
              <span className="hidden max-w-[132px] truncate text-sm font-semibold text-[var(--public-title)] 2xl:block">
                {user?.fullName || 'Tài khoản'}
              </span>
              <Lucide.ChevronDown size={14} className="hidden text-[var(--public-muted)] 2xl:block" aria-hidden="true" />
            </button>

            <ul
              tabIndex={0}
              className="dropdown-content menu z-[2100] mt-2 w-64 translate-x-2 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] p-2 text-[var(--public-title)] shadow-[0_22px_55px_rgba(15,23,42,0.16)]"
            >
              <li className="mb-1 border-b border-[var(--public-border)] px-3 py-3">
                <span className="block p-0 hover:bg-transparent focus:bg-transparent active:bg-transparent">
                  <strong className="block truncate text-sm font-semibold">
                    {user?.fullName || 'Người dùng UrbanMind'}
                  </strong>
                  <small className="mt-1 block truncate text-xs font-normal text-[var(--public-muted)]">
                    {user?.email || 'Tài khoản người dân'}
                  </small>
                </span>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/profile')} className="gap-3 rounded-xl py-2.5 text-sm font-medium">
                  <Lucide.UserRound size={16} aria-hidden="true" />
                  Trang cá nhân
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/settings')} className="gap-3 rounded-xl py-2.5 text-sm font-medium">
                  <Lucide.Settings size={16} aria-hidden="true" />
                  Cài đặt
                </button>
              </li>
              <li className="mt-1 border-t border-[var(--public-border)] pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="gap-3 rounded-xl py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <Lucide.LogOut size={16} aria-hidden="true" />
                  Đăng xuất
                </button>
              </li>
            </ul>
          </div>

          <details className="dropdown dropdown-end sm:hidden">
            <summary
              className="public-mobile-menu-button flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              aria-label="Mở menu người dân"
            >
              <Lucide.Menu size={19} aria-hidden="true" />
            </summary>

            <div className="dropdown-content z-[2100] mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface-strong)] p-3 text-[var(--public-title)] shadow-[0_22px_55px_rgba(15,23,42,0.16)]">
              <div className="mb-3 flex items-center gap-3 border-b border-[var(--public-border)] pb-3">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                  <CitizenAvatar user={user} />
                </span>
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-semibold">
                    {user?.fullName || 'Người dùng UrbanMind'}
                  </strong>
                  <span className="mt-0.5 block truncate text-xs text-[var(--public-muted)]">
                    {user?.email || 'Tài khoản người dân'}
                  </span>
                </div>
              </div>

              <ul className="space-y-1">
                {citizenNavigation.map((item) => {
                  const isActive = isCitizenNavigationActive(item.to, pathname);

                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={isActive ? 'page' : undefined}
                        className={`public-nav-link flex min-h-11 items-center rounded-xl border px-3 text-sm font-medium transition ${
                          isActive
                            ? 'public-nav-link-active border-blue-200/80 bg-blue-50 text-blue-700'
                            : 'border-transparent hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    to="/tickets/create"
                    className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white"
                  >
                    <Lucide.Plus size={16} aria-hidden="true" />
                    Gửi phản ánh
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/profile')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700">
                    <Lucide.UserRound size={16} aria-hidden="true" />
                    Trang cá nhân
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/settings')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-blue-50 hover:text-blue-700">
                    <Lucide.Settings size={16} aria-hidden="true" />
                    Cài đặt
                  </button>
                </li>
                <li className="mt-2 border-t border-[var(--public-border)] pt-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <Lucide.LogOut size={16} aria-hidden="true" />
                    Đăng xuất
                  </button>
                </li>
              </ul>
            </div>
          </details>
        </div>
      </nav>
      <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" aria-hidden="true" />
    </header>
  );
};

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;

  const getBreadcrumbs = () => {
    // Build breadcrumb path dynamically, omitting internal segments like 'staff'
    const paths = location.pathname.split('/').filter(Boolean).filter(Boolean);

    // Mapping of route segments -> human labels (Vietnamese)
    const labelMap = {
      dashboard: 'Tổng quan hệ thống',
      feedbacks: 'Quản lý phản ánh',
      duplicates: 'Xử lý trùng lặp',
      'provider-candidates': 'Kiểm tra ứng viên nhà cung cấp',
      coordinators: 'Danh bạ điều phối viên',
      'area-alerts': 'Quản lý cảnh báo khu vực',
      'ai-review': 'Hàng chờ kiểm duyệt AI',
      // keep some common mappings
      admin: 'Quản trị hệ thống',
      analytics: 'Báo cáo phân tích',
      settings: 'Cài đặt',
    };

    // Segments to hide entirely from breadcrumb
    const hiddenSegments = new Set(['admin', 'management', 'tickets', 'community', 'manager', 'staff']);

    const visibleSegments = paths.filter((seg) => !hiddenSegments.has(seg));

    // Helper: detect id-like segments (uuid or numeric)
    const isIdSegment = (s) => {
      if (!s) return false;
      if (/^\d+$/.test(s)) return true;
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s)) return true;
      return false;
    };

    // If at root dashboard
    if (location.pathname === '/dashboard' || visibleSegments.length === 0) {
      return <span className="font-semibold text-slate-900">Tổng quan hệ thống</span>;
    }

    // Build items with accumulated path
    const items = [];
    let acc = '';
    visibleSegments.forEach((seg) => {
      acc += `/${seg}`;
      items.push({ seg, path: acc });
    });

    // Responsive render rules:
    // - Desktop (sm+): show full path
    // - Tablet (md): collapse middle items when >3 segments (show first, ellipsis, last 2)
    // - Mobile: show parent > current only

    const renderSegmentLabel = (seg, idx, prevSeg) => {
      if (isIdSegment(seg)) {
        // Prefer contextual label based on previous segment
        if (prevSeg === 'feedbacks') return 'Chi tiết phản ánh';
        if (prevSeg === 'area-alerts') return 'Chi tiết cảnh báo';
        return 'Chi tiết';
      }

      return labelMap[seg] || seg.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    };

    // Compute parent and current for mobile view
    const lastIndex = items.length - 1;
    const parent = items[Math.max(0, lastIndex - 1)];
    const current = items[lastIndex];

    return (
      <div className="flex items-center gap-2">
        {/* Mobile: parent > current (visible on xs only) */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors">Tổng quan hệ thống</Link>
          <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
          {parent && (
            <Link to={parent.path} className="text-sm text-slate-500 hover:text-blue-700 transition-colors">{renderSegmentLabel(parent.seg, Math.max(0, lastIndex - 1), items[Math.max(0, lastIndex - 2)]?.seg)}</Link>
          )}
          <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900">{renderSegmentLabel(current.seg, lastIndex, parent?.seg)}</span>
        </div>

        {/* Desktop / Tablet: full breadcrumb with collapse */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors">Tổng quan hệ thống</Link>
          {items.length <= 3 && items.map((it, idx) => {
            const isLast = idx === items.length - 1;
            const prevSeg = items[idx - 1]?.seg;
            const label = renderSegmentLabel(it.seg, idx, prevSeg);
            return (
              <span key={`crumb-${it.path}`} className="flex items-center gap-2">
                <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
                {!isLast ? (
                  <Link to={it.path} className="text-sm text-slate-500 hover:text-blue-700 transition-colors">{label}</Link>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                )}
              </span>
            );
          })}

          {items.length > 3 && (
            // Tablet collapse: show first, ellipsis, last two
            <>
              <span className="flex items-center gap-2">
                <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
                <Link to={items[0].path} className="text-sm text-slate-500 hover:text-blue-700 transition-colors">{renderSegmentLabel(items[0].seg, 0)}</Link>
              </span>

              <span className="px-2 text-slate-400">…</span>

              {items.slice(-2).map((it, idxRel) => {
                const realIdx = items.length - 2 + idxRel;
                const isLast = realIdx === lastIndex;
                const prevSeg = items[realIdx - 1]?.seg;
                const label = renderSegmentLabel(it.seg, realIdx, prevSeg);
                return (
                  <span key={`crumb-${it.path}`} className="flex items-center gap-2">
                    <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
                    {!isLast ? (
                      <Link to={it.path} className="text-sm text-slate-500 hover:text-blue-700 transition-colors">{label}</Link>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900">{label}</span>
                    )}
                  </span>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  if (isCitizen) {
    return (
      <CitizenHeader
        user={user}
        logout={logout}
        navigate={navigate}
        pathname={location.pathname}
      />
    );
  }

  return (
    <header className="admin-topbar navbar sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-sky-50/75 px-6 py-3 shadow-[0_10px_30px_rgba(30,64,175,0.045)] backdrop-blur-xl supports-[backdrop-filter]:bg-sky-50/68">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Mở menu"
          title="Mở menu"
          onClick={onMenuToggle}
          className="btn btn-ghost btn-square lg:hidden"
        >
          <Lucide.Menu size={20} aria-hidden="true" />
        </button>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm font-medium sm:flex">
          {getBreadcrumbs()}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="mr-2" />
        <NotificationBell />
      </div>
    </header>
  );
};
