import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const serviceUserEmail = 'nguyengiauzxc@gmail.com';
const serviceUserPassword = 'nguyenhuugiau';

const systemStaffEmail = 'kvietanh123@gmail.com';
const systemStaffPassword = '123456789';

const interactionManagerEmail = 'xbg4623@gmail.com';
const interactionManagerPassword = '123456789';

const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
  await page.waitForLoadState('domcontentloaded');

  const loginError = page.locator('.alert.alert-error, .text-red-600');
  const hasLoginError = await loginError.isVisible({ timeout: 4000 }).catch(() => false);
  if (hasLoginError) {
    const message = (await loginError.first().innerText().catch(() => '')).trim() || 'Email hoặc mật khẩu không chính xác.';
    throw new Error(`Login failed for ${email}: ${message}. The external service-user or role account is unavailable in this environment.`);
  }

  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
};

const verifyUnauthorizedAccess = async (page: Page, route: string, description: string) => {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const currentPath = new URL(page.url()).pathname;
  const deniedVisible = await page
    .getByText(/Truy cập bị từ chối|Không có quyền truy cập|Không có quyền|Access denied/i)
    .first()
    .isVisible()
    .catch(() => false);

  const redirected = currentPath !== route;
  expect(
    deniedVisible || redirected,
    `${description} should be blocked for this role; got path ${currentPath}`
  ).toBeTruthy();
};

test.describe.serial('Access control smoke tests', () => {
  test.setTimeout(120000);

  test('Service User cannot access staff, manager, or admin routes', async ({ page }) => {
    try {
      await loginAs(page, serviceUserEmail, serviceUserPassword);
    } catch (error) {
      test.skip(true, error instanceof Error ? error.message : String(error));
    }

    const blockedRoutes = [
      { route: '/staff/queue', description: 'Service User to staff queue' },
      { route: '/staff/feedbacks', description: 'Service User to feedback management' },
      { route: '/manager/interactions', description: 'Service User to interaction manager' },
      { route: '/manager/approvals', description: 'Service User to approval inbox' },
      { route: '/admin/audit', description: 'Service User to audit log' },
      { route: '/admin/performance', description: 'Service User to performance dashboard' },
    ];

    for (const item of blockedRoutes) {
      await verifyUnauthorizedAccess(page, item.route, item.description);
    }
  });

  test('System Staff cannot access admin routes', async ({ page }) => {
    await loginAs(page, systemStaffEmail, systemStaffPassword);

    const blockedRoutes = [
      { route: '/admin/audit', description: 'System Staff to audit log' },
      { route: '/admin/performance', description: 'System Staff to performance dashboard' },
    ];

    for (const item of blockedRoutes) {
      await verifyUnauthorizedAccess(page, item.route, item.description);
    }
  });

  test('Interaction Manager cannot access admin routes', async ({ page }) => {
    await loginAs(page, interactionManagerEmail, interactionManagerPassword);

    const blockedRoutes = [
      { route: '/admin/audit', description: 'Interaction Manager to audit log' },
      { route: '/admin/performance', description: 'Interaction Manager to performance dashboard' },
    ];

    for (const item of blockedRoutes) {
      await verifyUnauthorizedAccess(page, item.route, item.description);
    }
  });
});
