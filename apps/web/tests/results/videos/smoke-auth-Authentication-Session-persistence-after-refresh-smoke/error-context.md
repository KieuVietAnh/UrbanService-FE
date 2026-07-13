# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\auth.spec.ts >> Authentication >> Session persistence after refresh
- Location: tests\smoke\auth.spec.ts:83:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at http://152.42.177.174/login
Call log:
  - navigating to "http://152.42.177.174/login", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { DashboardPage } from '../pages/DashboardPage';
  4  | 
  5  | const validEmail = 'nguyengiauzxc@gmail.com';
  6  | const validPassword = 'nguyenhuugiau';
  7  | 
  8  | const invalidEmail = 'invalid@test.com';
  9  | const invalidPassword = 'wrongpass';
  10 | 
  11 | const logoutText = /đăng\s*xuất/i;
  12 | 
  13 | test.describe('Authentication', () => {
  14 |   test.beforeEach(async ({ page }) => {
> 15 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at http://152.42.177.174/login
  16 |   });
  17 | 
  18 |   test('Login success', async ({ page }) => {
  19 |     const loginPage = new LoginPage(page);
  20 |     await loginPage.login(validEmail, validPassword);
  21 |     await expect(page).toHaveURL(/dashboard|\/tickets|\/staff\/queue|\/provider\/tasks|\/manager\/interactions|\/admin\/audit/);
  22 |     const dashboard = new DashboardPage(page);
  23 |     await dashboard.expectLoaded();
  24 |   });
  25 | 
  26 |   test('Login failure', async ({ page }) => {
  27 |     const loginPage = new LoginPage(page);
  28 |     await loginPage.fillInvalidCredentials();
  29 |     await expect(loginPage.errorMessage).toHaveText(/Đăng nhập thất bại|Sai|invalid|Unauthorized/i);
  30 |   });
  31 | 
  32 |   test('Logout', async ({ page }) => {
  33 |     const loginPage = new LoginPage(page);
  34 |     await loginPage.login(validEmail, validPassword);
  35 |     await expect(page).toHaveURL(/dashboard|\/tickets|\/staff\/queue|\/provider\/tasks|\/manager\/interactions|\/admin\/audit/);
  36 | 
  37 |     const openUserMenuIfPresent = async () => {
  38 |       const userMenuTriggers = [
  39 |         page.getByRole('button', { name: /menu người dùng/i }),
  40 |         page.locator('button[title="Menu người dùng"]').first(),
  41 |         page.locator('button.avatar').first(),
  42 |         page.locator('label.btn.btn-ghost.btn-circle.avatar').first(),
  43 |       ];
  44 | 
  45 |       for (const trigger of userMenuTriggers) {
  46 |         if (await trigger.isVisible({ timeout: 500 }).catch(() => false)) {
  47 |           await trigger.click();
  48 |           return true;
  49 |         }
  50 |       }
  51 | 
  52 |       return false;
  53 |     };
  54 | 
  55 |     const clickVisibleLogout = async () => {
  56 |       const logoutButton = page.getByRole('button', { name: logoutText }).last();
  57 | 
  58 |       if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
  59 |         await logoutButton.click();
  60 |         return true;
  61 |       }
  62 | 
  63 |       return false;
  64 |     };
  65 | 
  66 |     if (!(await clickVisibleLogout())) {
  67 |       await openUserMenuIfPresent();
  68 |       await expect(page.getByRole('button', { name: logoutText }).last()).toBeVisible({ timeout: 5000 });
  69 |       await clickVisibleLogout();
  70 |     }
  71 | 
  72 |     if (!/\/login/.test(page.url())) {
  73 |       const confirmLogoutButton = page.getByRole('button', { name: /^đăng\s*xuất$/i }).last();
  74 | 
  75 |       if (await confirmLogoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  76 |         await confirmLogoutButton.click();
  77 |       }
  78 |     }
  79 | 
  80 |     await expect(page).toHaveURL(/\/login/);
  81 |   });
  82 | 
  83 |   test('Session persistence after refresh', async ({ page }) => {
  84 |     const loginPage = new LoginPage(page);
  85 |     await loginPage.login(validEmail, validPassword);
  86 |     await page.waitForURL('**/dashboard');
  87 |     await page.reload();
  88 |     await expect(page).toHaveURL(/\/dashboard/);
  89 |   });
  90 | });
  91 | 
```