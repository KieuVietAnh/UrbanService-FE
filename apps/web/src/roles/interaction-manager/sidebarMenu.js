// src/roles/interaction-manager/sidebarMenu.js
export default [
  { name: 'Tổng Quan Chỉ Số', path: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Xác nhận phản ánh', path: '/manager/reports/review', icon: 'ClipboardCheck' },
  { name: 'Đề xuất cùng sự vụ', path: '/manager/incident-matches', icon: 'GitCompareArrows' },
  { name: 'Quản lý sự vụ', path: '/manager/incidents', icon: 'BriefcaseBusiness' },
  { name: 'Giám Sát Tương Tác', path: '/manager/interactions', icon: 'MessageSquareDashed' },
  { name: 'Hàng Đợi Duyệt', path: '/manager/approvals', icon: 'GitPullRequestArrow' },
  {
  name: 'Quản Lý Điều Phối Viên',
  path: '/management/coordinators',
  icon: 'Network',
},
  { name: 'Phân Tích SLA', path: '/analytics/sla', icon: 'BarChart3' },
  // Provider candidate checker removed
  { name: 'Cảm Xúc Người Dân (AI)', path: '/analytics/sentiment', icon: 'Smile' },
  { name: 'Bản Đồ Điểm Nóng', path: '/analytics/heatmap', icon: 'Flame' },
  { name: 'Cài Đặt', path: '/settings', icon: 'Settings' }
];
