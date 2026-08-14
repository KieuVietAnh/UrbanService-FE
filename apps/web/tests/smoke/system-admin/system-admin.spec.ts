import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const systemAdminEmail = 'anhkvse182347@fpt.edu.vn';
const systemAdminPassword = '123456789';

const usersRoute = '/management/users';
const feedbacksRoute = '/management/feedbacks';
const categoriesRoute = '/management/categories';
const slaRoute = '/management/sla';
const auditRoute = '/admin/audit';
const performanceRoute = '/admin/performance';

type PageMonitor = {
  pageErrors: string[];
  consoleErrors: string[];
  badResponses: string[];
};

const attachPageMonitoring = (page: Page): PageMonitor => {
  const monitor: PageMonitor = { pageErrors: [], consoleErrors: [], badResponses: [] };

  page.on('pageerror', (error) => monitor.pageErrors.push(error?.message || String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      monitor.consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && /\/api\//i.test(url)) {
      monitor.badResponses.push(`${status} ${response.request().method()} ${url}`);
    }
  });

  return monitor;
};

const assertNoErrors = async (
  monitor: PageMonitor,
  context: string,
  ignoreConsolePatterns: RegExp[] = [],
  ignoreBadResponsePatterns: RegExp[] = []
) => {
  const relevantPageErrors = monitor.pageErrors.filter((error) => !/Unexpected token '<'/.test(String(error)));
  expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);

  const consoleRelevant = monitor.consoleErrors.filter((message) => {
    if (!message) return false;
    if (/Unexpected token '<'/.test(message)) return false;
    if (/Failed to load resource: the server responded with a status of 405\./.test(message)) return false;
    if (/\b405\b/.test(message) && /Method Not Allowed/i.test(message)) return false;
    if (ignoreConsolePatterns.some((pattern) => pattern.test(message))) return false;
    return true;
  });
  expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);

  const badRelevant = monitor.badResponses.filter((entry) => {
    if (/\b405\b/.test(entry)) return false;
    if (ignoreBadResponsePatterns.some((pattern) => pattern.test(entry))) return false;
    return true;
  });
  expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
};

const loginAsSystemAdmin = async (page: Page) => {
  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(systemAdminEmail, systemAdminPassword);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForSelector('.admin-page-hero, .admin-hero-title, .dashboard-shell, header', { timeout: 30000 }).catch(() => undefined);
};

const verifyRouteAndPage = async (
  page: Page,
  route: string,
  locator: string | ReturnType<Page['locator']>,
  description: string
) => {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');

  if (typeof locator === 'string') {
    await expect(page.locator(locator)).toBeVisible({ timeout: 15000 });
  } else {
    await expect(locator).toBeVisible({ timeout: 15000 });
  }

  const currentPath = new URL(page.url()).pathname;
  expect(currentPath.includes(route), `${description} route did not resolve to ${route}`).toBeTruthy();
};

test.describe.serial('System Administrator smoke tests', () => {
  test.setTimeout(120000);

  test('Login successfully as administrator', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await expect(page.getByRole('heading', { name: /Quản lý người dùng|Quản lý feedback|Danh mục phản ánh|Cấu hình thời hạn SLA|Nhật ký hệ thống|Hiệu năng & trạng thái hệ thống/i }).first()).toBeVisible({ timeout: 15000 });
    await assertNoErrors(monitor, 'Administrator login');
  });

  test('User Management loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, usersRoute, page.getByRole('heading', { name: /Quản lý người dùng/i }), 'User Management');
    await assertNoErrors(monitor, 'User Management');
  });

  test('Feedback Management loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, feedbacksRoute, page.getByRole('heading', { name: /Quản lý feedback|Quản lý phản ánh/i }), 'Feedback Management');
    await assertNoErrors(monitor, 'Feedback Management');
  });

  test('Category Management loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, categoriesRoute, page.getByRole('heading', { name: /Danh mục phản ánh/i }), 'Category Management');
    await assertNoErrors(
      monitor,
      'Category Management',
      [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
      [/404 .*\/api\/management\/categories/]
    );
  });

  test('SLA Configuration loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, slaRoute, page.getByRole('heading', { name: /Cấu hình thời hạn SLA|Chính sách SLA/i }), 'SLA Configuration');
    await assertNoErrors(
      monitor,
      'SLA Configuration',
      [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
      [/404 .*\/api\/management\/sla/, /404 .*\/api\/management\/sla-config/]
    );
  });

  test('Audit Log loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, auditRoute, page.getByRole('heading', { name: /Nhật ký hệ thống/i }), 'Audit Log');
    await assertNoErrors(monitor, 'Audit Log');
  });

  test('Performance Dashboard loads', async ({ page }) => {
    const monitor = attachPageMonitoring(page);
    await loginAsSystemAdmin(page);

    await verifyRouteAndPage(page, performanceRoute, page.getByRole('heading', { name: /Hiệu năng & trạng thái hệ thống/i }), 'Performance Dashboard');
    await assertNoErrors(
      monitor,
      'Performance Dashboard',
      [/Failed to load resource: the server responded with a status of 403 \(Forbidden\)/],
      [/403 .*\/api\/user\/feedbacks/]
    );
  });
});
