export const getHeaderBreadcrumbOverride = (pathname = '') => {
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
