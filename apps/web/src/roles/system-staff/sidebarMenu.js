// src/roles/system-staff/sidebarMenu.js
const menuItems = [
  {
    name: 'Không Gian Làm Việc',
    label: 'Không gian làm việc',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    activePatterns: ['/staff/workspace', '/staff/dashboard', '/dashboard']
  },
  {
    name: 'Sự Vụ Của Tôi',
    label: 'Sự vụ của tôi',
    path: '/staff/incidents',
    icon: 'ClipboardList',
    activePatterns: ['/staff/incidents']
  },
  {
    name: 'Hàng Chờ Kiểm Duyệt AI',
    label: 'Hàng chờ kiểm duyệt AI',
    path: '/staff/queue',
    icon: 'Cpu',
    activePatterns: ['/staff/queue', '/staff/ai-review']
  },
  {
    name: 'Quản Lý Phản Ánh',
    label: 'Quản lý phản ánh',
    path: '/staff/feedbacks',
    icon: 'MessageSquareText',
    activePatterns: [
      '/staff/feedbacks',
      '/staff/provider-reports',
      '/staff/review',
      '/staff/completed-review',
      '/staff/request-info'
    ]
  },
  {
    name: 'Quản lý Conversation',
    label: 'Quản lý trao đổi',
    path: '/staff/conversations',
    icon: 'MessageSquare',
    activePatterns: ['/staff/conversations']
  },
  {
    name: 'Quản Lý Cảnh Báo Khu Vực',
    label: 'Quản lý cảnh báo khu vực',
    path: '/staff/area-alerts',
    icon: 'AlertTriangle',
    activePatterns: ['/staff/area-alerts', '/staff/alerts', '/staff/area-alerts-management']
  },
 
  {
    name: 'Danh bạ Điều phối viên',
    label: 'Danh bạ điều phối viên',
    path: '/staff/coordinators',
    icon: 'Users',
    activePatterns: ['/staff/coordinators', '/staff/service-providers']
  },
  {
    name: 'Kiểm tra ứng viên nhà cung cấp',
    label: 'Kiểm tra ứng viên nhà cung cấp',
    path: '/staff/provider-candidates-checker',
    icon: 'Search',
    activePatterns: ['/staff/provider-candidates', '/staff/provider-check', '/staff/provider-candidates-checker']
  },
  {
    name: 'Trang Cá Nhân',
    label: 'Trang cá nhân',
    path: '/profile',
    icon: 'User',
    activePatterns: ['/profile', '/staff/profile']
  },
  {
    name: 'Cài Đặt',
    label: 'Cài đặt',
    path: '/settings',
    icon: 'Settings',
    activePatterns: ['/settings', '/staff/settings']
  }
];

export const systemStaffSidebarSections = [
  {
    id: 'workspace',
    title: 'Không gian làm việc',
    items: menuItems.filter((item) => ['Không Gian Làm Việc', 'Sự Vụ Của Tôi', 'Hàng Chờ Kiểm Duyệt AI', 'Quản Lý Phản Ánh'].includes(item.name))
  },
  {
    id: 'coordination',
    title: 'Điều phối & giám sát',
    items: menuItems.filter((item) => ['Quản lý Conversation', 'Quản Lý Cảnh Báo Khu Vực', 'Danh bạ Điều phối viên'].includes(item.name))
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
