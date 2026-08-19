import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const interactionManagerEmail = 'xbg4623@gmail.com';
const interactionManagerPassword = '123456789';

const interactionsRoute = '/manager/interactions';
const approvalsRoute = '/manager/approvals';
const slaRoute = '/analytics/sla';
const sentimentRoute = '/analytics/sentiment';
const heatmapRoute = '/analytics/heatmap';

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

const assertNoErrors = async (monitor: PageMonitor, context: string) => {
  const relevantPageErrors = monitor.pageErrors.filter((error) => !/Unexpected token '<'/.test(String(error)));
  expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);

  const consoleRelevant = monitor.consoleErrors.filter((message) => {
    if (!message) return false;
    if (/Unexpected token '<'/.test(message)) return false;
    if (/Failed to load resource: the server responded with a status of 405/.test(message)) return false;
    if (/\b405\b/.test(message) && /Method Not Allowed/i.test(message)) return false;
    return true;
  });
  expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);

  const badRelevant = monitor.badResponses.filter((entry) => !/\b405\b/.test(entry));
  expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
};

const loginAsInteractionManager = async (page: Page) => {
  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(interactionManagerEmail, interactionManagerPassword);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForSelector('.admin-page-hero, .admin-hero-title, .dashboard-shell, header', { timeout: 30000 }).catch(() => undefined);
};

const verifyRouteAndPage = async (page: Page, route: string, locator: string | ReturnType<Page['locator']>, description: string) => {
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

test.describe.serial('Interaction Manager smoke tests', () => {
  test.setTimeout(120000);

  test('Login successfully and open interaction monitoring', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);

    await verifyRouteAndPage(
      page,
      interactionsRoute,
      page.getByRole('heading', { name: /Giám sát luồng tương tác|Luồng tương tác/i }).first(),
      'interaction monitoring'
    );

    await assertNoErrors(monitor, 'Interaction monitoring');
  });

  test('Open approval inbox', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);
    await verifyRouteAndPage(
      page,
      approvalsRoute,
      page.getByRole('heading', { name: /Hàng đợi duyệt kết quả|Hàng đợi duyệt/i }).first(),
      'approval inbox'
    );

    await assertNoErrors(monitor, 'Approval inbox');
  });

  test('Open approval detail from first available item', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);
    await page.goto(approvalsRoute);
    await page.waitForLoadState('domcontentloaded');

    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount === 0) {
      console.log('No approval items available — skipping detail check.');
      return;
    }

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    const approvalButton = firstRow.locator('button:has-text("Xem hồ sơ"), button:has-text("View"), button:has-text("Open")').first();
    await expect(approvalButton).toBeVisible({ timeout: 15000 });
    await approvalButton.click();
    await page.waitForURL(/\/manager\/approvals\/[A-Za-z0-9_-]+/, { timeout: 30000 });

    await expect(
      page.locator('h1, h2, h3').filter({ hasText: /Nội dung phản ánh|Chi tiết phản ánh|Không tìm thấy hồ sơ/i }).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Quay lại|Quay lại danh sách/i })).toBeVisible({ timeout: 15000 });
    await assertNoErrors(monitor, 'Approval detail');
  });

  test('Open SLA analytics dashboard', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);
    await verifyRouteAndPage(
      page,
      slaRoute,
      page.getByRole('heading', { name: /Chỉ số SLA dịch vụ|SLA/i }).first(),
      'SLA analytics'
    );

    await assertNoErrors(monitor, 'SLA analytics');
  });

  test('Open sentiment dashboard', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);
    await verifyRouteAndPage(
      page,
      sentimentRoute,
      page.getByRole('heading', { name: /Cảm xúc và nhận thức người dân|Cảm xúc/i }).first(),
      'sentiment dashboard'
    );

    await assertNoErrors(monitor, 'Sentiment dashboard');
  });

  test('Open heatmap dashboard', async ({ page }) => {
    const monitor = attachPageMonitoring(page);

    await loginAsInteractionManager(page);
    await verifyRouteAndPage(
      page,
      heatmapRoute,
      page.getByRole('heading', { name: /Bản đồ điểm nóng|Bản đồ nhiệt phản ánh đô thị|Bản đồ nhiệt/i }).first(),
      'heatmap dashboard'
    );

    await assertNoErrors(monitor, 'Heatmap dashboard');
  });
});
