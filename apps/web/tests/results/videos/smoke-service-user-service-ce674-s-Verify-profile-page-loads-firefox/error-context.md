# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Verify profile page loads
- Location: tests\smoke\service-user\service-user.spec.ts:163:3

# Error details

```
Error: Profile page: unexpected uncaught page errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "expected expression, got '<'",
+   "expected expression, got '<'",
+   "expected expression, got '<'",
+   "expected expression, got '<'",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - banner [ref=e6]:
    - navigation "Điều hướng người dân" [ref=e7]:
      - link "UrbanMind - Trang chủ" [ref=e8] [cursor=pointer]:
        - /url: /
        - img [ref=e10]
        - generic [ref=e15]:
          - strong [ref=e16]: UrbanMind
          - generic [ref=e17]: Cổng phản ánh đô thị
      - list [ref=e18]:
        - listitem [ref=e19]:
          - link "Trang chủ" [ref=e20] [cursor=pointer]:
            - /url: /
        - listitem [ref=e21]:
          - link "Phản ánh của tôi" [ref=e22] [cursor=pointer]:
            - /url: /tickets
        - listitem [ref=e23]:
          - link "Bảng tin" [ref=e24] [cursor=pointer]:
            - /url: /community/feed
        - listitem [ref=e25]:
          - link "Bản đồ sự cố" [ref=e26] [cursor=pointer]:
            - /url: /community/map
      - generic [ref=e27]:
        - link "Gửi phản ánh" [ref=e28] [cursor=pointer]:
          - /url: /tickets/create
          - img [ref=e29]
          - text: Gửi phản ánh
        - button "Toggle theme" [ref=e32]:
          - img [ref=e33]
        - button "Thông báo, 24 chưa đọc" [ref=e36]:
          - img [ref=e37]
          - generic [ref=e40]: "24"
        - button "Mở menu tài khoản" [ref=e42]:
          - generic [ref=e44]: HG
  - main [ref=e45]:
    - generic [ref=e46]:
      - generic [ref=e48]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - img [ref=e56]
              - text: Hồ sơ tài khoản
            - generic [ref=e68]:
              - heading "Nguyen Huu Giau" [level=1] [ref=e69]
              - paragraph [ref=e70]: Xem lại hồ sơ, mức độ tin cậy và tiến trình đóng góp của bạn trong hệ thống UrbanMind.
          - generic [ref=e71]:
            - paragraph [ref=e72]: Mức độ tin cậy
            - paragraph [ref=e73]: "75"
            - paragraph [ref=e74]: Đáng tin cậy
        - generic [ref=e75]:
          - complementary [ref=e76]:
            - generic [ref=e77]:
              - generic [ref=e78]:
                - generic [ref=e81]: NG
                - heading "Nguyen Huu Giau" [level=2] [ref=e82]
                - paragraph [ref=e83]: Người dân
                - paragraph [ref=e84]: nguyengiauzxc@gmail.com
                - generic [ref=e85]:
                  - img [ref=e86]
                  - text: Chưa có dữ liệu
              - generic [ref=e89]:
                - generic [ref=e90]:
                  - generic [ref=e91]: Mã người dùng
                  - generic [ref=e92]: 912479da-5f6b-4913-9865-c13cc7c63426
                - generic [ref=e93]:
                  - generic [ref=e94]: Ngày tạo
                  - generic [ref=e95]: Chưa có dữ liệu
                - generic [ref=e96]:
                  - generic [ref=e97]: Xác minh
                  - generic [ref=e98]: Đã xác minh
            - generic [ref=e99]:
              - generic [ref=e100]:
                - img [ref=e101]
                - text: Tóm tắt hoạt động
              - generic [ref=e103]:
                - generic [ref=e104]:
                  - paragraph [ref=e105]: Đang mở
                  - paragraph [ref=e106]: "4"
                - generic [ref=e107]:
                  - paragraph [ref=e108]: Đã giải quyết
                  - paragraph [ref=e109]: "0"
                - generic [ref=e110]:
                  - paragraph [ref=e111]: Tháng này
                  - paragraph [ref=e112]: "0"
                - generic [ref=e113]:
                  - paragraph [ref=e114]: Tỷ lệ hoàn thành
                  - paragraph [ref=e115]: 0%
            - generic [ref=e116]:
              - generic [ref=e118]:
                - paragraph [ref=e119]: Thành tích
                - paragraph [ref=e120]: Những dấu hiệu thể hiện bạn là công dân tích cực.
              - generic [ref=e121]:
                - generic [ref=e123]:
                  - img [ref=e125]
                  - generic [ref=e127]:
                    - paragraph [ref=e128]: Đóng góp cộng đồng
                    - paragraph [ref=e129]: 4 phản ánh đã gửi
                - generic [ref=e131]:
                  - img [ref=e133]
                  - generic [ref=e136]:
                    - paragraph [ref=e137]: Tài khoản xác minh
                    - paragraph [ref=e138]: Email đã được xác thực
                - generic [ref=e140]:
                  - img [ref=e142]
                  - generic [ref=e145]:
                    - paragraph [ref=e146]: Tỷ lệ hoàn thành
                    - paragraph [ref=e147]: 0% phản ánh đã xử lý
          - generic [ref=e148]:
            - generic [ref=e149]:
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - paragraph [ref=e152]: Hoạt động gần đây
                  - heading "Bản đồ đóng góp của bạn" [level=2] [ref=e153]
                - link "Xem phiếu của tôi" [ref=e154] [cursor=pointer]:
                  - /url: /tickets
                  - img [ref=e155]
                  - text: Xem phiếu của tôi
              - generic [ref=e158]:
                - generic [ref=e159]:
                  - generic [ref=e160]:
                    - generic [ref=e161]:
                      - paragraph [ref=e163]: "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #38"
                      - paragraph [ref=e164]: Khu vực Chợ Linh Xuân, Phường Linh Xuân
                    - generic [ref=e165]: InProgress
                  - generic [ref=e166]:
                    - generic [ref=e167]: 25/07/2026
                    - generic [ref=e168]: "#936ccda9-2121-de83-4937-af54109cab3f"
                - generic [ref=e169]:
                  - generic [ref=e170]:
                    - generic [ref=e171]:
                      - paragraph [ref=e173]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #12"
                      - paragraph [ref=e174]: Đường Nguyễn Xiển, Phường Long Phước
                    - generic [ref=e175]: Assigned
                  - generic [ref=e176]:
                    - generic [ref=e177]: 22/07/2026
                    - generic [ref=e178]: "#a8c19b0e-95bc-bbef-1096-1ca4613dcd16"
                - generic [ref=e179]:
                  - generic [ref=e180]:
                    - generic [ref=e181]:
                      - paragraph [ref=e183]: "[SEED-SLA] Điểm tập kết rác gây mùi hôi #25"
                      - paragraph [ref=e184]: Đường Nguyễn Duy Trinh, Phường Long Trường
                    - generic [ref=e185]: InProgress
                  - generic [ref=e186]:
                    - generic [ref=e187]: 10/07/2026
                    - generic [ref=e188]: "#a2a302ce-cebd-8f58-1ec5-aea7e67ed0ea"
            - generic [ref=e189]:
              - generic [ref=e190]:
                - img [ref=e191]
                - text: Cài đặt hồ sơ
              - generic [ref=e196]:
                - generic [ref=e197]:
                  - generic [ref=e198]:
                    - generic [ref=e200]: Email đăng nhập
                    - textbox [disabled] [ref=e201]: nguyengiauzxc@gmail.com
                  - generic [ref=e202]:
                    - generic [ref=e204]: Họ và tên
                    - textbox "Nhập họ và tên" [ref=e205]: Nguyen Huu Giau
                  - generic [ref=e206]:
                    - generic [ref=e208]: Số điện thoại
                    - textbox "Nhập số điện thoại" [ref=e209]
                  - generic [ref=e210]:
                    - generic [ref=e212]: Địa chỉ liên hệ
                    - textbox "Nhập địa chỉ liên hệ" [ref=e213]
                - generic [ref=e214]:
                  - paragraph [ref=e215]: Thay đổi hiện chỉ lưu trên giao diện. Khi API hồ sơ sẵn sàng, dữ liệu sẽ được đồng bộ.
                  - button "Lưu thay đổi" [ref=e216] [cursor=pointer]:
                    - img [ref=e217]
                    - text: Lưu thay đổi
      - generic [ref=e222]:
        - generic [ref=e223]:
          - img [ref=e225]
          - generic [ref=e229]:
            - paragraph [ref=e230]: UrbanMind
            - paragraph [ref=e231]: © 2026 Cổng phản ánh đô thị
        - navigation "Thông tin pháp lý và hỗ trợ" [ref=e232]:
          - link "Chính sách riêng tư" [ref=e233] [cursor=pointer]:
            - /url: "#privacy"
          - link "Điều khoản sử dụng" [ref=e234] [cursor=pointer]:
            - /url: "#terms"
          - link "Hỗ trợ" [ref=e235] [cursor=pointer]:
            - /url: mailto:support@urbanmind.vn
            - img [ref=e236]
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
> 58  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
      |                                                                             ^ Error: Profile page: unexpected uncaught page errors
  59  |   expect(monitor.consoleErrors, `${context}: unexpected console errors`).toEqual([]);
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
```