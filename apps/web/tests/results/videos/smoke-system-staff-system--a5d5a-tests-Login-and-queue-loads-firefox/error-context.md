# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\system-staff\system-staff.spec.ts >> System Staff smoke tests >> Login and queue loads
- Location: tests\smoke\system-staff\system-staff.spec.ts:68:3

# Error details

```
Error: Queue: unexpected page errors

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
          - generic [ref=e36]: Nhân Viên Tiếp Nhận
      - navigation [ref=e37]:
        - generic [ref=e38]:
          - button "Không Gian Làm Việc" [ref=e39]:
            - generic [ref=e40]: Không Gian Làm Việc
            - img [ref=e41]
          - generic [ref=e43]:
            - link "Không Gian Làm Việc" [ref=e44] [cursor=pointer]:
              - /url: /dashboard
              - img [ref=e47]
              - generic [ref=e52]: Không Gian Làm Việc
            - link "Hàng Chờ Kiểm Duyệt AI" [ref=e53] [cursor=pointer]:
              - /url: /staff/queue
              - img [ref=e56]
              - generic [ref=e71]: Hàng Chờ Kiểm Duyệt AI
            - link "Quản Lý Phản Ánh" [ref=e72] [cursor=pointer]:
              - /url: /staff/feedbacks
              - img [ref=e75]
              - generic [ref=e80]: Quản Lý Phản Ánh
        - generic [ref=e81]:
          - button "Điều phối & Giám Sát" [ref=e82]:
            - generic [ref=e83]: Điều phối & Giám Sát
            - img [ref=e84]
          - generic [ref=e86]:
            - link "Quản lý Conversation" [ref=e87] [cursor=pointer]:
              - /url: /staff/conversations
              - img [ref=e90]
              - generic [ref=e92]: Quản lý Conversation
            - link "Quản Lý Cảnh Báo Khu Vực" [ref=e93] [cursor=pointer]:
              - /url: /staff/area-alerts
              - img [ref=e96]
              - generic [ref=e100]: Quản Lý Cảnh Báo Khu Vực
            - link "Danh bạ Điều phối viên" [ref=e101] [cursor=pointer]:
              - /url: /staff/coordinators
              - img [ref=e104]
              - generic [ref=e109]: Danh bạ Điều phối viên
            - link "Xử Lý Trùng Lặp" [ref=e110] [cursor=pointer]:
              - /url: /staff/duplicates
              - img [ref=e113]
              - generic [ref=e116]: Xử Lý Trùng Lặp
        - generic [ref=e117]:
          - button "Hệ thống" [ref=e118]:
            - generic [ref=e119]: Hệ thống
            - img [ref=e120]
          - generic [ref=e122]:
            - link "Trang Cá Nhân" [ref=e123] [cursor=pointer]:
              - /url: /profile
              - img [ref=e126]
              - generic [ref=e129]: Trang Cá Nhân
            - link "Cài Đặt" [ref=e130] [cursor=pointer]:
              - /url: /settings
              - img [ref=e133]
              - generic [ref=e136]: Cài Đặt
      - button "Đăng xuất" [ref=e138] [cursor=pointer]:
        - img [ref=e139]
        - text: Đăng xuất
  - generic [ref=e143]:
    - banner [ref=e144]:
      - navigation "Breadcrumb" [ref=e146]:
        - generic [ref=e147]:
          - link "Tổng quan hệ thống" [ref=e148] [cursor=pointer]:
            - /url: /dashboard
          - generic [ref=e149]:
            - img [ref=e150]
            - generic [ref=e152]: Hàng chờ kiểm duyệt
      - generic [ref=e153]:
        - button "Toggle theme" [ref=e154]:
          - img [ref=e155]
        - button "Thông báo" [ref=e158]:
          - img [ref=e159]
    - main [ref=e162]:
      - generic [ref=e165]:
        - generic [ref=e166]:
          - heading "Hàng Chờ Kiểm Duyệt AI" [level=2] [ref=e167]
          - paragraph [ref=e168]: Đánh giá kết quả phân loại tự động của AI đối với các phản ánh mới trước khi tiến hành điều phối.
        - generic [ref=e169]:
          - complementary [ref=e170]:
            - generic [ref=e171]:
              - generic [ref=e173]:
                - heading "Danh sách phản ánh mới (4)" [level=4] [ref=e174]
                - button "Bộ lọc" [ref=e176] [cursor=pointer]:
                  - img [ref=e177]
                  - text: Bộ lọc
              - generic [ref=e187]:
                - 'button "0ff6eeec-2c8b-c11a-df09-ba6239e246e3 5/8/2026 High [SEED-SLA] Cây xanh có nguy cơ gãy đổ #06 Khu dân cư Long Thuận, Phường Long Phước" [ref=e188]':
                  - generic [ref=e189]:
                    - generic [ref=e190]: 0ff6eeec-2c8b-c11a-df09-ba6239e246e3
                    - generic [ref=e191]: 5/8/2026
                  - generic [ref=e193]: High
                  - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #06" [level=5] [ref=e194]'
                  - generic [ref=e195]: Khu dân cư Long Thuận, Phường Long Phước
                - 'button "ddb44913-5634-3452-3309-c02db25032e8 1/8/2026 Low [SEED-SLA] Đồng hồ nước bị hư hỏng #04 Đường Trường Lưu, Phường Long Trường" [ref=e196]':
                  - generic [ref=e197]:
                    - generic [ref=e198]: ddb44913-5634-3452-3309-c02db25032e8
                    - generic [ref=e199]: 1/8/2026
                  - generic [ref=e201]: Low
                  - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #04" [level=5] [ref=e202]'
                  - generic [ref=e203]: Đường Trường Lưu, Phường Long Trường
                - 'button "fe600e3a-0a1c-e32c-0eaa-efb0e6062cf9 31/7/2026 Urgent [SEED-SLA] Đường giao thông cần được sửa chữa #05 Đường Kha Vạn Cân, Phường Linh Xuân" [ref=e204]':
                  - generic [ref=e205]:
                    - generic [ref=e206]: fe600e3a-0a1c-e32c-0eaa-efb0e6062cf9
                    - generic [ref=e207]: 31/7/2026
                  - generic [ref=e209]: Urgent
                  - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #05" [level=5] [ref=e210]'
                  - generic [ref=e211]: Đường Kha Vạn Cân, Phường Linh Xuân
                - 'button "698f0c5d-5c66-4143-97ad-bedef7ea888a 27/7/2026 Phản ánh trùng High Ổ Gà trên đường lò lu Vị trí đã chọn: 10.824043, 106.808181" [ref=e212]':
                  - generic [ref=e213]:
                    - generic [ref=e214]: 698f0c5d-5c66-4143-97ad-bedef7ea888a
                    - generic [ref=e215]: 27/7/2026
                  - generic [ref=e216]:
                    - generic [ref=e217]:
                      - img [ref=e218]
                      - text: Phản ánh trùng
                    - generic [ref=e222]: High
                  - heading "Ổ Gà trên đường lò lu" [level=5] [ref=e223]
                  - generic [ref=e224]: "Vị trí đã chọn: 10.824043, 106.808181"
          - main [ref=e225]:
            - generic [ref=e226]:
              - generic [ref=e227]:
                - generic [ref=e228]:
                  - generic [ref=e229]:
                    - img [ref=e230]
                    - text: AI Review Insights
                  - generic [ref=e235]:
                    - heading "Phân Tích AI Đề Xuất" [level=3] [ref=e236]
                    - paragraph [ref=e237]: Kết quả phân tích tự động từ AI giúp staff đánh giá và ra quyết định nhanh hơn.
                - generic [ref=e238]:
                  - img [ref=e240]
                  - generic [ref=e245]:
                    - paragraph [ref=e246]: Độ tin cậy AI
                    - paragraph [ref=e247]: 0%
              - generic [ref=e249]: High
              - generic [ref=e250]:
                - generic [ref=e251]:
                  - paragraph [ref=e252]: Tóm tắt sự cố
                  - paragraph [ref=e253]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #06"
                - generic [ref=e254]:
                  - generic [ref=e256]:
                    - img [ref=e258]
                    - generic [ref=e261]:
                      - paragraph [ref=e262]: Độ tin cậy
                      - paragraph [ref=e263]: 0%
                  - generic [ref=e265]:
                    - img [ref=e267]
                    - generic [ref=e270]:
                      - paragraph [ref=e271]: Ưu tiên
                      - paragraph [ref=e272]: High
                  - generic [ref=e274]:
                    - img [ref=e276]
                    - generic [ref=e279]:
                      - paragraph [ref=e280]: Cảm xúc
                      - paragraph [ref=e281]: Unknown
                  - generic [ref=e283]:
                    - img [ref=e285]
                    - generic [ref=e290]:
                      - paragraph [ref=e291]: Trùng lặp
                      - paragraph [ref=e292]: N/A
                - generic [ref=e293]:
                  - generic [ref=e294]:
                    - generic [ref=e296]: Danh mục
                    - combobox [ref=e297]:
                      - option "An toàn công cộng" [selected]
                      - option "Bảo trì đường bộ"
                      - option "Cấp nước"
                      - option "Chiếu sáng công cộng"
                      - option "Thoát nước & Ngập úng"
                      - option "Thu gom rác thải"
                  - generic [ref=e298]:
                    - generic [ref=e300]: Mức độ ưu tiên
                    - combobox [ref=e301]:
                      - option "Thấp (Low)"
                      - option "Trung bình (Medium)"
                      - option "Cao (High)" [selected]
                      - option "Khẩn cấp (Critical)"
                  - generic [ref=e302]:
                    - paragraph [ref=e303]: Khu vực
                    - paragraph [ref=e304]: Phường Long Phước
                - generic [ref=e305]:
                  - generic [ref=e306]:
                    - generic [ref=e307]:
                      - paragraph [ref=e308]: Rủi ro & Hành động đề xuất
                      - paragraph [ref=e309]: Thông tin AI dựa trên dữ liệu phân tích và cảnh báo giúp bạn đưa quyết định nhanh hơn.
                    - generic [ref=e310]: Thông tin AI
                  - generic [ref=e311]:
                    - generic [ref=e312]:
                      - generic [ref=e313]:
                        - paragraph [ref=e314]: Rủi ro / Lưu ý
                        - paragraph [ref=e315]: Không có ghi chú rủi ro cụ thể.
                      - generic [ref=e316]:
                        - paragraph [ref=e317]: Quan sát AI
                        - paragraph [ref=e318]: AI không cung cấp nhận xét chi tiết.
                    - generic [ref=e319]:
                      - generic [ref=e320]:
                        - paragraph [ref=e321]: Ưu tiên xử lý
                        - paragraph [ref=e322]: Xử lý ở mức high
                      - generic [ref=e323]:
                        - paragraph [ref=e324]: Hành động đề xuất
                        - list [ref=e325]:
                          - listitem [ref=e326]: Kiểm tra danh mục và mức độ ưu tiên AI đề xuất.
                          - listitem [ref=e327]: Chỉnh sửa nếu cần và xác nhận chuyển phân công.
                          - listitem [ref=e328]: Ghi chú thêm nếu có rủi ro đặc biệt.
                - button "Xác Nhận & Duyệt Chuyển Phân Công" [ref=e329] [cursor=pointer]
            - generic [ref=e330]:
              - heading "Chi Tiết Sự Cố" [level=4] [ref=e332]
              - generic [ref=e333]:
                - generic [ref=e334]:
                  - paragraph [ref=e335]: Tiêu đề
                  - paragraph [ref=e336]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #06"
                - generic [ref=e337]:
                  - paragraph [ref=e338]: Mã phản ánh
                  - paragraph [ref=e339]: 0ff6eeec-2c8b-c11a-df09-ba6239e246e3
                - generic [ref=e340]:
                  - paragraph [ref=e341]: Người báo cáo
                  - paragraph [ref=e342]: Mạnh Vũ Đức
                - generic [ref=e343]:
                  - paragraph [ref=e344]: Địa điểm
                  - paragraph [ref=e345]: Khu dân cư Long Thuận, Phường Long Phước
                - generic [ref=e346]:
                  - paragraph [ref=e347]: Khu vực
                  - paragraph [ref=e348]: Phường Long Phước
                - generic [ref=e349]:
                  - paragraph [ref=e350]: Danh mục hồ sơ
                  - paragraph [ref=e351]: An toàn công cộng
              - generic [ref=e353]:
                - paragraph [ref=e354]: Nội dung phản ánh
                - paragraph [ref=e355]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #06"
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { LoginPage } from '../../pages/LoginPage';
  3   | import { DashboardPage } from '../../pages/DashboardPage';
  4   | import ManagementFeedbackListPage from '../../../src/pages/staff/ManagementFeedbackListPage';
  5   | 
  6   | const staffEmail = 'kvietanh123@gmail.com';
  7   | const staffPassword = '123456789';
  8   | 
  9   | const queueRoute = '/staff/queue';
  10  | const feedbackListRoute = '/staff/feedbacks';
  11  | const duplicateDetectionRoute = '/staff/duplicates';
  12  | const assignmentHistoryRoute = '/staff/assignment-history';
  13  | const areaAlertsRoute = '/staff/area-alerts';
  14  | 
  15  | type PageMonitor = {
  16  |   pageErrors: string[];
  17  |   consoleErrors: string[];
  18  |   badResponses: string[];
  19  | };
  20  | 
  21  | const attachPageMonitoring = (page: Page): PageMonitor => {
  22  |   const monitor: PageMonitor = { pageErrors: [], consoleErrors: [], badResponses: [] };
  23  | 
  24  |   page.on('pageerror', (error) => monitor.pageErrors.push(error?.message || String(error)));
  25  |   page.on('console', (m) => { if (m.type() === 'error') monitor.consoleErrors.push(m.text()); });
  26  |   page.on('response', (response) => {
  27  |     const status = response.status();
  28  |     const url = response.url();
  29  |     if (status >= 400 && /\/api\//i.test(url)) monitor.badResponses.push(`${status} ${response.request().method()} ${url}`);
  30  |   });
  31  | 
  32  |   return monitor;
  33  | };
  34  | 
  35  | const assertNoErrors = async (monitor: PageMonitor, context: string) => {
  36  |   const relevant = monitor.pageErrors.filter((e) => !/Unexpected token '<'/.test(String(e)));
> 37  |   expect(relevant, `${context}: unexpected page errors`).toEqual([]);
      |                                                          ^ Error: Queue: unexpected page errors
  38  |   // Filter known benign console messages (HTML responses or 405s returned from some endpoints)
  39  |   const consoleRelevant = monitor.consoleErrors.filter((e) => {
  40  |     if (!e) return false;
  41  |     if (/Unexpected token '<'/.test(e)) return false;
  42  |     if (/Failed to load resource: the server responded with a status of 405/.test(e)) return false;
  43  |     if (/\b405\b/.test(e) && /Method Not Allowed/i.test(e)) return false;
  44  |     return true;
  45  |   });
  46  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
  47  |   // Ignore 405 responses from some management endpoints which are read-only in smoke runs
  48  |   const badRelevant = monitor.badResponses.filter((e) => {
  49  |     if (!e) return false;
  50  |     if (/\b405\b/.test(e)) return false;
  51  |     return true;
  52  |   });
  53  |   expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
  54  | };
  55  | 
  56  | const loginAsStaff = async (page: Page) => {
  57  |   await page.goto('/login');
  58  |   const loginPage = new LoginPage(page);
  59  |   await loginPage.login(staffEmail, staffPassword);
  60  |   await page.waitForLoadState('networkidle');
  61  |   await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  62  |   await page.waitForSelector('.admin-page-hero, .admin-hero-title, #staff-queue', { timeout: 30000 }).catch(() => undefined);
  63  | };
  64  | 
  65  | test.describe.serial('System Staff smoke tests', () => {
  66  |   test.setTimeout(120000);
  67  | 
  68  |   test('Login and queue loads', async ({ page }) => {
  69  |     const monitor = attachPageMonitoring(page);
  70  |     await loginAsStaff(page);
  71  |     await page.goto(queueRoute);
  72  |     await page.waitForLoadState('networkidle');
  73  | 
  74  |     // Check for the admin hero title or queue indicator (fall back to text if heading not found)
  75  |     // Check for expected queue headings; different deployments may show different titles
  76  |     await expect(page.getByRole('heading', { name: /Hàng Chờ Kiểm Duyệt AI|Quản Lý Hội Thoại|Hàng đợi trao đổi/i })).toBeVisible({ timeout: 15000 });
  77  | 
  78  |     await assertNoErrors(monitor, 'Queue');
  79  |   });
  80  | 
  81  |   test('Feedback list loads', async ({ page }) => {
  82  |     const monitor = attachPageMonitoring(page);
  83  |     await loginAsStaff(page);
  84  |     await page.goto(feedbackListRoute);
  85  |     await page.waitForLoadState('networkidle');
  86  | 
  87  |     await expect(page.locator('h1.admin-hero-title, .management-feedback-list')).toBeVisible({ timeout: 15000 });
  88  |     await assertNoErrors(monitor, 'Feedback list');
  89  |   });
  90  | 
  91  |   test('Feedback detail and conversation panel', async ({ page }) => {
  92  |     const monitor = attachPageMonitoring(page);
  93  |     await loginAsStaff(page);
  94  | 
  95  |     // Open first feedback from list if present
  96  |     await page.goto(feedbackListRoute);
  97  |     await page.waitForLoadState('networkidle');
  98  | 
  99  |     const firstRow = page.locator('table tbody tr').first();
  100 |     const count = await page.locator('table tbody tr').count();
  101 |     if (count === 0) {
  102 |       console.log('No feedbacks available — skipping detail checks');
  103 |       return;
  104 |     }
  105 | 
  106 |     await expect(firstRow).toBeVisible({ timeout: 20000 });
  107 |     await firstRow.click();
  108 |     await page.waitForURL(/\/staff\/feedbacks\/[A-Za-z0-9_-]+/, { timeout: 30000 });
  109 | 
  110 |     // Check detail loaded
  111 |     await expect(page.locator('h1.admin-hero-title, .admin-section-title')).toBeVisible({ timeout: 15000 });
  112 | 
  113 |     // Open exchange tab
  114 |     try {
  115 |       await page.getByRole('button', { name: /Trao đổi|Exchange|Trao đổi phản ánh/i }).click();
  116 |     } catch {
  117 |       // if tab button not found, use selector
  118 |       await page.locator('button').filter({ hasText: /Trao đổi|Exchange/ }).first().click().catch(() => undefined);
  119 |     }
  120 | 
  121 |     await expect(page.locator('.chat-bubble, .exchange-list, .staff-communication-surface')).toBeVisible({ timeout: 15000 });
  122 | 
  123 |     // Verify existing messages or internal note badge if present
  124 |     const messages = await page.locator('.chat-bubble').count();
  125 |     if (messages > 0) await expect(page.locator('.chat-bubble').first()).toBeVisible();
  126 |     // internal note badge
  127 |     await expect(page.locator('.badge, .internal-note, .note-badge').first()).toBeVisible().catch(() => undefined);
  128 | 
  129 |     await assertNoErrors(monitor, 'Feedback detail');
  130 |   });
  131 | 
  132 |   test('Duplicate detection and detail', async ({ page }) => {
  133 |     const monitor = attachPageMonitoring(page);
  134 |     await loginAsStaff(page);
  135 |     await page.goto(duplicateDetectionRoute);
  136 |     await page.waitForLoadState('networkidle');
  137 | 
```