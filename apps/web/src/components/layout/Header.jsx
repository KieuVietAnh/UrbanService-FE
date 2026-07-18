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
  { label: 'Trang chủ', to: '/dashboard', end: true },
  { label: 'Phản ánh của tôi', to: '/tickets', end: true },
  { label: 'Bảng tin', to: '/community/feed' },
  { label: 'Bản đồ sự cố', to: '/community/map' },
];

const isCitizenNavigationActive = (targetPath, pathname) => {
  if (targetPath === '/dashboard') {
    return pathname === '/dashboard';
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

const CitizenHeader = ({ user, logout, navigate, pathname }) => (
  <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
    <div className="grid h-[72px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6 lg:px-8 2xl:px-10">
      <Link
        to="/dashboard"
        className="group flex min-w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        aria-label="Về trang chủ UrbanMind"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-transform group-hover:-translate-y-0.5">
          <Lucide.MapPinned size={20} aria-hidden="true" />
        </span>
        <span className="hidden sm:block">
          <strong className="block text-[17px] font-bold tracking-[-0.02em] text-slate-950 dark:text-white">
            UrbanMind
          </strong>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Cổng phản ánh đô thị
          </span>
        </span>
      </Link>

      <nav className="hidden min-w-0 items-center justify-center gap-0.5 md:flex xl:gap-1" aria-label="Điều hướng người dân">
        {citizenNavigation.map((item) => {
          const isActive = isCitizenNavigationActive(
            item.to,
            pathname
          );

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-colors xl:px-3.5 xl:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-fit items-center justify-end gap-1.5 sm:gap-2">
        <NavLink
          to="/tickets/create"
          className={({ isActive }) => (
            `hidden h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:inline-flex dark:focus-visible:ring-offset-slate-950 ${
              isActive
                ? 'bg-blue-700 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`
          )}
        >
          <Lucide.Plus size={17} aria-hidden="true" />
          Gửi phản ánh
        </NavLink>

        <ThemeToggle className="h-10 w-10 rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" />
        <NotificationBell />

        <div className="dropdown dropdown-end">
          <button
            type="button"
            tabIndex={0}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            aria-label="Mở menu tài khoản"
            title="Tài khoản"
          >
            <span className="h-7 w-7 overflow-hidden rounded-lg">
              <CitizenAvatar user={user} />
            </span>
            <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 2xl:block dark:text-slate-200">
              {user?.fullName || 'Tài khoản'}
            </span>
            <Lucide.ChevronDown size={14} className="hidden text-slate-400 2xl:block" aria-hidden="true" />
          </button>

          <ul
            tabIndex={0}
            className="dropdown-content menu z-50 mt-2 w-64 translate-x-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
          >
            <li className="mb-1 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
              <span className="block p-0 hover:bg-transparent focus:bg-transparent active:bg-transparent">
                <strong className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.fullName || 'Người dùng UrbanMind'}
                </strong>
                <small className="mt-1 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">
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
            <li className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="gap-3 rounded-xl py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <Lucide.LogOut size={16} aria-hidden="true" />
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
);

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);

    const labelMap = {
      dashboard: 'Tổng quan hệ thống',
      admin: 'Quản trị hệ thống',
      audit: 'Nhật ký hệ thống',
      performance: 'Hiệu năng & Logs',
      management: 'Quản trị vận hành',
      users: 'Quản lý người dùng',
      feedbacks: 'Quản lý feedback',
      categories: 'Danh mục phản ánh',
      sla: 'Cấu hình SLA',
      integrations: 'Cấu hình tích hợp',
      analytics: 'Báo cáo phân tích',
      sentiment: 'Cảm xúc người dân',
      heatmap: 'Bản đồ nhiệt',
      manager: 'Quản lý tương tác',
      interactions: 'Giám sát tương tác',
      approvals: 'Hàng đợi duyệt',
      provider: 'Đơn vị xử lý',
      tasks: 'Nhiệm vụ được giao',
      tickets: 'Phản ánh',
      create: 'Gửi phản ánh mới',
      queue: 'Hàng chờ kiểm duyệt',
      duplicates: 'Hộp thư trùng lặp',
      review: 'Duyệt kết quả',
      community: 'Cộng đồng',
      feed: 'Bảng tin',
      map: 'Bản đồ sự cố',
      profile: 'Hồ sơ',
      settings: 'Cài đặt',
    };

    if (location.pathname === '/dashboard') {
      return <span className="font-semibold text-slate-950">Tổng quan hệ thống</span>;
    }

    const hiddenBreadcrumbSegments = new Set([
      'admin',
      'management',
      'analytics',
      'provider',
      'tickets',
      'community',
      'manager',
    ]);

    const visiblePaths = paths.filter((path) => !hiddenBreadcrumbSegments.has(path));

    return (
      <div className="flex items-center gap-1.5">
        <Link to="/dashboard" className="font-medium text-slate-500 transition-colors hover:text-blue-700">
          Tổng quan hệ thống
        </Link>

        {visiblePaths.map((path, index) => {
          if (index === 0 && path === 'dashboard') return null;

          const isFeedbackId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(path);
          const segmentName = isFeedbackId
            ? 'Chi tiết phản ánh'
            : path === 'sla' && location.pathname.startsWith('/analytics/')
              ? 'Phân tích SLA'
              : labelMap[path] || path;
          const isLast = index === visiblePaths.length - 1;

          const breadcrumbLinkMap = {
            interactions: '/manager/interactions',
            approvals: '/manager/approvals',
            heatmap: '/analytics/heatmap',
            sentiment: '/analytics/sentiment',
            settings: '/settings',
          };

          const breadcrumbLink = path === 'sla' && location.pathname.startsWith('/analytics/')
            ? '/analytics/sla'
            : breadcrumbLinkMap[path];

          return (
            <span key={`${path}-${index}`} className="flex items-center gap-1.5">
              <Lucide.ChevronRight size={14} className="text-slate-300" aria-hidden="true" />
              {!isLast && breadcrumbLink ? (
                <Link to={breadcrumbLink} className="font-semibold text-slate-500 transition-colors hover:text-blue-700">
                  {segmentName}
                </Link>
              ) : (
                <span className="font-semibold text-slate-950">{segmentName}</span>
              )}
            </span>
          );
        })}
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
