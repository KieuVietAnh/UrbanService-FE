// src/roles/administrator/sidebarMenu.js
export default [
  { name: 'Tổng quan hệ thống', path: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Quản lý người dùng', path: '/management/users', icon: 'Users2' },
  { name: 'Quản lý điều phối viên', path: '/management/coordinators', icon: 'Network' },
  { name: 'Quản lý phản ánh', path: '/management/feedbacks', icon: 'MessageSquare' },
  { name: 'Danh mục phản ánh', path: '/management/categories', icon: 'FolderKanban' },
  { name: 'Chính sách SLA', path: '/management/sla', icon: 'Clock' },
  { name: 'Cấu hình tích hợp', path: '/management/integrations', icon: 'Link2' },
  { name: 'Nhật ký hệ thống', path: '/admin/audit', icon: 'FileClock' },
  { name: 'Hiệu năng & nhật ký', path: '/admin/performance', icon: 'Activity' },
  { name: 'Cài đặt', path: '/settings', icon: 'Settings' },
];
