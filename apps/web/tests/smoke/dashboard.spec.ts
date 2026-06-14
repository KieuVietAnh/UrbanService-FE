import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
  });

  test('Dashboard loads with stats and charts', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
    await expect(page.locator('text=Phản ánh gần đây')).toBeVisible();
    // Check that quick-action card is visible and usable
    await expect(page.locator('text=Gửi phản ánh mới')).toBeVisible();
  });
});
