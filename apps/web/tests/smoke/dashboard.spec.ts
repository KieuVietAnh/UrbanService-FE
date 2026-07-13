import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth endpoint so tests don't depend on the backend
    await page.route('**/api/auth/login', async (route) => {
      const req = route.request();
      const post = (await req.postData()) || '';
      if (post.includes(validEmail) && post.includes(validPassword)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { token: 'fake-token', user: { userId: 1, email: validEmail, fullName: 'Test User', role: 'service-user', isVerified: true } } }),
        });
      } else {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
  });

  test('Dashboard loads with stats and charts', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
    await expect(page.getByRole('heading', { name: 'Phản ánh gần đây' })).toBeVisible();
    // Check that quick-action header link is visible and usable (match first occurrence)
    await expect(page.getByRole('link', { name: /Gửi phản ánh/i }).first()).toBeVisible();
  });
});
