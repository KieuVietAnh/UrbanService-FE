# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\dashboard.spec.ts >> Dashboard >> Dashboard loads with stats and charts
- Location: tests\smoke\dashboard.spec.ts:16:3

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
  8  | test.describe('Dashboard', () => {
  9  |   test.beforeEach(async ({ page }) => {
> 10 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at http://152.42.177.174/login
  11 |     const loginPage = new LoginPage(page);
  12 |     await loginPage.login(validEmail, validPassword);
  13 |     await page.waitForURL('**/dashboard');
  14 |   });
  15 | 
  16 |   test('Dashboard loads with stats and charts', async ({ page }) => {
  17 |     const dashboard = new DashboardPage(page);
  18 |     await dashboard.expectLoaded();
  19 |     await expect(page.getByRole('heading', { name: 'Phản ánh gần đây' })).toBeVisible();
  20 |     // Check that quick-action header link is visible and usable
  21 |     await expect(page.getByRole('link', { name: 'Gửi phản ánh' })).toBeVisible();
  22 |   });
  23 | });
  24 | 
```