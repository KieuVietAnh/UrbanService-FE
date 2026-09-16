export const getHeaderBreadcrumbOverride = (pathname = '') => {
  const adminOverrides = {
    '/management/staff-responsibilities': 'Phạm vi phụ trách nhân viên',
    '/management/feedbacks': 'Tra cứu phản ánh',
    '/management/map': 'Bản đồ sự vụ',
  };
  if (adminOverrides[pathname]) {
    return [{ label: adminOverrides[pathname], href: null }];
  }
  if (pathname === '/notifications') {
    return [{ label: 'Thông báo', href: null }];
  }
  if (pathname === '/manager/reports/review') {
    return [{ label: 'Duyệt phản ánh', href: null }];
  }
  if (pathname === '/analytics/sentiment/negative') {
    return [
      { label: 'Cảm xúc người dân', href: '/analytics/sentiment' },
      { label: 'Phản ánh tiêu cực', href: null },
    ];
  }
  return null;
};


