import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

const systemStaffEmail = 'kvietanh123@gmail.com';
const validPassword = '123456789';

const loginAs = async (page, email: string, password: string) => {
  await page.goto('/login');
  const loginPage = new LoginPage(page);
  await loginPage.login(email, password);
};

test.describe('System Staff smoke tests', () => {
  test('System Staff queue loads successfully', async ({ page }) => {
    await loginAs(page, systemStaffEmail, validPassword);
    await page.waitForURL(/\/staff\/queue/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Hàng Chờ Kiểm Duyệt AI/i })).toBeVisible();
    await expect(page.getByRole('main').first()).toBeVisible();
  });
});
