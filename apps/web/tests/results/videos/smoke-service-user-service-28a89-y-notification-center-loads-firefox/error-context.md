# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Verify notification center loads
- Location: tests\smoke\service-user\service-user.spec.ts:150:3

# Error details

```
Error: Notification center: unexpected uncaught page errors

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
      - main [ref=e48]:
        - generic [ref=e50]:
          - generic [ref=e51]:
            - img
            - generic [ref=e52]:
              - generic [ref=e53]:
                - heading "Thông báo của tôi" [level=1] [ref=e54]
                - paragraph [ref=e55]: Theo dõi thay đổi trạng thái, yêu cầu bổ sung và kết quả xử lý của các phản ánh bạn đã gửi.
              - generic [ref=e56]:
                - button "Đánh dấu tất cả đã đọc" [ref=e57]:
                  - img [ref=e58]
                  - text: Đánh dấu tất cả đã đọc
                - button "Làm mới" [ref=e61]:
                  - img [ref=e62]
                  - text: Làm mới
            - generic [ref=e67]:
              - generic [ref=e69]:
                - generic [ref=e70]:
                  - paragraph [ref=e71]: Chưa đọc
                  - strong [ref=e72]: "24"
                - img [ref=e74]
              - generic [ref=e80]:
                - generic [ref=e81]:
                  - paragraph [ref=e82]: Tổng thông báo
                  - strong [ref=e83]: "39"
                - img [ref=e85]
              - generic [ref=e90]:
                - generic [ref=e91]:
                  - paragraph [ref=e92]: Đang hiển thị
                  - strong [ref=e93]: "39"
                - img [ref=e95]
          - generic [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e101]:
                - button "Tất cả 39" [ref=e102]:
                  - img [ref=e103]
                  - text: Tất cả
                  - generic [ref=e110]: "39"
                - button "Cập nhật trạng thái 36" [ref=e111]:
                  - img [ref=e112]
                  - text: Cập nhật trạng thái
                  - generic [ref=e117]: "36"
                - button "Yêu cầu bổ sung 1" [ref=e118]:
                  - img [ref=e119]
                  - text: Yêu cầu bổ sung
                  - generic [ref=e122]: "1"
                - button "Kết quả xử lý 2" [ref=e123]:
                  - img [ref=e124]
                  - text: Kết quả xử lý
                  - generic [ref=e127]: "2"
                - button "Hoạt động cộng đồng 0" [ref=e128]:
                  - img [ref=e129]
                  - text: Hoạt động cộng đồng
                  - generic [ref=e131]: "0"
              - generic [ref=e132]:
                - checkbox "Chỉ chưa đọc" [ref=e133] [cursor=pointer]
                - text: Chỉ chưa đọc
            - generic [ref=e134]:
              - generic [ref=e135]:
                - img
                - textbox "Tìm theo tiêu đề hoặc nội dung..." [ref=e136]
              - paragraph [ref=e137]: 39 thông báo phù hợp
          - generic [ref=e138]:
            - generic [ref=e139]:
              - generic [ref=e140]:
                - heading "Danh sách thông báo" [level=2] [ref=e141]
                - paragraph [ref=e142]: Mở thông báo để đi thẳng tới phản ánh liên quan.
              - img [ref=e143]
            - generic [ref=e149]:
              - generic [ref=e150]:
                - heading "Trước đó" [level=3] [ref=e151]
                - generic [ref=e152]: 12 thông báo
              - article [ref=e153]:
                - generic [ref=e154]:
                  - generic [ref=e155]:
                    - img [ref=e157]
                    - generic [ref=e162]:
                      - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e164]
                      - paragraph [ref=e165]: Feedback "Cây ngã do bão" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e166]:
                        - generic [ref=e167]: Cập nhật trạng thái
                        - generic [ref=e168]: •
                        - generic [ref=e169]:
                          - img [ref=e170]
                          - text: 21 ngày trước
                  - button "Mở phản ánh" [ref=e174]:
                    - img [ref=e175]
                    - text: Mở phản ánh
              - article [ref=e178]:
                - generic [ref=e179]:
                  - generic [ref=e180]:
                    - img [ref=e182]
                    - generic [ref=e187]:
                      - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e189]
                      - paragraph [ref=e190]: Feedback "Cây ngã do bão" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e191]:
                        - generic [ref=e192]: Cập nhật trạng thái
                        - generic [ref=e193]: •
                        - generic [ref=e194]:
                          - img [ref=e195]
                          - text: 21 ngày trước
                  - button "Mở phản ánh" [ref=e199]:
                    - img [ref=e200]
                    - text: Mở phản ánh
              - article [ref=e203]:
                - generic [ref=e205]:
                  - generic [ref=e206]:
                    - img [ref=e208]
                    - generic [ref=e213]:
                      - generic [ref=e214]:
                        - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e215]
                        - generic [ref=e216]: Mới
                      - paragraph [ref=e217]: Feedback "hư đènz" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e218]:
                        - generic [ref=e219]: Cập nhật trạng thái
                        - generic [ref=e220]: •
                        - generic [ref=e221]:
                          - img [ref=e222]
                          - text: 25 ngày trước
                  - generic [ref=e225]:
                    - button "Mở phản ánh" [ref=e226]:
                      - img [ref=e227]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e230]:
                      - img [ref=e231]
                      - text: Đánh dấu đã đọc
              - article [ref=e235]:
                - generic [ref=e237]:
                  - generic [ref=e238]:
                    - img [ref=e240]
                    - generic [ref=e245]:
                      - generic [ref=e246]:
                        - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e247]
                        - generic [ref=e248]: Mới
                      - paragraph [ref=e249]: Feedback "hư đènz" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e250]:
                        - generic [ref=e251]: Cập nhật trạng thái
                        - generic [ref=e252]: •
                        - generic [ref=e253]:
                          - img [ref=e254]
                          - text: 25 ngày trước
                  - generic [ref=e257]:
                    - button "Mở phản ánh" [ref=e258]:
                      - img [ref=e259]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e262]:
                      - img [ref=e263]
                      - text: Đánh dấu đã đọc
              - article [ref=e267]:
                - generic [ref=e269]:
                  - generic [ref=e270]:
                    - img [ref=e272]
                    - generic [ref=e277]:
                      - generic [ref=e278]:
                        - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e279]
                        - generic [ref=e280]: Mới
                      - paragraph [ref=e281]: Feedback "E2E feedback test title" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e282]:
                        - generic [ref=e283]: Cập nhật trạng thái
                        - generic [ref=e284]: •
                        - generic [ref=e285]:
                          - img [ref=e286]
                          - text: 25 ngày trước
                  - generic [ref=e289]:
                    - button "Mở phản ánh" [ref=e290]:
                      - img [ref=e291]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e294]:
                      - img [ref=e295]
                      - text: Đánh dấu đã đọc
              - article [ref=e299]:
                - generic [ref=e301]:
                  - generic [ref=e302]:
                    - img [ref=e304]
                    - generic [ref=e309]:
                      - generic [ref=e310]:
                        - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e311]
                        - generic [ref=e312]: Mới
                      - paragraph [ref=e313]: Feedback "E2E feedback test title" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e314]:
                        - generic [ref=e315]: Cập nhật trạng thái
                        - generic [ref=e316]: •
                        - generic [ref=e317]:
                          - img [ref=e318]
                          - text: 25 ngày trước
                  - generic [ref=e321]:
                    - button "Mở phản ánh" [ref=e322]:
                      - img [ref=e323]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e326]:
                      - img [ref=e327]
                      - text: Đánh dấu đã đọc
              - article [ref=e331]:
                - generic [ref=e333]:
                  - generic [ref=e334]:
                    - img [ref=e336]
                    - generic [ref=e341]:
                      - generic [ref=e342]:
                        - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e343]
                        - generic [ref=e344]: Mới
                      - paragraph [ref=e345]: Feedback "E2E feedback test title" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e346]:
                        - generic [ref=e347]: Cập nhật trạng thái
                        - generic [ref=e348]: •
                        - generic [ref=e349]:
                          - img [ref=e350]
                          - text: 25 ngày trước
                  - generic [ref=e353]:
                    - button "Mở phản ánh" [ref=e354]:
                      - img [ref=e355]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e358]:
                      - img [ref=e359]
                      - text: Đánh dấu đã đọc
              - article [ref=e363]:
                - generic [ref=e365]:
                  - generic [ref=e366]:
                    - img [ref=e368]
                    - generic [ref=e373]:
                      - generic [ref=e374]:
                        - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e375]
                        - generic [ref=e376]: Mới
                      - paragraph [ref=e377]: Feedback "E2E feedback test title" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e378]:
                        - generic [ref=e379]: Cập nhật trạng thái
                        - generic [ref=e380]: •
                        - generic [ref=e381]:
                          - img [ref=e382]
                          - text: 25 ngày trước
                  - generic [ref=e385]:
                    - button "Mở phản ánh" [ref=e386]:
                      - img [ref=e387]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e390]:
                      - img [ref=e391]
                      - text: Đánh dấu đã đọc
              - article [ref=e395]:
                - generic [ref=e397]:
                  - generic [ref=e398]:
                    - img [ref=e400]
                    - generic [ref=e405]:
                      - generic [ref=e406]:
                        - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e407]
                        - generic [ref=e408]: Mới
                      - paragraph [ref=e409]: Feedback "E2E feedback test title" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e410]:
                        - generic [ref=e411]: Cập nhật trạng thái
                        - generic [ref=e412]: •
                        - generic [ref=e413]:
                          - img [ref=e414]
                          - text: 25 ngày trước
                  - generic [ref=e417]:
                    - button "Mở phản ánh" [ref=e418]:
                      - img [ref=e419]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e422]:
                      - img [ref=e423]
                      - text: Đánh dấu đã đọc
              - article [ref=e427]:
                - generic [ref=e429]:
                  - generic [ref=e430]:
                    - img [ref=e432]
                    - generic [ref=e437]:
                      - generic [ref=e438]:
                        - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e439]
                        - generic [ref=e440]: Mới
                      - paragraph [ref=e441]: Feedback "E2E feedback test title" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e442]:
                        - generic [ref=e443]: Cập nhật trạng thái
                        - generic [ref=e444]: •
                        - generic [ref=e445]:
                          - img [ref=e446]
                          - text: 25 ngày trước
                  - generic [ref=e449]:
                    - button "Mở phản ánh" [ref=e450]:
                      - img [ref=e451]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e454]:
                      - img [ref=e455]
                      - text: Đánh dấu đã đọc
              - article [ref=e459]:
                - generic [ref=e461]:
                  - generic [ref=e462]:
                    - img [ref=e464]
                    - generic [ref=e469]:
                      - generic [ref=e470]:
                        - heading "Trạng thái feedback đã được cập nhật" [level=4] [ref=e471]
                        - generic [ref=e472]: Mới
                      - paragraph [ref=e473]: Feedback "E2E feedback test title" đã chuyển từ "AiReviewed" sang "Verified".
                      - generic [ref=e474]:
                        - generic [ref=e475]: Cập nhật trạng thái
                        - generic [ref=e476]: •
                        - generic [ref=e477]:
                          - img [ref=e478]
                          - text: 25 ngày trước
                  - generic [ref=e481]:
                    - button "Mở phản ánh" [ref=e482]:
                      - img [ref=e483]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e486]:
                      - img [ref=e487]
                      - text: Đánh dấu đã đọc
              - article [ref=e491]:
                - generic [ref=e493]:
                  - generic [ref=e494]:
                    - img [ref=e496]
                    - generic [ref=e501]:
                      - generic [ref=e502]:
                        - heading "Feedback da duoc nhan vien cap nhat" [level=4] [ref=e503]
                        - generic [ref=e504]: Mới
                      - paragraph [ref=e505]: Feedback "E2E feedback test title" da duoc nhan vien cap nhat thong tin.
                      - generic [ref=e506]:
                        - generic [ref=e507]: Cập nhật trạng thái
                        - generic [ref=e508]: •
                        - generic [ref=e509]:
                          - img [ref=e510]
                          - text: 25 ngày trước
                  - generic [ref=e513]:
                    - button "Mở phản ánh" [ref=e514]:
                      - img [ref=e515]
                      - text: Mở phản ánh
                    - button "Đánh dấu đã đọc" [ref=e518]:
                      - img [ref=e519]
                      - text: Đánh dấu đã đọc
            - generic [ref=e523]:
              - button "Xem thêm 12 thông báo" [ref=e524]:
                - img [ref=e525]
                - text: Xem thêm 12 thông báo
              - paragraph [ref=e527]: Đang hiển thị 12/39 thông báo
      - generic [ref=e529]:
        - generic [ref=e530]:
          - img [ref=e532]
          - generic [ref=e536]:
            - paragraph [ref=e537]: UrbanMind
            - paragraph [ref=e538]: © 2026 Cổng phản ánh đô thị
        - navigation "Thông tin pháp lý và hỗ trợ" [ref=e539]:
          - link "Chính sách riêng tư" [ref=e540] [cursor=pointer]:
            - /url: "#privacy"
          - link "Điều khoản sử dụng" [ref=e541] [cursor=pointer]:
            - /url: "#terms"
          - link "Hỗ trợ" [ref=e542] [cursor=pointer]:
            - /url: mailto:support@urbanmind.vn
            - img [ref=e543]
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
      |                                                                             ^ Error: Notification center: unexpected uncaught page errors
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