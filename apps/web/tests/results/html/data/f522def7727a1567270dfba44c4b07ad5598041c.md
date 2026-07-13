# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\auth.spec.ts >> Authentication >> Session persistence after refresh
- Location: tests\smoke\auth.spec.ts:83:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img [ref=e7]
    - generic [ref=e10]:
      - heading "UrbanMind" [level=3] [ref=e11]
      - heading "Đăng nhập UrbanMind" [level=2] [ref=e12]
      - paragraph [ref=e13]: Kết nối cộng đồng, kiến tạo tương lai đô thị.
  - generic [ref=e14]:
    - img [ref=e15]
    - generic [ref=e17]:
      - heading "Lỗi đăng nhập" [level=4] [ref=e18]
      - paragraph [ref=e19]: Request failed with status code 405
    - button "Đóng thông báo" [ref=e20] [cursor=pointer]:
      - img [ref=e21]
  - generic [ref=e24]:
    - generic [ref=e25]:
      - text: Email hoặc số điện thoại
      - generic [ref=e26]:
        - img [ref=e28]
        - textbox "Email hoặc số điện thoại" [ref=e31]:
          - /placeholder: name@email.com
          - text: nguyengiauzxc@gmail.com
    - generic [ref=e32]:
      - text: Mật khẩu
      - generic [ref=e33]:
        - img [ref=e35]
        - textbox "Mật khẩu" [ref=e38]:
          - /placeholder: ••••••••
          - text: nguyenhuugiau
        - img [ref=e40]
    - generic [ref=e43]:
      - generic [ref=e44] [cursor=pointer]:
        - checkbox "Ghi nhớ đăng nhập" [ref=e45]
        - generic [ref=e46]: Ghi nhớ đăng nhập
      - button "Quên mật khẩu" [ref=e47]: Quên mật khẩu?
    - button "Đăng nhập" [ref=e48] [cursor=pointer]:
      - generic [ref=e49]: Đăng nhập
      - img [ref=e50]
  - generic [ref=e52]: HOẶC
  - button "Google logo Đăng nhập với Google" [ref=e53] [cursor=pointer]:
    - img "Google logo" [ref=e54]
    - generic [ref=e61]: Đăng nhập với Google
  - generic [ref=e62]:
    - text: Bạn chưa có tài khoản?
    - link "Đăng ký ngay" [ref=e63] [cursor=pointer]:
      - /url: /register
  - generic [ref=e64]:
    - heading "Đăng nhập nhanh bằng tài khoản mẫu" [level=4] [ref=e65]
    - paragraph [ref=e66]: "Mật khẩu mặc định: 123456789"
    - generic [ref=e67]:
      - button "Administrator" [ref=e68] [cursor=pointer]
      - button "System Staff" [ref=e69] [cursor=pointer]
      - button "Interaction Manager" [ref=e70] [cursor=pointer]
      - button "Service Operator" [ref=e71] [cursor=pointer]
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
  15 |     await page.goto('/login');
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
> 86 |     await page.waitForURL('**/dashboard');
     |                ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  87 |     await page.reload();
  88 |     await expect(page).toHaveURL(/\/dashboard/);
  89 |   });
  90 | });
  91 | 
```