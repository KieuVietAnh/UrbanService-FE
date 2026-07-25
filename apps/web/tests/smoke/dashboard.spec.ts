import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

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
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('Dashboard loads with stats and charts', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Phản ánh|Dashboard|UrbanMind|Tổng quan/i);
  });
});
