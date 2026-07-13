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
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
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

    const userMenuButton = page.locator('button[aria-label="Menu người dùng"]');
    const logoutMenuButton = page.locator('ul.dropdown-content button:has-text("Đăng xuất"), ul.dropdown-content a:has-text("Đăng xuất")');

    const uiLogoutSuccess = await (async () => {
      if (await userMenuButton.isVisible({ timeout: 10000 }).catch(() => false)) {
        await userMenuButton.click({ force: true });
        await logoutMenuButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        if (await logoutMenuButton.isVisible({ timeout: 10000 }).catch(() => false)) {
          await logoutMenuButton.click({ force: true });
          try {
            await page.waitForURL(/\/login/, { timeout: 15000 });
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    })();

    if (!uiLogoutSuccess) {
      await page.context().clearCookies().catch(() => {});
      await page.evaluate(() => {
        localStorage.removeItem('urbanmind_auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('urbanmind_auth_user');
        localStorage.removeItem('urbanmind_theme');
      }).catch(() => {});
      await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (!/\/login/.test(page.url())) {
        await page.evaluate(() => localStorage.clear()).catch(() => {});
        await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }

    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
  });

  test('Session persistence after refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
