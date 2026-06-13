// src/components/layout/Header.jsx
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';

export const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Convert pathname to readable breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return 'Tổng Quan';
    
    return paths.map((path, idx) => {
      let segmentName = path;
      if (path === 'tickets') segmentName = 'Phản Ánh';
      else if (path === 'create') segmentName = 'Gửi Phản Ánh Mới';
      else if (path === 'queue') segmentName = 'Hàng Chờ Kiểm Duyệt';
      else if (path === 'duplicates') segmentName = 'Hộp Thư Trùng Lặp';
      else if (path === 'review') segmentName = 'Duyệt Kết Quả';
      else if (path === 'community') segmentName = 'Cộng Đồng';
      else if (path === 'feed') segmentName = 'Bảng Tin';
      else if (path === 'map') segmentName = 'Bản Đồ Sự Cố';
      else if (path === 'analytics') segmentName = 'Báo Cáo Phân Tích';
      else if (path === 'sla') segmentName = 'Chỉ Số SLA';
      else if (path === 'sentiment') segmentName = 'Ý Kiến Cư Dân (AI)';
      else if (path === 'heatmap') segmentName = 'Bản Đồ Nhiệt';
      else if (path === 'management') segmentName = 'Cấu Hình';
      else if (path === 'users') segmentName = 'Quản Lý Người Dùng';
      else if (path === 'categories') segmentName = 'Quản Lý Danh Mục';
      else if (path === 'integrations') segmentName = 'Kênh Tích Hợp';
      else if (path === 'profile') segmentName = 'Hồ Sơ';
      else if (path === 'settings') segmentName = 'Cài Đặt';
      
      return (
        <span key={idx} className="flex items-center gap-1">
          {idx > 0 && <Lucide.ChevronRight size={14} className="text-gray-400" />}
          <span className={idx === paths.length - 1 ? 'font-bold text-base-content' : 'text-gray-400'}>
            {segmentName}
          </span>
        </span>
      );
    });
  };

  const isCitizen = user?.role === 'service-user';

  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-6 py-3 h-16 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left section: Brand Logo for Citizen or Hamburger for Staff */}
      <div className="flex items-center gap-4">
        {isCitizen ? (
          <div className="flex items-center gap-2 mr-6 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="p-1.5 rounded-lg bg-primary text-primary-content">
              <Lucide.Cpu size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-none">
                UrbanMind
              </h1>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">CITIZEN PORTAL</p>
            </div>
          </div>
        ) : (
          <>
            <button onClick={onMenuToggle} className="btn btn-ghost btn-square lg:hidden">
              <Lucide.Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-1 text-sm font-semibold">
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
              `px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/tickets/create"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Gửi phản ánh
          </NavLink>
          <NavLink
            to="/tickets"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Phản ánh của tôi
          </NavLink>
          <NavLink
            to="/community/feed"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Bảng tin
          </NavLink>
          <NavLink
            to="/community/map"
            className={({ isActive }) =>
              `px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Bản đồ sự cố
          </NavLink>
        </div>
      )}

      {/* Right section: Notification, User Profile */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* User avatar dropdown (specifically for Citizen role since they have no sidebar) */}
        {isCitizen && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar ring-2 ring-primary ring-offset-base-100 ring-offset-2">
              <div className="w-8 rounded-full animate-fade-in">
                <img src={user.avatarUrl} alt="User Avatar" />
              </div>
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2 border border-base-300 z-50">
              <li className="menu-title px-4 py-2 text-xs font-bold text-slate-400 border-b border-slate-100">
                {user.fullName}
              </li>
              <li>
                <button onClick={() => navigate('/profile')} className="py-2.5 text-xs font-bold flex gap-2 items-center">
                  <Lucide.User size={14} />
                  Trang cá nhân
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/settings')} className="py-2.5 text-xs font-bold flex gap-2 items-center">
                  <Lucide.Settings size={14} />
                  Cài đặt
                </button>
              </li>
              <div className="divider my-0"></div>
              <li>
                <button onClick={async () => { await logout(); navigate('/login'); }} className="py-2.5 text-xs font-bold text-error flex gap-2 items-center">
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
