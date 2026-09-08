import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const staffEmail = process.env.STAFF_EMAIL;
const staffPassword = process.env.STAFF_PASSWORD;

const loginAsStaff = async (page: Page) => {
  test.skip(!staffEmail || !staffPassword, 'Cần STAFF_EMAIL và STAFF_PASSWORD để chạy smoke test SYSTEMSTAFF.');

  await page.goto('/login');
  const loginPage = new LoginPage(page);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/auth/login'),
    { timeout: 30000 },
  ).catch(() => null);
  await loginPage.login(staffEmail!, staffPassword!);
  const loginResponse = await loginResponsePromise;

  if (loginResponse && !loginResponse.ok()) {
    const responseText = await loginResponse.text().catch(() => '');
    throw new Error(`API đăng nhập trả ${loginResponse.status()}: ${responseText.slice(0, 300)}`);
  }

  const loginError = page
    .locator('.alert.alert-error, .text-red-600')
    .or(page.getByText(/Lỗi đăng nhập|Đăng nhập thất bại/i));
  if (await loginError.first().isVisible({ timeout: 4000 }).catch(() => false)) {
    throw new Error((await loginError.first().innerText()).trim());
  }

  await page.waitForFunction(() => window.location.pathname !== '/login', undefined, { timeout: 30000 });
};

const expectNoManagerActions = async (page: Page) => {
  const forbiddenActions = page.getByRole('button', {
    name: /Xác nhận phản ánh|Từ chối phản ánh|Cùng sự vụ|Khác sự vụ|Phân công Staff|Phê duyệt|Yêu cầu xử lý lại|Đóng sự vụ/i,
  });
  await expect(forbiddenActions).toHaveCount(0);
};

test.describe.serial('SYSTEMSTAFF — luồng Incident', () => {
  test.setTimeout(120000);

  test('đăng nhập mở Dashboard theo sự vụ', async ({ page }) => {
    await loginAsStaff(page);
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole('heading', { name: 'Tổng quan công việc' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem tất cả sự vụ/i }).first()).toBeVisible();
    await expect(page.getByText(/Hàng chờ kiểm duyệt AI|Xử lý trùng lặp/i)).toHaveCount(0);
  });

  test('Sự vụ của tôi tải đúng bộ lọc và phân trang backend', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/incidents');

    await expect(page.getByRole('heading', { name: 'Sự vụ của tôi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tất cả' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Được phân công' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đang xử lý' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cần xử lý lại' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chờ duyệt' })).toBeVisible();
    await expect(page.getByLabel('Tìm kiếm')).toBeVisible();
    await expect(page.getByLabel('Trạng thái')).toBeVisible();
    await expect(page.getByLabel('Mức ưu tiên')).toBeVisible();
    await expect(page.getByLabel('Độ nghiêm trọng')).toBeVisible();
    await expect(page.getByLabel('Phường / Khu vực')).toBeVisible();
    await expect(page.getByLabel('Danh mục')).toBeVisible();

    const pagination = page.getByRole('navigation', { name: 'Phân trang danh sách sự vụ được giao' });
    if (await pagination.isVisible().catch(() => false)) {
      await expect(pagination.getByRole('button', { name: 'Trang trước' })).toBeVisible();
      await expect(pagination.getByRole('button', { name: 'Trang sau' })).toBeVisible();
    }
  });

  test('chi tiết Incident có đủ năm tab và không lộ quyền Manager', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/incidents');

    const firstIncidentLink = page.locator('a[href^="/staff/incidents/"]').first();
    await expect(firstIncidentLink, 'Tài khoản Staff đã có Incident được phân công nhưng danh sách không hiển thị liên kết chi tiết.').toBeVisible({ timeout: 20000 });
    await firstIncidentLink.click();
    await expect(page).toHaveURL(/\/staff\/incidents\/[0-9a-f-]+/i);
    const tablist = page.getByRole('tablist', { name: 'Nội dung chi tiết sự vụ' });
    await expect(tablist).toBeVisible();

    for (const tabName of ['Tổng quan', 'Các phản ánh', 'Dòng thời gian', 'Xử lý', 'Kết quả xử lý']) {
      await expect(tablist.getByRole('tab', { name: new RegExp(`^${tabName}(?: \\(\\d+\\))?$`) })).toBeVisible();
    }

    await expectNoManagerActions(page);

    const tabChecks = [
      { tab: /Các phản ánh/, heading: 'Danh sách phản ánh' },
      { tab: 'Dòng thời gian', heading: 'Dòng thời gian sự vụ' },
      { tab: 'Xử lý', heading: 'Trạng thái xử lý' },
      { tab: 'Kết quả xử lý', heading: 'Kết quả xử lý sự vụ' },
    ];

    for (const { tab, heading } of tabChecks) {
      await tablist.getByRole('tab', { name: tab, exact: typeof tab === 'string' }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expectNoManagerActions(page);
    }

    const overviewTab = tablist.getByRole('tab', { name: 'Tổng quan', exact: true });
    await overviewTab.click();
    await overviewTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(tablist.getByRole('tab', { name: /Các phản ánh/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('Dashboard, danh sách và chi tiết dùng được ở viewport hẹp', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await loginAsStaff(page);
    await expect(page.getByRole('heading', { name: 'Tổng quan công việc' })).toBeVisible();

    await page.goto('/staff/incidents');
    await expect(page.getByRole('heading', { name: 'Sự vụ của tôi' })).toBeVisible();
    const firstIncidentLink = page.locator('a[href^="/staff/incidents/"]:visible').first();
    await expect(firstIncidentLink).toBeVisible();
    await firstIncidentLink.click();
    await expect(page.getByRole('tablist', { name: 'Nội dung chi tiết sự vụ' })).toBeVisible();
    await expectNoManagerActions(page);
  });

  test('chi tiết phản ánh chỉ cung cấp ngữ cảnh và liên kết về Incident', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/incidents');
    await page.locator('a[href^="/staff/incidents/"]').first().click();

    const reportsTab = page.getByRole('tab', { name: /Các phản ánh/ });
    await reportsTab.click();
    const reportLink = page.getByRole('link', { name: 'Xem phản ánh' }).first();
    await expect(reportLink).toBeVisible();
    await reportLink.click();

    await expect(page).toHaveURL(/\/staff\/feedbacks\/[0-9a-f-]+/i);
    await expect(page.getByRole('tablist', { name: 'Nội dung chi tiết phản ánh' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sự vụ liên quan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Xem chi tiết sự vụ' })).toBeVisible();
    await expectNoManagerActions(page);
  });

  test('các route quyết định cũ chuyển về màn Staff an toàn', async ({ page }) => {
    await loginAsStaff(page);
    const redirects = [
      ['/staff/queue', '/staff/feedbacks'],
      ['/staff/duplicates/candidate-legacy', '/staff/incidents'],
      ['/tickets/assign/report-legacy', '/staff/incidents'],
      ['/staff/provider-reports/999999', '/staff/incidents'],
      ['/staff/provider-candidates-checker', '/staff/coordinators'],
    ];

    for (const [route, destination] of redirects) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${destination.replaceAll('/', '\\/')}\\/?$`));
    }
  });

  test('Staff bị chặn khỏi route Manager và Admin', async ({ page }) => {
    await loginAsStaff(page);
    const blockedRoutes = [
      '/manager/reports/review',
      '/manager/incident-matches',
      '/manager/incidents',
      '/manager/approvals',
      '/admin/audit',
    ];

    for (const route of blockedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(300);
      expect(new URL(page.url()).pathname).not.toBe(route);
    }
  });
});
