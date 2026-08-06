import test from 'node:test';
import assert from 'node:assert/strict';

import sidebarMenu, { isSystemStaffMenuItemActive, systemStaffSidebarSections } from './sidebarMenu.js';

test('feedback module stays active on nested feedback and report routes', () => {
  const feedbackItem = sidebarMenu.find((item) => item.name === 'Quản Lý Phản Ánh');

  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks/123'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks/123/request-info'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/provider-reports/456'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/review/789'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/assignment-history/10'), true);
});

test('conversation management is not exposed as a standalone sidebar item', () => {
  const item = sidebarMenu.find((entry) => entry.name === 'Quản Lý Hội Thoại');

  assert.equal(item, undefined);
});

test('system staff sidebar exposes grouped sections without changing route matching', () => {
  assert.equal(systemStaffSidebarSections.length, 3);

  const [workspaceSection, coordinationSection, systemSection] = systemStaffSidebarSections;

  assert.equal(workspaceSection.title, 'Không Gian Làm Việc');
  assert.deepEqual(workspaceSection.items.map((item) => item.name), [
    'Không Gian Làm Việc',
    'Hàng Chờ Kiểm Duyệt AI',
    'Quản Lý Phản Ánh'
  ]);

  assert.equal(coordinationSection.title, 'Điều phối & Kiểm soát');
  assert.equal(systemSection.title, 'Hệ thống');
});

test('other modules activate on their child routes', () => {
  const workspaceItem = sidebarMenu.find((item) => item.name === 'Không Gian Làm Việc');
  const queueItem = sidebarMenu.find((item) => item.name === 'Hàng Chờ Kiểm Duyệt AI');
  const feedbackItem = sidebarMenu.find((item) => item.name === 'Quản Lý Phản Ánh');
  const areaAlertItem = sidebarMenu.find((item) => item.name === 'Quản Lý Cảnh Báo Khu Vực');
  const criticalFeedbackItem = sidebarMenu.find((item) => item.name === 'Phản Ánh Khẩn Cấp');
  const coordinatorItem = sidebarMenu.find((item) => item.name === 'Danh bạ Điều phối viên');
  const providerItem = sidebarMenu.find((item) => item.name === 'Kiểm tra ứng viên nhà cung cấp');
  const duplicateItem = sidebarMenu.find((item) => item.name === 'Xử Lý Trùng Lặp');
  const profileItem = sidebarMenu.find((item) => item.name === 'Trang Cá Nhân');
  const settingsItem = sidebarMenu.find((item) => item.name === 'Cài Đặt');

  assert.equal(isSystemStaffMenuItemActive(workspaceItem, '/staff/workspace/123'), true);
  assert.equal(isSystemStaffMenuItemActive(queueItem, '/staff/ai-review/1'), true);
  assert.equal(isSystemStaffMenuItemActive(feedbackItem, '/staff/feedbacks/123'), true);
  assert.equal(isSystemStaffMenuItemActive(areaAlertItem, '/staff/area-alerts/123'), true);
  assert.equal(isSystemStaffMenuItemActive(criticalFeedbackItem, '/staff/critical-feedbacks/123'), true);
  assert.equal(isSystemStaffMenuItemActive(coordinatorItem, '/staff/service-providers/2'), true);
  assert.equal(isSystemStaffMenuItemActive(providerItem, '/staff/provider-check/3'), true);
  assert.equal(isSystemStaffMenuItemActive(duplicateItem, '/staff/linked-feedbacks/4'), true);
  assert.equal(isSystemStaffMenuItemActive(profileItem, '/staff/profile/5'), true);
  assert.equal(isSystemStaffMenuItemActive(settingsItem, '/staff/settings/6'), true);
});
