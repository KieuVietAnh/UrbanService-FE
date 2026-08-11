# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Verify profile page loads
- Location: tests\smoke\service-user\service-user.spec.ts:163:3

# Error details

```
Error: Profile page: unexpected console errors

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
- generic [ref=e5]:
  - banner [ref=e6]:
    - navigation "Điều hướng người dân" [ref=e7]:
      - link "UrbanMind - Trang chủ" [ref=e8]:
        - /url: /
        - img [ref=e10]
        - generic [ref=e15]:
          - strong [ref=e16]: UrbanMind
          - generic [ref=e17]: Cổng phản ánh đô thị
      - list [ref=e18]:
        - listitem [ref=e19]:
          - link "Trang chủ" [ref=e20]:
            - /url: /
        - listitem [ref=e21]:
          - link "Phản ánh của tôi" [ref=e22]:
            - /url: /tickets
        - listitem [ref=e23]:
          - link "Bảng tin" [ref=e24]:
            - /url: /community/feed
        - listitem [ref=e25]:
          - link "Bản đồ sự cố" [ref=e26]:
            - /url: /community/map
      - generic [ref=e27]:
        - link "Gửi phản ánh" [ref=e28]:
          - /url: /tickets/create
          - img [ref=e29]
          - text: Gửi phản ánh
        - button "Toggle theme" [ref=e30]:
          - img [ref=e31]
        - button "Thông báo, 24 chưa đọc" [ref=e34]:
          - img [ref=e35]
          - generic [ref=e38]: "24"
        - button "Mở menu tài khoản" [ref=e40]:
          - generic [ref=e42]: HG
  - main [ref=e43]:
    - generic [ref=e44]:
      - generic [ref=e46]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]:
              - img [ref=e54]
              - text: Hồ sơ tài khoản
            - generic [ref=e66]:
              - heading "Nguyen Huu Giau" [level=1] [ref=e67]
              - paragraph [ref=e68]: Xem lại hồ sơ, mức độ tin cậy và tiến trình đóng góp của bạn trong hệ thống UrbanMind.
          - generic [ref=e69]:
            - paragraph [ref=e70]: Mức độ tin cậy
            - paragraph [ref=e71]: "75"
            - paragraph [ref=e72]: Đáng tin cậy
        - generic [ref=e73]:
          - complementary [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e79]: NG
                - heading "Nguyen Huu Giau" [level=2] [ref=e80]
                - paragraph [ref=e81]: Người dân
                - paragraph [ref=e82]: nguyengiauzxc@gmail.com
                - generic [ref=e83]:
                  - img [ref=e84]
                  - text: Chưa có dữ liệu
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]: Mã người dùng
                  - generic [ref=e90]: 912479da-5f6b-4913-9865-c13cc7c63426
                - generic [ref=e91]:
                  - generic [ref=e92]: Ngày tạo
                  - generic [ref=e93]: Chưa có dữ liệu
                - generic [ref=e94]:
                  - generic [ref=e95]: Xác minh
                  - generic [ref=e96]: Đã xác minh
            - generic [ref=e97]:
              - generic [ref=e98]:
                - img [ref=e99]
                - text: Tóm tắt hoạt động
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - paragraph [ref=e103]: Đang mở
                  - paragraph [ref=e104]: "4"
                - generic [ref=e105]:
                  - paragraph [ref=e106]: Đã giải quyết
                  - paragraph [ref=e107]: "0"
                - generic [ref=e108]:
                  - paragraph [ref=e109]: Tháng này
                  - paragraph [ref=e110]: "0"
                - generic [ref=e111]:
                  - paragraph [ref=e112]: Tỷ lệ hoàn thành
                  - paragraph [ref=e113]: 0%
            - generic [ref=e114]:
              - generic [ref=e116]:
                - paragraph [ref=e117]: Thành tích
                - paragraph [ref=e118]: Những dấu hiệu thể hiện bạn là công dân tích cực.
              - generic [ref=e119]:
                - generic [ref=e121]:
                  - img [ref=e123]
                  - generic [ref=e125]:
                    - paragraph [ref=e126]: Đóng góp cộng đồng
                    - paragraph [ref=e127]: 4 phản ánh đã gửi
                - generic [ref=e129]:
                  - img [ref=e131]
                  - generic [ref=e134]:
                    - paragraph [ref=e135]: Tài khoản xác minh
                    - paragraph [ref=e136]: Email đã được xác thực
                - generic [ref=e138]:
                  - img [ref=e140]
                  - generic [ref=e143]:
                    - paragraph [ref=e144]: Tỷ lệ hoàn thành
                    - paragraph [ref=e145]: 0% phản ánh đã xử lý
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - paragraph [ref=e150]: Hoạt động gần đây
                  - heading "Bản đồ đóng góp của bạn" [level=2] [ref=e151]
                - link "Xem phiếu của tôi" [ref=e152]:
                  - /url: /tickets
                  - img [ref=e153]
                  - text: Xem phiếu của tôi
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - generic [ref=e157]:
                    - generic [ref=e158]:
                      - paragraph [ref=e160]: "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #38"
                      - paragraph [ref=e161]: Khu vực Chợ Linh Xuân, Phường Linh Xuân
                    - generic [ref=e162]: InProgress
                  - generic [ref=e163]:
                    - generic [ref=e164]: 25/07/2026
                    - generic [ref=e165]: "#936ccda9-2121-de83-4937-af54109cab3f"
                - generic [ref=e166]:
                  - generic [ref=e167]:
                    - generic [ref=e168]:
                      - paragraph [ref=e170]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #12"
                      - paragraph [ref=e171]: Đường Nguyễn Xiển, Phường Long Phước
                    - generic [ref=e172]: Assigned
                  - generic [ref=e173]:
                    - generic [ref=e174]: 22/07/2026
                    - generic [ref=e175]: "#a8c19b0e-95bc-bbef-1096-1ca4613dcd16"
                - generic [ref=e176]:
                  - generic [ref=e177]:
                    - generic [ref=e178]:
                      - paragraph [ref=e180]: "[SEED-SLA] Điểm tập kết rác gây mùi hôi #25"
                      - paragraph [ref=e181]: Đường Nguyễn Duy Trinh, Phường Long Trường
                    - generic [ref=e182]: InProgress
                  - generic [ref=e183]:
                    - generic [ref=e184]: 10/07/2026
                    - generic [ref=e185]: "#a2a302ce-cebd-8f58-1ec5-aea7e67ed0ea"
            - generic [ref=e186]:
              - generic [ref=e187]:
                - img [ref=e188]
                - text: Cài đặt hồ sơ
              - generic [ref=e191]:
                - generic [ref=e192]:
                  - generic [ref=e193]:
                    - generic [ref=e195]: Email đăng nhập
                    - textbox [disabled] [ref=e196]: nguyengiauzxc@gmail.com
                  - generic [ref=e197]:
                    - generic [ref=e199]: Họ và tên
                    - textbox "Nhập họ và tên" [ref=e200]: Nguyen Huu Giau
                  - generic [ref=e201]:
                    - generic [ref=e203]: Số điện thoại
                    - textbox "Nhập số điện thoại" [ref=e204]
                  - generic [ref=e205]:
                    - generic [ref=e207]: Địa chỉ liên hệ
                    - textbox "Nhập địa chỉ liên hệ" [ref=e208]
                - generic [ref=e209]:
                  - paragraph [ref=e210]: Thay đổi hiện chỉ lưu trên giao diện. Khi API hồ sơ sẵn sàng, dữ liệu sẽ được đồng bộ.
                  - button "Lưu thay đổi" [ref=e211] [cursor=pointer]:
                    - img [ref=e212]
                    - text: Lưu thay đổi
      - generic [ref=e217]:
        - generic [ref=e218]:
          - img [ref=e220]
          - generic [ref=e224]:
            - paragraph [ref=e225]: UrbanMind
            - paragraph [ref=e226]: © 2026 Cổng phản ánh đô thị
        - navigation "Thông tin pháp lý và hỗ trợ" [ref=e227]:
          - link "Chính sách riêng tư" [ref=e228]:
            - /url: "#privacy"
          - link "Điều khoản sử dụng" [ref=e229]:
            - /url: "#terms"
          - link "Hỗ trợ" [ref=e230]:
            - /url: mailto:support@urbanmind.vn
            - img [ref=e231]
            - text: Hỗ trợ
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { LoginPage } from '../../pages/LoginPage';
  3   | import { DashboardPage } from '../../pages/DashboardPage';
  4   | import { TicketListPage } from '../../pages/TicketListPage';
  5   | import { TicketDetailPage } from '../../pages/TicketDetailPage';
  6   | 
  7   | const serviceUserEmail = 'nguyengiauzxc@gmail.com';
  8   | const serviceUserPassword = 'nguyenhuugiau';
  9   | 
  10  | const dashboardRoute = '/';
  11  | const ticketListRoute = '/tickets';
  12  | const communityFeedRoute = '/community/feed';
  13  | const notificationCenterRoute = '/notifications';
  14  | const profileRoute = '/profile';
  15  | 
  16  | type PageMonitor = {
  17  |   pageErrors: string[];
  18  |   consoleErrors: string[];
  19  |   badResponses: string[];
  20  | };
  21  | 
  22  | const attachPageMonitoring = (page: Page): PageMonitor => {
  23  |   const monitor: PageMonitor = {
  24  |     pageErrors: [],
  25  |     consoleErrors: [],
  26  |     badResponses: [],
  27  |   };
  28  | 
  29  |   page.on('pageerror', (error) => {
  30  |     monitor.pageErrors.push(error?.message || String(error));
  31  |   });
  32  | 
  33  |   page.on('console', (message) => {
  34  |     if (message.type() === 'error') {
  35  |       monitor.consoleErrors.push(message.text());
  36  |     }
  37  |   });
  38  | 
  39  |   page.on('response', (response) => {
  40  |     const request = response.request();
  41  |     const url = response.url();
  42  |     const status = response.status();
  43  | 
  44  |     if (status >= 400 && /\/api\//i.test(url)) {
  45  |       monitor.badResponses.push(`${status} ${request.method()} ${url}`);
  46  |     }
  47  |   });
  48  | 
  49  |   return monitor;
  50  | };
  51  | 
  52  | const assertNoErrors = async (monitor: PageMonitor, context: string) => {
  53  |   // Ignore known benign parser errors that sometimes occur when endpoints return HTML pages.
  54  |   const relevantPageErrors = monitor.pageErrors.filter((e) => !/Unexpected token '<'/.test(String(e)));
  55  |   if (monitor.pageErrors.length !== relevantPageErrors.length) {
  56  |     console.warn(`${context}: filtered ${monitor.pageErrors.length - relevantPageErrors.length} benign page errors`);
  57  |   }
  58  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
> 59  |   expect(monitor.consoleErrors, `${context}: unexpected console errors`).toEqual([]);
      |                                                                          ^ Error: Profile page: unexpected console errors
  60  |   expect(monitor.badResponses, `${context}: unexpected API failures`).toEqual([]);
  61  | };
  62  | 
  63  | const loginAsServiceUser = async (page: Page) => {
  64  |   await page.goto('/login');
  65  |   const loginPage = new LoginPage(page);
  66  |   await loginPage.login(serviceUserEmail, serviceUserPassword);
  67  |   await page.waitForLoadState('networkidle');
  68  |   // Wait until the app redirects away from the login route and the client finishes loading.
  69  |   await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  70  |   // Wait for either the service-user landing hero or a dashboard shell to appear.
  71  |   await page.waitForSelector('#landing-hero-title, .citizen-dashboard-page, header', { timeout: 30000 });
  72  |   expect(new URL(page.url()).pathname).not.toContain('/login');
  73  | };
  74  | 
  75  | const verifyRouteAndPage = async (page: Page, route: string, locator: string | ReturnType<Page['locator']>, description: string) => {
  76  |   await page.goto(route);
  77  |   await page.waitForLoadState('networkidle');
  78  | 
  79  |   if (typeof locator === 'string') {
  80  |     await expect(page.locator(locator)).toBeVisible({ timeout: 15000 });
  81  |   } else {
  82  |     await expect(locator).toBeVisible({ timeout: 15000 });
  83  |   }
  84  | 
  85  |   await expect(page).toHaveURL(new RegExp(`^${route}`));
  86  |   expect(page.url().includes(route), `${description} route did not resolve to ${route}`).toBeTruthy();
  87  | };
  88  | 
  89  | test.describe('Service User smoke tests', () => {
  90  |   test.setTimeout(120000);
  91  | 
  92  |   test('Login successfully and open dashboard', async ({ page }) => {
  93  |     const monitor = attachPageMonitoring(page);
  94  | 
  95  |     await loginAsServiceUser(page);
  96  | 
  97  |     // Service users land on the public landing page ("/"), not the internal staff dashboard.
  98  |     // Check for the landing hero as the primary signal the app loaded for service-user.
  99  |     await expect(page.locator('#landing-hero-title')).toBeVisible({ timeout: 15000 });
  100 |     // It's still fine if UI shows a small "Phản ánh của tôi" link; assert it's present if available.
  101 |     try {
  102 |       await expect(page.getByRole('link', { name: /Phản ánh của tôi|My feedbacks|Feedbacks/i }).first()).toBeVisible({ timeout: 5000 });
  103 |     } catch {
  104 |       // ignore if not present for this account
  105 |     }
  106 | 
  107 |     await assertNoErrors(monitor, 'Dashboard');
  108 |   });
  109 | 
  110 |   test('Open ticket list and open one ticket detail', async ({ page }) => {
  111 |     const monitor = attachPageMonitoring(page);
  112 | 
  113 |     await loginAsServiceUser(page);
  114 |     await page.goto(ticketListRoute);
  115 |     await page.waitForLoadState('networkidle');
  116 | 
  117 |     const ticketListPage = new TicketListPage(page);
  118 |     // Ensure the ticket list page loaded.
  119 |     await expect(page.getByRole('heading', { name: /Phản ánh của tôi|Ticket List|Danh sách phản ánh/i }).first()).toBeVisible({ timeout: 15000 });
  120 | 
  121 |     // If there are ticket rows, open the first one. Otherwise skip opening.
  122 |     const rowCount = await ticketListPage.ticketRows.count();
  123 |     if (rowCount > 0) {
  124 |       await expect(ticketListPage.ticketRows.first()).toBeVisible({ timeout: 20000 });
  125 |       await ticketListPage.openFirstTicket();
  126 |       await page.waitForURL(/\/tickets\/[A-Za-z0-9_-]+/, { timeout: 30000 });
  127 | 
  128 |       const ticketDetailPage = new TicketDetailPage(page);
  129 |       await expect(ticketDetailPage.titleHeading).toBeVisible({ timeout: 15000 });
  130 |     } else {
  131 |       // No tickets for this service user account — that's acceptable for smoke tests.
  132 |       console.warn('Service user has no tickets; skipping ticket open step.');
  133 |     }
  134 | 
  135 |     await assertNoErrors(monitor, 'Ticket detail');
  136 |   });
  137 | 
  138 |   test('Verify community feed loads', async ({ page }) => {
  139 |     const monitor = attachPageMonitoring(page);
  140 | 
  141 |     await loginAsServiceUser(page);
  142 |     await page.goto(communityFeedRoute);
  143 |     await page.waitForLoadState('networkidle');
  144 | 
  145 |     await expect(page.locator('main.community-feed-page')).toBeVisible({ timeout: 15000 });
  146 |     await expect(page.getByRole('heading', { name: /Bảng tin cộng đồng|Community Feed|Bảng tin/i }).first()).toBeVisible({ timeout: 15000 });
  147 |     await assertNoErrors(monitor, 'Community feed');
  148 |   });
  149 | 
  150 |   test('Verify notification center loads', async ({ page }) => {
  151 |     const monitor = attachPageMonitoring(page);
  152 | 
  153 |     await loginAsServiceUser(page);
  154 |     await page.goto(notificationCenterRoute);
  155 |     await page.waitForLoadState('networkidle');
  156 | 
  157 |     await expect(page.getByRole('heading', { name: /Thông báo của tôi/i })).toBeVisible({ timeout: 15000 });
  158 |     // locator(...) may match multiple elements; assert the first matching shell/page is visible.
  159 |     await expect(page.locator('.notification-center-shell, .notification-center-page').first()).toBeVisible({ timeout: 15000 });
```