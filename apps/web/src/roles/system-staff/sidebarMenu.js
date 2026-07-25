// src/roles/system-staff/sidebarMenu.js
const menuItems = [
  {
    name: 'Không Gian Làm Việc',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    activePatterns: ['/staff/workspace', '/staff/dashboard', '/dashboard']
  },
  {
    name: 'Hàng Chờ Kiểm Duyệt AI',
    path: '/staff/queue',
    icon: 'Cpu',
    activePatterns: ['/staff/queue', '/staff/ai-review']
  },
  {
    name: 'Quản Lý Phản Ánh',
    path: '/staff/feedbacks',
    icon: 'MessageSquareText',
    activePatterns: [
      '/staff/feedbacks',
      '/staff/provider-reports',
      '/staff/review',
      '/staff/completed-review',
      '/staff/request-info',
      '/staff/assignment-history'
    ]
  },
  {
    name: 'Danh bạ Điều phối viên',
    path: '/staff/coordinators',
    icon: 'Users',
    activePatterns: ['/staff/coordinators', '/staff/service-providers']
  },
  {
    name: 'Kiểm tra ứng viên nhà cung cấp',
    path: '/staff/provider-candidates-checker',
    icon: 'Search',
    activePatterns: ['/staff/provider-candidates', '/staff/provider-check', '/staff/provider-candidates-checker']
  },
  {
    name: 'Xử Lý Trùng Lặp',
    path: '/staff/duplicates',
    icon: 'Copy',
    activePatterns: ['/staff/duplicates', '/staff/duplicate-detection', '/staff/linked-feedbacks']
  },
  {
    name: 'Trang Cá Nhân',
    path: '/profile',
    icon: 'User',
    activePatterns: ['/profile', '/staff/profile']
  },
  {
    name: 'Cài Đặt',
    path: '/settings',
    icon: 'Settings',
    activePatterns: ['/settings', '/staff/settings']
  }
];

export const isSystemStaffMenuItemActive = (item, pathname = '/') => {
  if (!item?.activePatterns?.length) return false;

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return item.activePatterns.some((pattern) => {
    const normalizedPattern = pattern.startsWith('/') ? pattern : `/${pattern}`;
    return normalizedPath === normalizedPattern || normalizedPath.startsWith(`${normalizedPattern}/`);
  });
};

export default menuItems;
