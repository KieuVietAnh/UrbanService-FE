# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\system-admin\system-admin.spec.ts >> System Administrator smoke tests >> Login successfully as administrator
- Location: tests\smoke\system-admin\system-admin.spec.ts:98:3

# Error details

```
Error: Administrator login: unexpected uncaught page errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "expected expression, got '<'",
+   "expected expression, got '<'",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e8]:
        - img [ref=e10]
        - generic [ref=e25]:
          - heading "UrbanMind" [level=1] [ref=e26]
          - paragraph [ref=e27]: Smart City
      - generic [ref=e29]:
        - generic [ref=e32]: KA
        - generic [ref=e33]:
          - heading "Kieu Viet Anh" [level=4] [ref=e34]
          - generic [ref=e36]: Quản Trị Viên
      - navigation [ref=e37]:
        - link "Tổng Quan Hệ Thống" [ref=e38] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e41]
          - generic [ref=e46]: Tổng Quan Hệ Thống
        - link "Quản Lý Người Dùng" [ref=e47] [cursor=pointer]:
          - /url: /management/users
          - img [ref=e50]
          - generic [ref=e54]: Quản Lý Người Dùng
        - link "Quản Lý Feedback" [ref=e55] [cursor=pointer]:
          - /url: /management/feedbacks
          - img [ref=e58]
          - generic [ref=e60]: Quản Lý Feedback
        - link "Danh Mục Phản Ánh" [ref=e61] [cursor=pointer]:
          - /url: /management/categories
          - img [ref=e64]
          - generic [ref=e69]: Danh Mục Phản Ánh
        - link "Cấu Hình SLA" [ref=e70] [cursor=pointer]:
          - /url: /management/sla
          - img [ref=e73]
          - generic [ref=e76]: Cấu Hình SLA
        - link "Cấu Hình Tích Hợp" [ref=e77] [cursor=pointer]:
          - /url: /management/integrations
          - img [ref=e80]
          - generic [ref=e84]: Cấu Hình Tích Hợp
        - link "Nhật Ký Hệ Thống" [ref=e85] [cursor=pointer]:
          - /url: /admin/audit
          - img [ref=e88]
          - generic [ref=e93]: Nhật Ký Hệ Thống
        - link "Hiệu Năng & Logs" [ref=e94] [cursor=pointer]:
          - /url: /admin/performance
          - img [ref=e97]
          - generic [ref=e99]: Hiệu Năng & Logs
        - link "Cài Đặt" [ref=e100] [cursor=pointer]:
          - /url: /settings
          - img [ref=e103]
          - generic [ref=e106]: Cài Đặt
      - button "Đăng xuất" [ref=e108] [cursor=pointer]:
        - img [ref=e109]
        - text: Đăng xuất
  - generic [ref=e113]:
    - banner [ref=e114]:
      - navigation "Breadcrumb" [ref=e116]:
        - generic [ref=e117]:
          - link "Tổng quan hệ thống" [ref=e118] [cursor=pointer]:
            - /url: /dashboard
          - generic [ref=e119]:
            - img [ref=e120]
            - generic [ref=e122]: Nhật ký hệ thống
      - generic [ref=e123]:
        - button "Toggle theme" [ref=e124]:
          - img [ref=e125]
        - button "Thông báo" [ref=e128]:
          - img [ref=e129]
    - main [ref=e132]:
      - generic [ref=e135]:
        - generic [ref=e137]:
          - generic [ref=e138]:
            - img [ref=e140]
            - generic [ref=e145]:
              - heading "Nhật ký hệ thống" [level=2] [ref=e146]
              - paragraph [ref=e147]: Theo dõi lịch sử thao tác dữ liệu, cấu hình hệ thống và hoạt động quản trị để đảm bảo minh bạch vận hành.
          - generic [ref=e148]:
            - generic [ref=e149]: Đang theo dõi
            - generic [ref=e151]: Hoạt động quản trị
        - generic [ref=e152]:
          - generic [ref=e154]:
            - generic [ref=e155]:
              - paragraph [ref=e156]: Tổng nhật ký
              - paragraph [ref=e157]: "0"
              - paragraph [ref=e158]: Sự kiện đã ghi nhận.
            - img [ref=e160]
          - generic [ref=e166]:
            - generic [ref=e167]:
              - paragraph [ref=e168]: Tác nhân
              - paragraph [ref=e169]: "0"
              - paragraph [ref=e170]: Tài khoản có thao tác.
            - img [ref=e172]
          - generic [ref=e177]:
            - generic [ref=e178]:
              - paragraph [ref=e179]: Đối tượng
              - paragraph [ref=e180]: "0"
              - paragraph [ref=e181]: Module bị tác động.
            - img [ref=e183]
          - generic [ref=e188]:
            - generic [ref=e189]:
              - paragraph [ref=e190]: Log mới nhất
              - paragraph [ref=e191]: Chưa có dữ liệu
              - paragraph [ref=e192]: Thời điểm gần nhất.
            - img [ref=e194]
        - generic [ref=e197]:
          - generic [ref=e198]:
            - generic [ref=e199]:
              - heading "Dòng sự kiện gần đây" [level=3] [ref=e200]
              - paragraph [ref=e201]: Kiểm tra thao tác quản trị, nguồn truy cập và đối tượng bị tác động.
            - generic [ref=e202]:
              - generic [ref=e203]:
                - img [ref=e204]
                - searchbox [ref=e207]
              - combobox [ref=e208]:
                - option "Tất cả hành động" [selected]
                - option "Tạo mới"
                - option "Cập nhật"
                - option "Rủi ro cao"
                - option "Truy cập"
                - option "Theo dõi"
          - generic [ref=e209]:
            - img [ref=e211]
            - heading "Không có nhật ký phù hợp" [level=3] [ref=e216]
            - paragraph [ref=e217]: Thử thay đổi từ khóa hoặc bộ lọc để xem thêm lịch sử hoạt động hệ thống.
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
> 47  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
      |                                                                             ^ Error: Administrator login: unexpected uncaught page errors
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
  71  |   await page.waitForLoadState('networkidle');
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
  82  |   await page.goto(route);
  83  |   await page.waitForLoadState('networkidle');
  84  | 
  85  |   if (typeof locator === 'string') {
  86  |     await expect(page.locator(locator)).toBeVisible({ timeout: 15000 });
  87  |   } else {
  88  |     await expect(locator).toBeVisible({ timeout: 15000 });
  89  |   }
  90  | 
  91  |   const currentPath = new URL(page.url()).pathname;
  92  |   expect(currentPath.includes(route), `${description} route did not resolve to ${route}`).toBeTruthy();
  93  | };
  94  | 
  95  | test.describe.serial('System Administrator smoke tests', () => {
  96  |   test.setTimeout(120000);
  97  | 
  98  |   test('Login successfully as administrator', async ({ page }) => {
  99  |     const monitor = attachPageMonitoring(page);
  100 |     await loginAsSystemAdmin(page);
  101 | 
  102 |     await expect(page.getByRole('heading', { name: /Quản lý người dùng|Quản lý feedback|Danh mục phản ánh|Cấu hình thời hạn SLA|Nhật ký hệ thống|Hiệu năng & trạng thái hệ thống/i }).first()).toBeVisible({ timeout: 15000 });
  103 |     await assertNoErrors(monitor, 'Administrator login');
  104 |   });
  105 | 
  106 |   test('User Management loads', async ({ page }) => {
  107 |     const monitor = attachPageMonitoring(page);
  108 |     await loginAsSystemAdmin(page);
  109 | 
  110 |     await verifyRouteAndPage(page, usersRoute, page.getByRole('heading', { name: /Quản lý người dùng/i }), 'User Management');
  111 |     await assertNoErrors(monitor, 'User Management');
  112 |   });
  113 | 
  114 |   test('Feedback Management loads', async ({ page }) => {
  115 |     const monitor = attachPageMonitoring(page);
  116 |     await loginAsSystemAdmin(page);
  117 | 
  118 |     await verifyRouteAndPage(page, feedbacksRoute, page.getByRole('heading', { name: /Quản lý feedback/i }), 'Feedback Management');
  119 |     await assertNoErrors(monitor, 'Feedback Management');
  120 |   });
  121 | 
  122 |   test('Category Management loads', async ({ page }) => {
  123 |     const monitor = attachPageMonitoring(page);
  124 |     await loginAsSystemAdmin(page);
  125 | 
  126 |     await verifyRouteAndPage(page, categoriesRoute, page.getByRole('heading', { name: /Danh mục phản ánh/i }), 'Category Management');
  127 |     await assertNoErrors(
  128 |       monitor,
  129 |       'Category Management',
  130 |       [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
  131 |       [/404 .*\/api\/management\/categories/]
  132 |     );
  133 |   });
  134 | 
  135 |   test('SLA Configuration loads', async ({ page }) => {
  136 |     const monitor = attachPageMonitoring(page);
  137 |     await loginAsSystemAdmin(page);
  138 | 
  139 |     await verifyRouteAndPage(page, slaRoute, page.getByRole('heading', { name: /Cấu hình thời hạn SLA/i }), 'SLA Configuration');
  140 |     await assertNoErrors(
  141 |       monitor,
  142 |       'SLA Configuration',
  143 |       [/Failed to load resource: the server responded with a status of 404 \(Not Found\)/],
  144 |       [/404 .*\/api\/management\/sla/, /404 .*\/api\/management\/sla-config/]
  145 |     );
  146 |   });
  147 | 
```