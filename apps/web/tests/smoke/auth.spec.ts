import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

const invalidEmail = 'invalid@test.com';
const invalidPassword = 'wrongpass';

const logoutText = /đăng\s*xuất/i;

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Login success', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await expect(page).toHaveURL(/dashboard|\/tickets|\/staff\/queue|\/provider\/tasks|\/manager\/interactions|\/admin\/audit/);
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });

  test('Login failure', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.fillInvalidCredentials();
    await expect(loginPage.errorMessage).toHaveText(/Đăng nhập thất bại|Sai|invalid|Unauthorized/i);
  });

  test('Logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await expect(page).toHaveURL(/dashboard|\/tickets|\/staff\/queue|\/provider\/tasks|\/manager\/interactions|\/admin\/audit/);

    const openUserMenuIfPresent = async () => {
      const userMenuTriggers = [
        page.getByRole('button', { name: /menu người dùng/i }),
        page.locator('button[title="Menu người dùng"]').first(),
        page.locator('button.avatar').first(),
        page.locator('label.btn.btn-ghost.btn-circle.avatar').first(),
      ];

      for (const trigger of userMenuTriggers) {
        if (await trigger.isVisible({ timeout: 500 }).catch(() => false)) {
          await trigger.click();
          return true;
        }
      }

      return false;
    };

    const clickVisibleLogout = async () => {
      const logoutButton = page.getByRole('button', { name: logoutText }).last();

      if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await logoutButton.click();
        return true;
      }

      return false;
    };

    if (!(await clickVisibleLogout())) {
      await openUserMenuIfPresent();
      await expect(page.getByRole('button', { name: logoutText }).last()).toBeVisible({ timeout: 5000 });
      await clickVisibleLogout();
    }

    if (!/\/login/.test(page.url())) {
      const confirmLogoutButton = page.getByRole('button', { name: /^đăng\s*xuất$/i }).last();

      if (await confirmLogoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmLogoutButton.click();
      }
    }

    await expect(page).toHaveURL(/\/login/);
  });

  test('Session persistence after refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
