import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

const administratorEmail = 'anhkvse182347@fpt.edu.vn';
const validPassword = '123456789';
const invalidEmail = 'invalid@example.com';
const invalidPassword = 'wrongpassword';

const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
};

test.describe('Authentication smoke tests', () => {
  test('Administrator can log in and load audit logs page', async ({ page }) => {
    await loginAs(page, administratorEmail, validPassword);
    await page.waitForURL(/\/admin\/audit/, { timeout: 30000 });
    await expect(
      page.locator('h1, h2').filter({ hasText: /Nhật ký hệ thống|Audit|Hệ thống/i }).first()
    ).toBeVisible({ timeout: 20000 });
    await expect(page.locator('button.admin-sidebar-logout')).toBeVisible();
  });

  test('Invalid credentials show login error', async ({ page }) => {
    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await loginPage.emailInput.fill(invalidEmail);
    await loginPage.passwordInput.fill(invalidPassword);
    await loginPage.submitButton.click();
    await expect(loginPage.errorMessage).toContainText(/Đăng nhập thất bại|Sai|invalid|Unauthorized/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('Logout returns to login screen', async ({ page }) => {
    await loginAs(page, administratorEmail, validPassword);
    await page.waitForURL(/\/admin\/audit/, { timeout: 30000 });

    const sidebarLogoutButton = page.locator('button.admin-sidebar-logout');
    await expect(sidebarLogoutButton).toBeVisible();
    await sidebarLogoutButton.click();

    const confirmLogoutButton = page.locator('div.modal-box button.btn-error');
    await expect(confirmLogoutButton).toBeVisible();
    await confirmLogoutButton.click();

    await page.waitForURL(/\/login/, { timeout: 20000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
