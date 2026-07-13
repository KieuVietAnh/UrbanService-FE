// src/components/layout/Header.jsx
import { Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { APP_ROLES } from '@urbanmind/shared-types';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemeToggle } from '../../components/design-system';
import { normalizeRole } from '../../utils/roleMap';

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Convert pathname to readable breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);

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
      sentiment: 'Ý kiến cư dân',
      heatmap: 'Bản đồ nhiệt',

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
      return (
        <span className="font-semibold text-slate-950">
          Tổng quan hệ thống
        </span>
      );
    }

    const hiddenBreadcrumbSegments = new Set([
      'admin',
      'management',
      'analytics',
      'provider',
      'tickets',
      'community',
    ]);

    const visiblePaths = paths.filter(path => !hiddenBreadcrumbSegments.has(path));

    return (
      <div className="flex items-center gap-1.5">
        <Link
          to="/dashboard"
          className="font-medium text-slate-500 transition-colors hover:text-blue-700"
        >
          Tổng quan hệ thống
        </Link>

        {visiblePaths.map((path, idx) => {
          if (idx === 0 && path === 'dashboard') return null;

          const segmentName = labelMap[path] || path;

          return (
            <span key={`${path}-${idx}`} className="flex items-center gap-1.5">
              <Lucide.ChevronRight size={14} className="text-slate-300" />
              <span
                className={
                  idx === visiblePaths.length - 1
                    ? 'font-semibold text-slate-950'
                    : 'font-semibold text-base-content/45'
                }
              >
                {segmentName}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  const isCitizen = normalizeRole(user?.role) === APP_ROLES.SERVICE_USER;

  return (
    <header className="admin-topbar navbar sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/70 bg-sky-50/75 px-6 py-3 shadow-[0_10px_30px_rgba(30,64,175,0.045)] backdrop-blur-xl supports-[backdrop-filter]:bg-sky-50/68">
      {/* Left section: Brand Logo for Citizen or Hamburger for Staff */}
      <div className="flex items-center gap-4">
        {isCitizen ? (
          <button aria-label="Trang chính" title="Trang chính" className="flex items-center gap-2 mr-6" onClick={() => navigate('/dashboard')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Lucide.Cpu size={20} className="animate-pulse" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-950 leading-none">
                UrbanMind
              </h1>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Citizen portal</p>
            </div>
          </button>
        ) : (
          <>
            <button aria-label="Mở menu" title="Mở menu" onClick={onMenuToggle} className="btn btn-ghost btn-square lg:hidden">
              <Lucide.Menu size={20} aria-hidden="true" />
            </button>
            <div className="hidden items-center gap-1 text-sm font-medium sm:flex">
              {getBreadcrumbs()}
            </div>
          </>
        )}
      </div>

      {/* Middle section: Navigation links for Citizen */}
      {isCitizen && (
        <div className="hidden md:flex items-center gap-1.5">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/tickets/create"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Gửi phản ánh
          </NavLink>
          <NavLink
            to="/tickets"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Phản ánh của tôi
          </NavLink>
          <NavLink
            to="/community/feed"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Bảng tin
          </NavLink>
          <NavLink
            to="/community/map"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Bản đồ sự cố
          </NavLink>
        </div>
      )}

      {/* Right section: Notification, User Profile */}
      <div className="flex items-center gap-2">
        <ThemeToggle className="mr-2" />
        <NotificationBell />

        {/* User avatar dropdown (specifically for Citizen role since they have no sidebar) */}
        {isCitizen && (
          <div className="dropdown dropdown-end">
            <button aria-label="Menu người dùng" title="Menu người dùng" tabIndex={0} className="btn btn-ghost btn-circle avatar ring-2 ring-primary ring-offset-base-100 ring-offset-2">
              <div className="w-8 rounded-full animate-fade-in">
                <img src={user.avatarUrl} alt="User Avatar" />
              </div>
            </button>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2 border border-base-300 z-50">
              <li className="menu-title px-4 py-2 text-xs font-bold text-slate-400 border-b border-slate-100">
                {user.fullName}
              </li>
              <li>
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2 py-2.5 text-sm font-medium">
                  <Lucide.User size={14} />
                  Trang cá nhân
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/settings')} className="flex items-center gap-2 py-2.5 text-sm font-medium">
                  <Lucide.Settings size={14} />
                  Cài đặt
                </button>
              </li>
              <div className="divider my-0"></div>
              <li>
                <button onClick={async () => { await logout(); navigate('/login'); }} className="flex items-center gap-2 py-2.5 text-sm font-medium text-error">
                  <Lucide.LogOut size={14} />
                  Đăng xuất
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};
