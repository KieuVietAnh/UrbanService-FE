import test from 'node:test';
import assert from 'node:assert/strict';

import sidebarMenu, { isSystemStaffMenuItemActive } from './sidebarMenu.js';

test('feedback module stays active on nested feedback and report routes', () => {
  const feedbackItem = sidebarMenu.find((item) => item.name === 'Quản Lý Phản Ánh');

  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks/123'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks/123/request-info'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/provider-reports/456'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/review/789'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/assignment-history/10'), true);
});

test('other modules activate on their child routes', () => {
  const workspaceItem = sidebarMenu.find((item) => item.name === 'Không Gian Làm Việc');
  const queueItem = sidebarMenu.find((item) => item.name === 'Hàng Chờ Kiểm Duyệt AI');
  const coordinatorItem = sidebarMenu.find((item) => item.name === 'Danh bạ Điều phối viên');
  const providerItem = sidebarMenu.find((item) => item.name === 'Kiểm tra ứng viên nhà cung cấp');
  const duplicateItem = sidebarMenu.find((item) => item.name === 'Xử Lý Trùng Lặp');
  const profileItem = sidebarMenu.find((item) => item.name === 'Trang Cá Nhân');
  const settingsItem = sidebarMenu.find((item) => item.name === 'Cài Đặt');

  assert.equal(isSystemStaffMenuItemActive(workspaceItem, '/staff/workspace/123'), true);
  assert.equal(isSystemStaffMenuItemActive(queueItem, '/staff/ai-review/1'), true);
  assert.equal(isSystemStaffMenuItemActive(coordinatorItem, '/staff/service-providers/2'), true);
  assert.equal(isSystemStaffMenuItemActive(providerItem, '/staff/provider-check/3'), true);
  assert.equal(isSystemStaffMenuItemActive(duplicateItem, '/staff/linked-feedbacks/4'), true);
  assert.equal(isSystemStaffMenuItemActive(profileItem, '/staff/profile/5'), true);
  assert.equal(isSystemStaffMenuItemActive(settingsItem, '/staff/settings/6'), true);
});
