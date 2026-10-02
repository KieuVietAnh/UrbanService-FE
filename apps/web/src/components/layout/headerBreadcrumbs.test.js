import test from 'node:test';
import assert from 'node:assert/strict';

import { getHeaderBreadcrumbOverride } from './headerBreadcrumbs.js';

test('uses a concise Vietnamese breadcrumb for Manager report review queue', () => {
  assert.deepEqual(getHeaderBreadcrumbOverride('/manager/reports/review'), [
    { label: 'Duyệt phản ánh', href: null },
  ]);
});

test('uses Vietnamese breadcrumb for satisfaction dashboard', () => {
  assert.deepEqual(getHeaderBreadcrumbOverride('/analytics/sentiment'), [
    { label: 'Mức độ hài lòng', href: null },
  ]);
});

test('uses Vietnamese breadcrumb for satisfaction drill-down', () => {
  assert.deepEqual(getHeaderBreadcrumbOverride('/analytics/sentiment/negative'), [
    { label: 'Mức độ hài lòng', href: '/analytics/sentiment' },
    { label: 'Đánh giá cần chú ý', href: null },
  ]);
});

test('does not override unrelated routes', () => {
  assert.equal(getHeaderBreadcrumbOverride('/analytics/heatmap'), null);
});

test('uses Vietnamese breadcrumb for notifications', () => {
  assert.deepEqual(getHeaderBreadcrumbOverride('/notifications'), [
    { label: 'Thông báo', href: null },
  ]);
});
