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
    name: 'Quản Lý Cảnh Báo Khu Vực',
    path: '/staff/area-alerts',
    icon: 'AlertTriangle',
    activePatterns: ['/staff/area-alerts', '/staff/alerts', '/staff/area-alerts-management']
  },
  {
    name: 'Phản Ánh Khẩn Cấp',
    path: '/staff/critical-feedbacks',
    icon: 'AlertCircle',
    activePatterns: ['/staff/critical-feedbacks', '/staff/critical-feedbacks-management']
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

export const systemStaffSidebarSections = [
  {
    id: 'workspace',
    title: 'Không Gian Làm Việc',
    items: menuItems.filter((item) => ['Không Gian Làm Việc', 'Hàng Chờ Kiểm Duyệt AI', 'Quản Lý Phản Ánh'].includes(item.name))
  },
  {
    id: 'coordination',
    title: 'Điều phối & Kiểm soát',
    items: menuItems.filter((item) => ['Quản Lý Cảnh Báo Khu Vực', 'Phản Ánh Khẩn Cấp', 'Danh bạ Điều phối viên', 'Kiểm tra ứng viên nhà cung cấp', 'Xử Lý Trùng Lặp'].includes(item.name))
  },
  {
    id: 'system',
    title: 'Hệ thống',
    items: menuItems.filter((item) => ['Trang Cá Nhân', 'Cài Đặt'].includes(item.name))
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
