# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Open ticket list and open one ticket detail
- Location: tests\smoke\service-user\service-user.spec.ts:110:3

# Error details

```
Error: Ticket detail: unexpected uncaught page errors

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
      - main [ref=e49]:
        - region "Phản ánh của tôi" [ref=e50]:
          - generic:
            - img
          - generic [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]:
                - heading "Phản ánh của tôi" [level=1] [ref=e54]
                - paragraph [ref=e55]: Theo dõi tiến trình, xem kết quả và quản lý những phản ánh bạn đã gửi.
              - navigation "Thao tác phản ánh" [ref=e56]:
                - link "Gửi phản ánh" [ref=e57] [cursor=pointer]:
                  - /url: /tickets/create
                  - img [ref=e58]
                  - text: Gửi phản ánh
                - link "Kho lưu trữ" [ref=e61] [cursor=pointer]:
                  - /url: /tickets/archive
                  - img [ref=e62]
                  - text: Kho lưu trữ
            - navigation "Lọc nhanh theo tình trạng phản ánh" [ref=e66]:
              - button "Tổng phản ánh 4 Xem toàn bộ" [pressed] [ref=e67]:
                - generic [ref=e68]:
                  - text: Tổng phản ánh
                  - img [ref=e69]
                - strong [ref=e73]: "4"
                - generic [ref=e74]: Xem toàn bộ
              - button "Đang xử lý 3 Theo dõi tiến độ" [ref=e75]:
                - generic [ref=e76]:
                  - text: Đang xử lý
                  - img [ref=e77]
                - strong [ref=e79]: "3"
                - generic [ref=e80]: Theo dõi tiến độ
              - button "Đang kiểm tra 0 Kết quả đang duyệt" [ref=e81]:
                - generic [ref=e82]:
                  - text: Đang kiểm tra
                  - img [ref=e83]
                - strong [ref=e87]: "0"
                - generic [ref=e88]: Kết quả đang duyệt
              - button "Chờ đánh giá 1 Cần bạn phản hồi" [ref=e89]:
                - generic [ref=e90]:
                  - text: Chờ đánh giá
                  - img [ref=e91]
                - strong [ref=e93]: "1"
                - generic [ref=e94]: Cần bạn phản hồi
              - button "Đã kết thúc 0 Hồ sơ hoàn tất" [ref=e95]:
                - generic [ref=e96]:
                  - text: Đã kết thúc
                  - img [ref=e97]
                - strong [ref=e100]: "0"
                - generic [ref=e101]: Hồ sơ hoàn tất
        - region "Tìm và lọc phản ánh" [ref=e102]:
          - generic [ref=e104]:
            - img [ref=e106]
            - generic [ref=e116]:
              - heading "Tìm và lọc phản ánh" [level=2] [ref=e117]
              - paragraph [ref=e118]: Thu hẹp danh sách theo tiêu đề, khu vực, danh mục hoặc trạng thái.
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]: Tìm phản ánh
              - img
              - searchbox "Tìm phản ánh" [ref=e122]
            - button "Lọc theo danh mục" [ref=e124]:
              - img [ref=e125]
              - generic [ref=e129]: Tất cả danh mục
              - img [ref=e130]
            - button "Lọc theo trạng thái" [ref=e133]:
              - img [ref=e134]
              - generic [ref=e138]: Tất cả trạng thái
              - img [ref=e139]
            - button "Sắp xếp danh sách" [ref=e142]:
              - img [ref=e143]
              - generic [ref=e148]: Cập nhật mới nhất
              - img [ref=e149]
        - region "Danh sách phản ánh" [ref=e151]:
          - generic [ref=e152]:
            - generic [ref=e153]:
              - heading "Danh sách phản ánh" [level=2] [ref=e154]
              - paragraph [ref=e155]: 4 phản ánh phù hợp với bộ lọc hiện tại.
            - generic [ref=e156]:
              - img [ref=e157]
              - text: Chọn một phản ánh để xem chi tiết
          - list [ref=e163]:
            - listitem [ref=e164]:
              - 'link "Xem chi tiết phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #38" [ref=e165] [cursor=pointer]':
                - /url: /tickets/936ccda9-2121-de83-4937-af54109cab3f
                - article [ref=e166]:
                  - img [ref=e168]
                  - generic [ref=e172]:
                    - generic [ref=e173]:
                      - 'heading "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #38" [level=3] [ref=e174]'
                      - generic [ref=e175]: Chiếu sáng công cộng
                    - generic [ref=e176]:
                      - generic [ref=e177]:
                        - img [ref=e178]
                        - generic [ref=e181]: Phường Linh Xuân
                      - time [ref=e182]:
                        - img [ref=e183]
                        - text: Gửi 25/07/2026
                - complementary "Trạng thái phản ánh" [ref=e194]:
                  - generic [ref=e195]:
                    - generic [ref=e196]:
                      - img [ref=e197]
                      - text: Đang xử lý
                    - time [ref=e199]: Cập nhật 25/07/2026
                  - img [ref=e201]
            - listitem [ref=e204]:
              - 'link "Xem chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #12" [ref=e205] [cursor=pointer]':
                - /url: /tickets/a8c19b0e-95bc-bbef-1096-1ca4613dcd16
                - article [ref=e206]:
                  - img [ref=e208]
                  - generic [ref=e212]:
                    - generic [ref=e213]:
                      - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #12" [level=3] [ref=e214]'
                      - generic [ref=e215]: An toàn công cộng
                    - generic [ref=e216]:
                      - generic [ref=e217]:
                        - img [ref=e218]
                        - generic [ref=e221]: Phường Long Phước
                      - time [ref=e222]:
                        - img [ref=e223]
                        - text: Gửi 22/07/2026
                - complementary "Trạng thái phản ánh" [ref=e234]:
                  - generic [ref=e235]:
                    - generic [ref=e236]:
                      - img [ref=e237]
                      - text: Đã chuyển xử lý
                    - time [ref=e240]: Cập nhật 22/07/2026
                  - img [ref=e242]
            - listitem [ref=e245]:
              - 'link "Xem chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #25" [ref=e246] [cursor=pointer]':
                - /url: /tickets/a2a302ce-cebd-8f58-1ec5-aea7e67ed0ea
                - article [ref=e247]:
                  - img [ref=e249]
                  - generic [ref=e253]:
                    - generic [ref=e254]:
                      - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #25" [level=3] [ref=e255]'
                      - generic [ref=e256]: Thu gom rác thải
                    - generic [ref=e257]:
                      - generic [ref=e258]:
                        - img [ref=e259]
                        - generic [ref=e262]: Phường Long Trường
                      - time [ref=e263]:
                        - img [ref=e264]
                        - text: Gửi 10/07/2026
                - complementary "Trạng thái phản ánh" [ref=e275]:
                  - generic [ref=e276]:
                    - generic [ref=e277]:
                      - img [ref=e278]
                      - text: Đang xử lý
                    - time [ref=e280]: Cập nhật 10/07/2026
                  - img [ref=e282]
            - listitem [ref=e285]:
              - 'link "Xem chi tiết phản ánh [SEED-SLA] Miệng cống bị rác che kín #51" [ref=e286] [cursor=pointer]':
                - /url: /tickets/0f19b18b-42d9-0527-a01a-ac2723ac17f7
                - article [ref=e287]:
                  - img [ref=e289]
                  - generic [ref=e293]:
                    - generic [ref=e294]:
                      - 'heading "[SEED-SLA] Miệng cống bị rác che kín #51" [level=3] [ref=e295]'
                      - generic [ref=e296]: Thoát nước & Ngập úng
                    - generic [ref=e297]:
                      - generic [ref=e298]:
                        - img [ref=e299]
                        - generic [ref=e302]: Phường Long Phước
                      - time [ref=e303]:
                        - img [ref=e304]
                        - text: Gửi 28/03/2026
                - complementary "Trạng thái phản ánh" [ref=e315]:
                  - generic [ref=e316]:
                    - generic [ref=e317]:
                      - img [ref=e318]
                      - text: Chờ bạn đánh giá
                    - time [ref=e320]: Cập nhật 02/04/2026
                  - img [ref=e322]
          - generic [ref=e325]:
            - paragraph [ref=e326]:
              - text: Hiển thị
              - strong [ref=e327]: 1–4
              - text: trong tổng số
              - strong [ref=e328]: "4"
              - text: phản ánh
            - navigation "Phân trang danh sách phản ánh" [ref=e329]:
              - button "Trước" [disabled] [ref=e330]:
                - img [ref=e331]
                - text: Trước
              - generic [ref=e333]: 1 / 1
              - button "Sau" [disabled] [ref=e334]:
                - text: Sau
                - img [ref=e335]
      - generic [ref=e338]:
        - generic [ref=e339]:
          - img [ref=e341]
          - generic [ref=e345]:
            - paragraph [ref=e346]: UrbanMind
            - paragraph [ref=e347]: © 2026 Cổng phản ánh đô thị
        - navigation "Thông tin pháp lý và hỗ trợ" [ref=e348]:
          - link "Chính sách riêng tư" [ref=e349] [cursor=pointer]:
            - /url: "#privacy"
          - link "Điều khoản sử dụng" [ref=e350] [cursor=pointer]:
            - /url: "#terms"
          - link "Hỗ trợ" [ref=e351] [cursor=pointer]:
            - /url: mailto:support@urbanmind.vn
            - img [ref=e352]
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
      |                                                                             ^ Error: Ticket detail: unexpected uncaught page errors
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