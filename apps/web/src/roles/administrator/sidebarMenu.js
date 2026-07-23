// src/roles/administrator/sidebarMenu.js
export default [
  { name: 'Tổng Quan Hệ Thống', path: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Quản Lý Người Dùng', path: '/management/users', icon: 'Users2' },
  { name: 'Quản Lý Feedback', path: '/management/feedbacks', icon: 'MessageSquare' },
  { name: 'Kiểm tra ứng viên nhà cung cấp', path: '/staff/provider-candidates-checker', icon: 'Search' },
  { name: 'Danh Mục Phản Ánh', path: '/management/categories', icon: 'FolderKanban' },
  { name: 'Cấu Hình SLA', path: '/management/sla', icon: 'Clock' },
  { name: 'Cấu Hình Tích Hợp', path: '/management/integrations', icon: 'Link2' },
  { name: 'Nhật Ký Hệ Thống', path: '/admin/audit', icon: 'FileClock' },
  { name: 'Hiệu Năng & Logs', path: '/admin/performance', icon: 'Activity' },
  { name: 'Cài Đặt', path: '/settings', icon: 'Settings' },
];
