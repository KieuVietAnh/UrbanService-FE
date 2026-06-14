import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

const invalidEmail = 'invalid@test.com';
const invalidPassword = 'wrongpass';

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
    await page.waitForURL('**/dashboard');

    const logoutButton = page.locator('button', { hasText: /đăng xuất/i }).first();
    if (!(await logoutButton.isVisible())) {
      const avatarToggle = page.locator('label.btn.btn-ghost.btn-circle.avatar').first();
      if (await avatarToggle.isVisible()) {
        await avatarToggle.click();
      } else {
        const sidebarLogout = page.locator('button', { hasText: /đăng xuất/i }).first();
        // Try a DOM-eval fallback for cases where Playwright sees the button but it's not interactable (webkit)
        const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find(el => el.textContent && el.textContent.toLowerCase().includes('đăng xuất'));
          if (b) {
            b.click();
            return true;
          }
          return false;
        });
        if (!clicked) {
          await sidebarLogout.waitFor({ state: 'visible', timeout: 5000 });
          await sidebarLogout.click();
        }
        await expect(page).toHaveURL(/\/login/);
        return;
      }
      await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    }

    await logoutButton.click();
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
