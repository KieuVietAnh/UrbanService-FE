# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\system-admin\system-admin.spec.ts >> System Administrator smoke tests >> Audit Log loads
- Location: tests\smoke\system-admin\system-admin.spec.ts:161:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Nhật ký hệ thống|Audit Log|System Audit Log/i })
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByRole('heading', { name: /Nhật ký hệ thống|Audit Log|System Audit Log/i })

```

```yaml
- complementary:
  - heading "UrbanMind" [level=1]
  - paragraph: Smart City
  - text: KA
  - heading "Kieu Viet Anh" [level=4]
  - text: Quản Trị Viên
  - navigation:
    - link "Tổng quan hệ thống":
      - /url: /dashboard
    - link "Quản lý người dùng":
      - /url: /management/users
    - link "Quản lý điều phối viên":
      - /url: /management/coordinators
    - link "Quản lý phản ánh":
      - /url: /management/feedbacks
    - link "Bản đồ phản ánh":
      - /url: /management/map
    - link "Danh mục phản ánh":
      - /url: /management/categories
    - link "Chính sách SLA":
      - /url: /management/sla
    - link "Cài đặt":
      - /url: /settings
  - button "Đăng xuất"
- banner:
  - navigation "Breadcrumb": Tổng quan hệ thống
  - button "Toggle theme"
  - button "Thông báo"
- main:
  - heading "Tổng quan hệ thống" [level=2]
  - paragraph: Theo dõi tài khoản, phản ánh, vị trí sự cố, danh mục và chính sách SLA trên một màn hình thống nhất.
  - link "Quản lý phản ánh":
    - /url: /management/feedbacks
  - link "Quản lý tài khoản":
    - /url: /management/users
  - link "Tổng phản ánh 85 Toàn bộ phản ánh trong hệ thống":
    - /url: /management/feedbacks?metric=total
    - paragraph: Tổng phản ánh
    - paragraph: "85"
    - paragraph: Toàn bộ phản ánh trong hệ thống
  - link "Chờ xử lý 31 Mới gửi, AI đã duyệt hoặc đã xác minh":
    - /url: /management/feedbacks?metric=pending
    - paragraph: Chờ xử lý
    - paragraph: "31"
    - paragraph: Mới gửi, AI đã duyệt hoặc đã xác minh
  - link "Đang xử lý 42 Đã phân công hoặc đang thực hiện":
    - /url: /management/feedbacks?metric=inProgress
    - paragraph: Đang xử lý
    - paragraph: "42"
    - paragraph: Đã phân công hoặc đang thực hiện
  - link "Hoàn tất 12 Đã xử lý, duyệt, đóng hoặc kết thúc":
    - /url: /management/feedbacks?metric=completed
    - paragraph: Hoàn tất
    - paragraph: "12"
    - paragraph: Đã xử lý, duyệt, đóng hoặc kết thúc
  - heading "Bản đồ phản ánh" [level=3]
  - paragraph: Quan sát nhanh các phản ánh có tọa độ và mở bản đồ điều hành đầy đủ.
  - link "Mở bản đồ lớn":
    - /url: /management/map#admin-incident-map
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button
  - button "Zoom in"
  - button "Zoom out"
  - link "Leaflet":
    - /url: https://leafletjs.com
  - text: © OpenStreetMap contributors
  - link "Mở bản đồ sự cố đầy đủ":
    - /url: /management/map#admin-incident-map
    - text: Bản đồ phản ánh
    - strong: 84 vị trí đang hiển thị
  - heading "Thống kê phản ánh theo danh mục" [level=3]
  - paragraph: So sánh số lượng và tỷ trọng phản ánh giữa các danh mục đang cấu hình.
  - paragraph: Tổng phản ánh
  - paragraph: "85"
  - link "Quản lý danh mục":
    - /url: /management/categories
  - paragraph: Chiếu sáng công cộng
  - text: 16phản ánh 18.8%
  - paragraph: Bảo trì đường bộ
  - text: 15phản ánh 17.6%
  - paragraph: Cấp nước
  - text: 11phản ánh 12.9%
  - paragraph: Thoát nước & Ngập úng
  - text: 11phản ánh 12.9%
  - paragraph: Chưa phân loại
  - text: 11phản ánh 12.9%
  - paragraph: Thu gom rác thải
  - text: 11phản ánh 12.9%
  - paragraph: An toàn công cộng
  - text: 10phản ánh 11.8%
  - heading "Tổng quan SLA" [level=3]
  - paragraph: Theo dõi nhanh tình trạng tuân thủ thời hạn xử lý phản ánh.
  - paragraph: Tổng SLA
  - paragraph: "57"
  - link "Quản lý SLA":
    - /url: /management/sla
  - link "Đang chạy 38 SLA đang được theo dõi Cảnh báo 38 Đang gần tới hạn Vi phạm 49 Đã vượt thời hạn Tỷ lệ thành công 21.43% Hoàn thành đúng SLA":
    - /url: /management/sla
    - paragraph: Đang chạy
    - paragraph: "38"
    - paragraph: SLA đang được theo dõi
    - paragraph: Cảnh báo
    - paragraph: "38"
    - paragraph: Đang gần tới hạn
    - paragraph: Vi phạm
    - paragraph: "49"
    - paragraph: Đã vượt thời hạn
    - paragraph: Tỷ lệ thành công
    - paragraph: 21.43%
    - paragraph: Hoàn thành đúng SLA
  - heading "Phản ánh mới nhất" [level=3]
  - paragraph: Dữ liệu tổng hợp để Admin giám sát luồng vận hành.
  - link "Quản lý phản ánh":
    - /url: /management/feedbacks
  - table:
    - rowgroup:
      - row "Mã Nội dung Danh mục Ưu tiên Trạng thái":
        - columnheader "Mã"
        - columnheader "Nội dung"
        - columnheader "Danh mục"
        - columnheader "Ưu tiên"
        - columnheader "Trạng thái"
    - rowgroup:
      - row "UM-2026-00a5b81f2a4e02 Bb Khác TRUNG BÌNH Cần review AI":
        - cell "UM-2026-00a5b81f2a4e02":
          - button "UM-2026-00a5b81f2a4e02"
        - cell "Bb"
        - cell "Khác"
        - cell "TRUNG BÌNH"
        - cell "Cần review AI"
      - row "UM-2026-0063c9908fc1d3 Cc Khác TRUNG BÌNH Cần review AI":
        - cell "UM-2026-0063c9908fc1d3":
          - button "UM-2026-0063c9908fc1d3"
        - cell "Cc"
        - cell "Khác"
        - cell "TRUNG BÌNH"
        - cell "Cần review AI"
      - row "UM-2026-00d1d7e6b72c17 Test ai review Khác TRUNG BÌNH Cần review AI":
        - cell "UM-2026-00d1d7e6b72c17":
          - button "UM-2026-00d1d7e6b72c17"
        - cell "Test ai review"
        - cell "Khác"
        - cell "TRUNG BÌNH"
        - cell "Cần review AI"
      - row "UM-2026-00e0a59506a73d zz Khác TRUNG BÌNH Cần review AI":
        - cell "UM-2026-00e0a59506a73d":
          - button "UM-2026-00e0a59506a73d"
        - cell "zz"
        - cell "Khác"
        - cell "TRUNG BÌNH"
        - cell "Cần review AI"
      - row "UM-2026-006b2326404d74 s Khác TRUNG BÌNH Cần review AI":
        - cell "UM-2026-006b2326404d74":
          - button "UM-2026-006b2326404d74"
        - cell "s"
        - cell "Khác"
        - cell "TRUNG BÌNH"
        - cell "Cần review AI"
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { LoginPage } from '../../pages/LoginPage';
  3   | 
  4   | const systemAdminEmail = 'anhkvse182347@fpt.edu.vn';
  5   | const systemAdminPassword = '123456789';
  6   | 
  7   | const usersRoute = '/management/users';
  8   | const feedbacksRoute = '/management/feedbacks';
  9   | const categoriesRoute = '/management/categories';
  10  | const slaRoute = '/management/sla';
  11  | const auditRoute = '/admin/audit';
  12  | const performanceRoute = '/admin/performance';
  13  | 
  14  | type PageMonitor = {
  15  |   pageErrors: string[];
  16  |   consoleErrors: string[];
  17  |   badResponses: string[];
  18  | };
  19  | 
  20  | const attachPageMonitoring = (page: Page): PageMonitor => {
  21  |   const monitor: PageMonitor = { pageErrors: [], consoleErrors: [], badResponses: [] };
  22  | 
  23  |   page.on('pageerror', (error) => monitor.pageErrors.push(error?.message || String(error)));
  24  |   page.on('console', (message) => {
  25  |     if (message.type() === 'error') {
  26  |       monitor.consoleErrors.push(message.text());
  27  |     }
  28  |   });
  29  |   page.on('response', (response) => {
  30  |     const status = response.status();
  31  |     const url = response.url();
  32  |     if (status >= 400 && /\/api\//i.test(url)) {
  33  |       monitor.badResponses.push(`${status} ${response.request().method()} ${url}`);
  34  |     }
  35  |   });
  36  | 
  37  |   return monitor;
  38  | };
  39  | 
  40  | const assertNoErrors = async (
  41  |   monitor: PageMonitor,
  42  |   context: string,
  43  |   ignoreConsolePatterns: RegExp[] = [],
  44  |   ignoreBadResponsePatterns: RegExp[] = []
  45  | ) => {
  46  |   const relevantPageErrors = monitor.pageErrors.filter((error) => !/Unexpected token '<'/.test(String(error)));
  47  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
  48  | 
  49  |   const consoleRelevant = monitor.consoleErrors.filter((message) => {
  50  |     if (!message) return false;
  51  |     if (/Unexpected token '<'/.test(message)) return false;
  52  |     if (/Failed to load resource: the server responded with a status of 405\./.test(message)) return false;
  53  |     if (/\b405\b/.test(message) && /Method Not Allowed/i.test(message)) return false;
  54  |     if (ignoreConsolePatterns.some((pattern) => pattern.test(message))) return false;
  55  |     return true;
  56  |   });
  57  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
  58  | 
  59  |   const badRelevant = monitor.badResponses.filter((entry) => {
  60  |     if (/\b405\b/.test(entry)) return false;
  61  |     if (ignoreBadResponsePatterns.some((pattern) => pattern.test(entry))) return false;
  62  |     return true;
  63  |   });
  64  |   expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
  65  | };
  66  | 
  67  | const loginAsSystemAdmin = async (page: Page) => {
  68  |   await page.goto('/login');
  69  |   const loginPage = new LoginPage(page);
  70  |   await loginPage.login(systemAdminEmail, systemAdminPassword);
  71  |   await page.waitForLoadState('domcontentloaded');
  72  |   await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  73  |   await page.waitForSelector('.admin-page-hero, .admin-hero-title, .dashboard-shell, header', { timeout: 30000 }).catch(() => undefined);
  74  | };
  75  | 
  76  | const verifyRouteAndPage = async (
  77  |   page: Page,
  78  |   route: string,
  79  |   locator: string | ReturnType<Page['locator']>,
  80  |   description: string
  81  | ) => {
  82  |   const pageLoadTimeout = 30000;
  83  | 
  84  |   await page.goto(route);
  85  |   await page.waitForLoadState('domcontentloaded');
  86  | 
  87  |   if (typeof locator === 'string') {
  88  |     await expect(page.locator(locator)).toBeVisible({ timeout: pageLoadTimeout });
  89  |   } else {
> 90  |     await expect(locator).toBeVisible({ timeout: pageLoadTimeout });
      |                           ^ Error: expect(locator).toBeVisible() failed
  91  |   }
  92  | 
  93  |   const currentPath = new URL(page.url()).pathname;
  94  |   expect(currentPath.includes(route), `${description} route did not resolve to ${route}`).toBeTruthy();
  95  | };
  96  | 
  97  | test.describe.serial('System Administrator smoke tests', () => {
  98  |   test.setTimeout(120000);
  99  | 
  100 |   test('Login successfully as administrator', async ({ page }) => {
  101 |     const monitor = attachPageMonitoring(page);
  102 |     await loginAsSystemAdmin(page);
  103 | 
  104 |     const adminHeading = page
  105 |       .locator('h1, h2')
  106 |       .filter({ hasText: /Quản lý người dùng|Quản lý feedback|Quản lý phản ánh|Danh mục phản ánh|Cấu hình thời hạn SLA|Chính sách SLA|Nhật ký hệ thống|Hiệu năng/i })
  107 |       .first();
  108 |     const shellOrLogout = page.locator('button.admin-sidebar-logout, .dashboard-shell, .admin-page-hero').first();
  109 | 
  110 |     const headingVisible = await adminHeading.isVisible().catch(() => false);
  111 |     const shellVisible = await shellOrLogout.isVisible().catch(() => false);
  112 |     expect(
  113 |       headingVisible || shellVisible,
  114 |       'Administrator login did not reach an expected admin landing surface'
  115 |     ).toBeTruthy();
  116 |     await assertNoErrors(monitor, 'Administrator login');
  117 |   });
  118 | 
  119 |   test('User Management loads', async ({ page }) => {
  120 |     const monitor = attachPageMonitoring(page);
  121 |     await loginAsSystemAdmin(page);
  122 | 
  123 |     await verifyRouteAndPage(page, usersRoute, page.getByRole('heading', { name: /Quản lý người dùng/i }), 'User Management');
  124 |     await assertNoErrors(monitor, 'User Management');
  125 |   });
  126 | 
  127 |   test('Feedback Management loads', async ({ page }) => {
  128 |     const monitor = attachPageMonitoring(page);
  129 |     await loginAsSystemAdmin(page);
  130 | 
  131 |     await verifyRouteAndPage(page, feedbacksRoute, page.getByRole('heading', { name: /Quản lý feedback|Quản lý phản ánh/i }), 'Feedback Management');
  132 |     await assertNoErrors(monitor, 'Feedback Management');
  133 |   });
  134 | 
  135 |   test('Category Management loads', async ({ page }) => {
  136 |     const monitor = attachPageMonitoring(page);
  137 |     await loginAsSystemAdmin(page);
  138 | 
  139 |     await verifyRouteAndPage(page, categoriesRoute, page.getByRole('heading', { name: /Danh mục phản ánh/i }), 'Category Management');
  140 |     await assertNoErrors(
  141 |       monitor,
  142 |       'Category Management',
  143 |       [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
  144 |       [/404 .*\/api\/management\/categories/]
  145 |     );
  146 |   });
  147 | 
  148 |   test('SLA Configuration loads', async ({ page }) => {
  149 |     const monitor = attachPageMonitoring(page);
  150 |     await loginAsSystemAdmin(page);
  151 | 
  152 |     await verifyRouteAndPage(page, slaRoute, page.getByRole('heading', { name: /Cấu hình thời hạn SLA|Chính sách SLA/i }), 'SLA Configuration');
  153 |     await assertNoErrors(
  154 |       monitor,
  155 |       'SLA Configuration',
  156 |       [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
  157 |       [/404 .*\/api\/management\/sla/, /404 .*\/api\/management\/sla-config/]
  158 |     );
  159 |   });
  160 | 
  161 |   test('Audit Log loads', async ({ page }) => {
  162 |     const monitor = attachPageMonitoring(page);
  163 |     await loginAsSystemAdmin(page);
  164 | 
  165 |     await verifyRouteAndPage(
  166 |       page,
  167 |       auditRoute,
  168 |       page.getByRole('heading', { name: /Nhật ký hệ thống|Audit Log|System Audit Log/i }),
  169 |       'Audit Log'
  170 |     );
  171 |     await assertNoErrors(monitor, 'Audit Log');
  172 |   });
  173 | 
  174 |   test('Performance Dashboard loads', async ({ page }) => {
  175 |     const monitor = attachPageMonitoring(page);
  176 |     await loginAsSystemAdmin(page);
  177 | 
  178 |     await verifyRouteAndPage(page, performanceRoute, page.getByRole('heading', { name: /Hiệu năng & trạng thái hệ thống/i }), 'Performance Dashboard');
  179 |     await assertNoErrors(
  180 |       monitor,
  181 |       'Performance Dashboard',
  182 |       [/Failed to load resource: the server responded with a status of 403 \(Forbidden\)/],
  183 |       [/403 .*\/api\/user\/feedbacks/]
  184 |     );
  185 |   });
  186 | });
  187 | 
```