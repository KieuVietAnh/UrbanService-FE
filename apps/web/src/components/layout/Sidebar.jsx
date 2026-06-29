// src/components/layout/Sidebar.jsx

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/roleMap';

// Import all sidebar menus
import userMenu from '../../roles/service-user/sidebarMenu';
import staffMenu from '../../roles/system-staff/sidebarMenu';
import providerMenu from '../../roles/service-provider/sidebarMenu';
import managerMenu from '../../roles/interaction-manager/sidebarMenu';
import adminMenu from '../../roles/administrator/sidebarMenu';

const menuMapping = {
  'service-user': userMenu,
  'system-staff': staffMenu,
  'service-provider': providerMenu,
  'interaction-manager': managerMenu,
  'administrator': adminMenu
};

const getRoleNameVietnamese = (role) => {
  switch (role) {
    case 'service-user': return 'Người Dân';
    case 'system-staff': return 'Nhân Viên Tiếp Nhận';
    case 'service-provider': return 'Đơn Vị Xử Lý';
    case 'interaction-manager': return 'Quản Lý Tương Tác';
    case 'administrator': return 'Quản Trị Viên';
    default: return 'Khách';
  }
};


const getUserInitials = (value = '') => {
  const normalizedValue = value.trim();

  if (!normalizedValue) return 'U';

  const parts = normalizedValue.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return normalizedValue.slice(0, 2).toUpperCase();
};

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const currentRole = normalizeRole(user?.role);
  const menuItems = menuMapping[currentRole] || [];
  const displayName = user.fullName || user.email || 'Người dùng';
  const userInitials = getUserInitials(displayName);
  const showAvatarImage = Boolean(user.avatarUrl) && !avatarError;

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false);
  };

  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  // Helper to render icon by string name
  const renderIcon = (iconName, className) => {
    const IconComponent = Lucide[iconName];
    if (IconComponent) {
      return <IconComponent className={className} size={20} />;
    }
    return <Lucide.HelpCircle className={className} size={20} />;
  };

  return (
    <>
      <aside
      className={`fixed inset-y-0 left-0 z-40 h-screen w-64 flex-shrink-0 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:self-start lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Logo Section */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Lucide.Cpu size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                UrbanMind
              </h1>
              <p className="text-xs font-medium text-slate-500">Smart City</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng thanh điều hướng" title="Đóng menu" className="btn btn-sm btn-ghost lg:hidden">
            <Lucide.X size={20} aria-hidden />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className={showAvatarImage ? 'avatar' : 'avatar placeholder'}>
            {showAvatarImage ? (
              <div className="w-10 rounded-full ring-2 ring-primary ring-offset-base-100 ring-offset-2">
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <span className="text-sm font-extrabold leading-none tracking-tight">{userInitials}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-slate-950">{displayName}</h4>
            <div className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
              {getRoleNameVietnamese(currentRole)}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors group ${isActive
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {renderIcon(item.icon, isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-700 transition-colors')}
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="shrink-0 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="btn btn-outline w-full gap-2 rounded-xl border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Lucide.LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>
      </aside>

      {isLogoutModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                  <Lucide.LogOut size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Xác nhận đăng xuất</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Bạn sẽ rời khỏi phiên làm việc hiện tại và cần đăng nhập lại để tiếp tục sử dụng UrbanMind.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleLogoutCancel}
                className="btn btn-ghost rounded-2xl"
                disabled={isLoggingOut}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="btn btn-error rounded-2xl"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Lucide.LogOut size={18} />
                )}
                Đăng xuất
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            onClick={handleLogoutCancel}
            aria-label="Đóng hộp thoại đăng xuất"
          />
        </div>
      )}
    </>
  );
};
