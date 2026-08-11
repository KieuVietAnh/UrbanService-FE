# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\system-admin\system-admin.spec.ts >> System Administrator smoke tests >> SLA Configuration loads
- Location: tests\smoke\system-admin\system-admin.spec.ts:135:3

# Error details

```
Error: SLA Configuration: unexpected console errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Notification API getNotifications failed Error: Network Error",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e8]:
        - img [ref=e10]
        - generic [ref=e13]:
          - heading "UrbanMind" [level=1] [ref=e14]
          - paragraph [ref=e15]: Smart City
      - generic [ref=e17]:
        - generic [ref=e20]: KA
        - generic [ref=e21]:
          - heading "Kieu Viet Anh" [level=4] [ref=e22]
          - generic [ref=e24]: Quản Trị Viên
      - navigation [ref=e25]:
        - link "Tổng Quan Hệ Thống" [ref=e26]:
          - /url: /dashboard
          - img [ref=e29]
          - generic [ref=e34]: Tổng Quan Hệ Thống
        - link "Quản Lý Người Dùng" [ref=e35]:
          - /url: /management/users
          - img [ref=e38]
          - generic [ref=e42]: Quản Lý Người Dùng
        - link "Quản Lý Feedback" [ref=e43]:
          - /url: /management/feedbacks
          - img [ref=e46]
          - generic [ref=e48]: Quản Lý Feedback
        - link "Danh Mục Phản Ánh" [ref=e49]:
          - /url: /management/categories
          - img [ref=e52]
          - generic [ref=e54]: Danh Mục Phản Ánh
        - link "Cấu Hình SLA" [ref=e55]:
          - /url: /management/sla
          - img [ref=e58]
          - generic [ref=e61]: Cấu Hình SLA
        - link "Cấu Hình Tích Hợp" [ref=e62]:
          - /url: /management/integrations
          - img [ref=e65]
          - generic [ref=e68]: Cấu Hình Tích Hợp
        - link "Nhật Ký Hệ Thống" [ref=e69]:
          - /url: /admin/audit
          - img [ref=e72]
          - generic [ref=e77]: Nhật Ký Hệ Thống
        - link "Hiệu Năng & Logs" [ref=e78]:
          - /url: /admin/performance
          - img [ref=e81]
          - generic [ref=e83]: Hiệu Năng & Logs
        - link "Cài Đặt" [ref=e84]:
          - /url: /settings
          - img [ref=e87]
          - generic [ref=e90]: Cài Đặt
      - button "Đăng xuất" [ref=e92] [cursor=pointer]:
        - img [ref=e93]
        - text: Đăng xuất
  - generic [ref=e96]:
    - banner [ref=e97]:
      - navigation "Breadcrumb" [ref=e99]:
        - generic [ref=e100]:
          - link "Tổng quan hệ thống" [ref=e101]:
            - /url: /dashboard
          - generic [ref=e102]:
            - img [ref=e103]
            - generic [ref=e105]: Cấu hình SLA
      - generic [ref=e106]:
        - button "Toggle theme" [ref=e107]:
          - img [ref=e108]
        - button "Thông báo" [ref=e111]:
          - img [ref=e112]
    - main [ref=e115]:
      - generic [ref=e118]:
        - generic [ref=e120]:
          - generic [ref=e121]:
            - img [ref=e123]
            - generic [ref=e126]:
              - heading "Cấu hình thời hạn SLA" [level=2] [ref=e127]
              - paragraph [ref=e128]: Quy định thời gian xử lý cam kết cho từng mức ưu tiên để hệ thống tự động tính hạn hoàn thành phản ánh.
          - button "Lưu thay đổi" [ref=e129] [cursor=pointer]:
            - img [ref=e130]
            - text: Lưu thay đổi
        - generic [ref=e134]:
          - generic [ref=e136]:
            - generic [ref=e137]:
              - paragraph [ref=e138]: Mức đã cấu hình
              - paragraph [ref=e139]: 0/4
              - paragraph [ref=e140]: Đang có thời hạn xử lý.
            - img [ref=e142]
          - generic [ref=e146]:
            - generic [ref=e147]:
              - paragraph [ref=e148]: Nhanh nhất
              - paragraph [ref=e149]: "--"
              - paragraph [ref=e150]: Chưa có dữ liệu.
            - img [ref=e152]
          - generic [ref=e155]:
            - generic [ref=e156]:
              - paragraph [ref=e157]: Tổng khung giờ
              - paragraph [ref=e158]: "--"
              - paragraph [ref=e159]: Tổng thời hạn của 4 mức SLA.
            - img [ref=e161]
        - generic [ref=e164]:
          - generic [ref=e165]:
            - heading "Thiết lập theo mức ưu tiên" [level=3] [ref=e166]
            - paragraph [ref=e167]: Nhập số giờ xử lý tối đa cho từng mức độ. Các thay đổi sẽ được áp dụng cho phản ánh mới sau khi lưu.
          - generic [ref=e168]:
            - generic [ref=e169]:
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - img [ref=e173]
                  - generic [ref=e175]:
                    - generic [ref=e176]: Khẩn cấp
                    - generic [ref=e177]: Sự cố cần ưu tiên xử lý ngay.
                - generic [ref=e178]:
                  - spinbutton [ref=e179]
                  - generic [ref=e180]: Giờ
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - img [ref=e184]
                  - generic [ref=e186]:
                    - generic [ref=e187]: Cao
                    - generic [ref=e188]: Vấn đề ảnh hưởng rõ tới khu vực.
                - generic [ref=e189]:
                  - spinbutton [ref=e190]
                  - generic [ref=e191]: Giờ
              - generic [ref=e192]:
                - generic [ref=e193]:
                  - img [ref=e195]
                  - generic [ref=e197]:
                    - generic [ref=e198]: Trung bình
                    - generic [ref=e199]: Phản ánh xử lý theo quy trình chuẩn.
                - generic [ref=e200]:
                  - spinbutton [ref=e201]
                  - generic [ref=e202]: Giờ
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - img [ref=e206]
                  - generic [ref=e209]:
                    - generic [ref=e210]: Thấp
                    - generic [ref=e211]: Vấn đề ít khẩn cấp, xử lý theo lịch.
                - generic [ref=e212]:
                  - spinbutton [ref=e213]
                  - generic [ref=e214]: Giờ
            - generic [ref=e216]:
              - img [ref=e217]
              - generic [ref=e219]: Khi người dân gửi phản ánh mới, hạn xử lý sẽ được tính tự động dựa trên cấu hình giờ ở trên.
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
> 57  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
      |                                                                    ^ Error: SLA Configuration: unexpected console errors
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
  148 |   test('Audit Log loads', async ({ page }) => {
  149 |     const monitor = attachPageMonitoring(page);
  150 |     await loginAsSystemAdmin(page);
  151 | 
  152 |     await verifyRouteAndPage(page, auditRoute, page.getByRole('heading', { name: /Nhật ký hệ thống/i }), 'Audit Log');
  153 |     await assertNoErrors(monitor, 'Audit Log');
  154 |   });
  155 | 
  156 |   test('Performance Dashboard loads', async ({ page }) => {
  157 |     const monitor = attachPageMonitoring(page);
```