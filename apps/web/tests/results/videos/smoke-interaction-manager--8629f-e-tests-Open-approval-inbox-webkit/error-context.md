# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\interaction-manager\interaction-manager.spec.ts >> Interaction Manager smoke tests >> Open approval inbox
- Location: tests\smoke\interaction-manager\interaction-manager.spec.ts:97:3

# Error details

```
Error: Approval inbox: unexpected console errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Notification API getNotifications failed Error: Network Error",
+   "Failed to load interaction monitoring data Error: Network Error",
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
          - generic [ref=e24]: Quản Lý Tương Tác
      - navigation [ref=e25]:
        - link "Tổng Quan Chỉ Số" [ref=e26]:
          - /url: /dashboard
          - img [ref=e29]
          - generic [ref=e34]: Tổng Quan Chỉ Số
        - link "Giám Sát Tương Tác" [ref=e35]:
          - /url: /manager/interactions
          - img [ref=e38]
          - generic [ref=e43]: Giám Sát Tương Tác
        - link "Hàng Đợi Duyệt" [ref=e44]:
          - /url: /manager/approvals
          - img [ref=e47]
          - generic [ref=e52]: Hàng Đợi Duyệt
        - link "Phân Tích SLA" [ref=e53]:
          - /url: /analytics/sla
          - img [ref=e56]
          - generic [ref=e58]: Phân Tích SLA
        - link "Cảm Xúc Người Dân (AI)" [ref=e59]:
          - /url: /analytics/sentiment
          - img [ref=e62]
          - generic [ref=e65]: Cảm Xúc Người Dân (AI)
        - link "Bản Đồ Nhiệt Sự Cố" [ref=e66]:
          - /url: /analytics/heatmap
          - img [ref=e69]
          - generic [ref=e71]: Bản Đồ Nhiệt Sự Cố
        - link "Cài Đặt" [ref=e72]:
          - /url: /settings
          - img [ref=e75]
          - generic [ref=e78]: Cài Đặt
      - button "Đăng xuất" [ref=e80] [cursor=pointer]:
        - img [ref=e81]
        - text: Đăng xuất
  - generic [ref=e84]:
    - banner [ref=e85]:
      - navigation "Breadcrumb" [ref=e87]:
        - generic [ref=e88]:
          - link "Tổng quan hệ thống" [ref=e89]:
            - /url: /dashboard
          - generic [ref=e90]:
            - img [ref=e91]
            - generic [ref=e93]: Hàng đợi duyệt
      - generic [ref=e94]:
        - button "Toggle theme" [ref=e95]:
          - img [ref=e96]
        - button "Thông báo, 3 chưa đọc" [ref=e99]:
          - img [ref=e100]
          - generic [ref=e103]: "3"
    - main [ref=e104]:
      - article [ref=e107]:
        - generic [ref=e109]:
          - generic [ref=e110]:
            - img [ref=e112]
            - generic [ref=e117]:
              - heading "Hàng đợi duyệt kết quả" [level=1] [ref=e118]
              - paragraph [ref=e119]: Kiểm tra kết quả xử lý, bằng chứng hoàn thành và lịch sử phối hợp trước khi phê duyệt hoặc yêu cầu làm lại.
          - complementary [ref=e120]:
            - generic [ref=e121]:
              - term [ref=e122]: Đang chờ quyết định
              - definition [ref=e123]: 6 phản ánh
        - region "Tóm tắt hàng đợi duyệt" [ref=e124]:
          - article [ref=e125]:
            - generic [ref=e126]:
              - generic [ref=e127]:
                - term [ref=e128]: Chờ duyệt
                - definition [ref=e129]: "6"
                - definition [ref=e130]: Tổng phản ánh cần quyết định.
              - img [ref=e132]
          - article [ref=e135]:
            - generic [ref=e136]:
              - generic [ref=e137]:
                - term [ref=e138]: Ưu tiên cao
                - definition [ref=e139]: "2"
                - definition [ref=e140]: Phản ánh mức High hoặc Critical trên trang hiện tại.
              - img [ref=e142]
          - article [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]:
                - term [ref=e147]: Chờ lâu nhất
                - definition [ref=e148]: 69 ngày
                - definition [ref=e149]: Thời gian chờ của hồ sơ cũ nhất đang hiển thị.
              - img [ref=e151]
        - region "Danh sách cần duyệt" [ref=e154]:
          - generic [ref=e155]:
            - generic [ref=e156]:
              - img [ref=e158]
              - generic [ref=e161]:
                - heading "Danh sách cần duyệt" [level=2] [ref=e162]
                - paragraph [ref=e163]: Ưu tiên hồ sơ khẩn cấp, hồ sơ chờ lâu và trường hợp có nhiều lần gửi lại kết quả.
            - complementary [ref=e164]:
              - search [ref=e165]:
                - generic [ref=e166]:
                  - img [ref=e167]
                  - generic [ref=e170]: Tìm kiếm phản ánh
                  - searchbox "Tìm kiếm phản ánh" [ref=e171]
                - generic [ref=e172]:
                  - generic [ref=e173]: Số dòng
                  - combobox "Số dòng mỗi trang" [ref=e174]:
                    - option "5"
                    - option "10" [selected]
                    - option "20"
                    - option "50"
          - table "Danh sách phản ánh đang chờ Interaction Manager duyệt" [ref=e177]:
            - caption [ref=e178]: Danh sách phản ánh đang chờ Interaction Manager duyệt
            - rowgroup [ref=e179]:
              - row "Phản ánh Phân loại Mức ưu tiên Thời gian chờ Trạng thái Thao tác" [ref=e180]:
                - columnheader "Phản ánh" [ref=e181]
                - columnheader "Phân loại" [ref=e182]
                - columnheader "Mức ưu tiên" [ref=e183]
                - columnheader "Thời gian chờ" [ref=e184]
                - columnheader "Trạng thái" [ref=e185]
                - columnheader "Thao tác" [ref=e186]
            - rowgroup [ref=e187]:
              - 'row "Thu gom rác thải Trung bình 1 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e188]':
                - rowheader [ref=e189]:
                  - article [ref=e190]:
                    - generic [ref=e191]:
                      - generic [ref=e192]: 88176f30-6be6-4737-70e5-cdfaade2efd6
                      - time [ref=e193]: 13:54 06/08/2026
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [level=3] [ref=e194]'
                    - generic [ref=e195]:
                      - img [ref=e196]
                      - text: Đường Trường Lưu, Phường Long Trường
                - cell "Thu gom rác thải" [ref=e199]
                - cell "Trung bình" [ref=e200]:
                  - generic [ref=e201]: Trung bình
                - cell "1 ngày" [ref=e202]:
                  - generic [ref=e203]:
                    - img [ref=e204]
                    - text: 1 ngày
                - cell "Chờ duyệt" [ref=e207]:
                  - generic [ref=e208]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e209]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e210] [cursor=pointer]':
                    - img [ref=e211]
                    - text: Xem hồ sơ
              - 'row "Cấp nước Cao 65 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #46" [ref=e216]':
                - rowheader [ref=e217]:
                  - article [ref=e218]:
                    - generic [ref=e219]:
                      - generic [ref=e220]: ccf6fba3-f64e-8584-a70d-42ae8f573861
                      - time [ref=e221]: 04:53 04/06/2026
                    - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #46" [level=3] [ref=e222]'
                    - generic [ref=e223]:
                      - img [ref=e224]
                      - text: Khu dân cư Đông Tăng Long, Phường Long Trường
                - cell "Cấp nước" [ref=e227]
                - cell "Cao" [ref=e228]:
                  - generic [ref=e229]: Cao
                - cell "65 ngày" [ref=e230]:
                  - generic [ref=e231]:
                    - img [ref=e232]
                    - text: 65 ngày
                - cell "Chờ duyệt" [ref=e235]:
                  - generic [ref=e236]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #46" [ref=e237]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #46" [ref=e238] [cursor=pointer]':
                    - img [ref=e239]
                    - text: Xem hồ sơ
              - 'row "Bảo trì đường bộ Trung bình 66 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #47" [ref=e244]':
                - rowheader [ref=e245]:
                  - article [ref=e246]:
                    - generic [ref=e247]:
                      - generic [ref=e248]: 30823c75-8c46-bea2-8e1d-6ec5866cddc4
                      - time [ref=e249]: 04:16 03/06/2026
                    - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #47" [level=3] [ref=e250]'
                    - generic [ref=e251]:
                      - img [ref=e252]
                      - text: Khu dân cư Linh Xuân, Phường Linh Xuân
                - cell "Bảo trì đường bộ" [ref=e255]
                - cell "Trung bình" [ref=e256]:
                  - generic [ref=e257]: Trung bình
                - cell "66 ngày" [ref=e258]:
                  - generic [ref=e259]:
                    - img [ref=e260]
                    - text: 66 ngày
                - cell "Chờ duyệt" [ref=e263]:
                  - generic [ref=e264]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #47" [ref=e265]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #47" [ref=e266] [cursor=pointer]':
                    - img [ref=e267]
                    - text: Xem hồ sơ
              - 'row "An toàn công cộng Thấp 67 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #48" [ref=e272]':
                - rowheader [ref=e273]:
                  - article [ref=e274]:
                    - generic [ref=e275]:
                      - generic [ref=e276]: 5801318e-eec8-781c-56b0-759c451f1e98
                      - time [ref=e277]: 03:39 02/06/2026
                    - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #48" [level=3] [ref=e278]'
                    - generic [ref=e279]:
                      - img [ref=e280]
                      - text: Khu vực Chợ Long Phước, Phường Long Phước
                - cell "An toàn công cộng" [ref=e283]
                - cell "Thấp" [ref=e284]:
                  - generic [ref=e285]: Thấp
                - cell "67 ngày" [ref=e286]:
                  - generic [ref=e287]:
                    - img [ref=e288]
                    - text: 67 ngày
                - cell "Chờ duyệt" [ref=e291]:
                  - generic [ref=e292]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #48" [ref=e293]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #48" [ref=e294] [cursor=pointer]':
                    - img [ref=e295]
                    - text: Xem hồ sơ
              - 'row "Thu gom rác thải Urgent 68 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #49" [ref=e300]':
                - rowheader [ref=e301]:
                  - article [ref=e302]:
                    - generic [ref=e303]:
                      - generic [ref=e304]: 877c1c15-ab7a-19ee-b670-20b483f68f62
                      - time [ref=e305]: 03:02 01/06/2026
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #49" [level=3] [ref=e306]'
                    - generic [ref=e307]:
                      - img [ref=e308]
                      - text: Đường Trường Lưu, Phường Long Trường
                - cell "Thu gom rác thải" [ref=e311]
                - cell "Urgent" [ref=e312]:
                  - generic [ref=e313]: Urgent
                - cell "68 ngày" [ref=e314]:
                  - generic [ref=e315]:
                    - img [ref=e316]
                    - text: 68 ngày
                - cell "Chờ duyệt" [ref=e319]:
                  - generic [ref=e320]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #49" [ref=e321]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #49" [ref=e322] [cursor=pointer]':
                    - img [ref=e323]
                    - text: Xem hồ sơ
              - 'row "Chiếu sáng công cộng Cao 69 ngày Chờ duyệt Xem và duyệt phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #50" [ref=e328]':
                - rowheader [ref=e329]:
                  - article [ref=e330]:
                    - generic [ref=e331]:
                      - generic [ref=e332]: da20a762-065a-76dc-715c-b166a58b88d7
                      - time [ref=e333]: 02:25 31/05/2026
                    - 'heading "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #50" [level=3] [ref=e334]'
                    - generic [ref=e335]:
                      - img [ref=e336]
                      - text: Đường Kha Vạn Cân, Phường Linh Xuân
                - cell "Chiếu sáng công cộng" [ref=e339]
                - cell "Cao" [ref=e340]:
                  - generic [ref=e341]: Cao
                - cell "69 ngày" [ref=e342]:
                  - generic [ref=e343]:
                    - img [ref=e344]
                    - text: 69 ngày
                - cell "Chờ duyệt" [ref=e347]:
                  - generic [ref=e348]: Chờ duyệt
                - 'cell "Xem và duyệt phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #50" [ref=e349]':
                  - 'button "Xem và duyệt phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #50" [ref=e350] [cursor=pointer]':
                    - img [ref=e351]
                    - text: Xem hồ sơ
          - generic [ref=e356]:
            - paragraph [ref=e357]:
              - text: Trang
              - strong [ref=e358]: "1"
              - text: / 1 · 6 hồ sơ
            - navigation "Phân trang hàng đợi duyệt" [ref=e359]:
              - button "Trước" [disabled]:
                - img
                - text: Trước
              - button "Sau" [disabled]:
                - text: Sau
                - img
```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { LoginPage } from '../../pages/LoginPage';
  3   | 
  4   | const interactionManagerEmail = 'xbg4623@gmail.com';
  5   | const interactionManagerPassword = '123456789';
  6   | 
  7   | const interactionsRoute = '/manager/interactions';
  8   | const approvalsRoute = '/manager/approvals';
  9   | const slaRoute = '/analytics/sla';
  10  | const sentimentRoute = '/analytics/sentiment';
  11  | const heatmapRoute = '/analytics/heatmap';
  12  | 
  13  | type PageMonitor = {
  14  |   pageErrors: string[];
  15  |   consoleErrors: string[];
  16  |   badResponses: string[];
  17  | };
  18  | 
  19  | const attachPageMonitoring = (page: Page): PageMonitor => {
  20  |   const monitor: PageMonitor = { pageErrors: [], consoleErrors: [], badResponses: [] };
  21  | 
  22  |   page.on('pageerror', (error) => monitor.pageErrors.push(error?.message || String(error)));
  23  |   page.on('console', (message) => {
  24  |     if (message.type() === 'error') {
  25  |       monitor.consoleErrors.push(message.text());
  26  |     }
  27  |   });
  28  |   page.on('response', (response) => {
  29  |     const status = response.status();
  30  |     const url = response.url();
  31  |     if (status >= 400 && /\/api\//i.test(url)) {
  32  |       monitor.badResponses.push(`${status} ${response.request().method()} ${url}`);
  33  |     }
  34  |   });
  35  | 
  36  |   return monitor;
  37  | };
  38  | 
  39  | const assertNoErrors = async (monitor: PageMonitor, context: string) => {
  40  |   const relevantPageErrors = monitor.pageErrors.filter((error) => !/Unexpected token '<'/.test(String(error)));
  41  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
  42  | 
  43  |   const consoleRelevant = monitor.consoleErrors.filter((message) => {
  44  |     if (!message) return false;
  45  |     if (/Unexpected token '<'/.test(message)) return false;
  46  |     if (/Failed to load resource: the server responded with a status of 405/.test(message)) return false;
  47  |     if (/\b405\b/.test(message) && /Method Not Allowed/i.test(message)) return false;
  48  |     return true;
  49  |   });
> 50  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
      |                                                                    ^ Error: Approval inbox: unexpected console errors
  51  | 
  52  |   const badRelevant = monitor.badResponses.filter((entry) => !/\b405\b/.test(entry));
  53  |   expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
  54  | };
  55  | 
  56  | const loginAsInteractionManager = async (page: Page) => {
  57  |   await page.goto('/login');
  58  |   const loginPage = new LoginPage(page);
  59  |   await loginPage.login(interactionManagerEmail, interactionManagerPassword);
  60  |   await page.waitForLoadState('networkidle');
  61  |   await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  62  |   await page.waitForSelector('.admin-page-hero, .admin-hero-title, .dashboard-shell, header', { timeout: 30000 }).catch(() => undefined);
  63  | };
  64  | 
  65  | const verifyRouteAndPage = async (page: Page, route: string, locator: string | ReturnType<Page['locator']>, description: string) => {
  66  |   await page.goto(route);
  67  |   await page.waitForLoadState('networkidle');
  68  | 
  69  |   if (typeof locator === 'string') {
  70  |     await expect(page.locator(locator)).toBeVisible({ timeout: 15000 });
  71  |   } else {
  72  |     await expect(locator).toBeVisible({ timeout: 15000 });
  73  |   }
  74  | 
  75  |   const currentPath = new URL(page.url()).pathname;
  76  |   expect(currentPath.includes(route), `${description} route did not resolve to ${route}`).toBeTruthy();
  77  | };
  78  | 
  79  | test.describe.serial('Interaction Manager smoke tests', () => {
  80  |   test.setTimeout(120000);
  81  | 
  82  |   test('Login successfully and open interaction monitoring', async ({ page }) => {
  83  |     const monitor = attachPageMonitoring(page);
  84  | 
  85  |     await loginAsInteractionManager(page);
  86  | 
  87  |     await verifyRouteAndPage(
  88  |       page,
  89  |       interactionsRoute,
  90  |       page.getByRole('heading', { name: /Giám sát luồng tương tác|Luồng tương tác/i }).first(),
  91  |       'interaction monitoring'
  92  |     );
  93  | 
  94  |     await assertNoErrors(monitor, 'Interaction monitoring');
  95  |   });
  96  | 
  97  |   test('Open approval inbox', async ({ page }) => {
  98  |     const monitor = attachPageMonitoring(page);
  99  | 
  100 |     await loginAsInteractionManager(page);
  101 |     await verifyRouteAndPage(
  102 |       page,
  103 |       approvalsRoute,
  104 |       page.getByRole('heading', { name: /Hàng đợi duyệt kết quả|Hàng đợi duyệt/i }).first(),
  105 |       'approval inbox'
  106 |     );
  107 | 
  108 |     await assertNoErrors(monitor, 'Approval inbox');
  109 |   });
  110 | 
  111 |   test('Open approval detail from first available item', async ({ page }) => {
  112 |     const monitor = attachPageMonitoring(page);
  113 | 
  114 |     await loginAsInteractionManager(page);
  115 |     await page.goto(approvalsRoute);
  116 |     await page.waitForLoadState('networkidle');
  117 | 
  118 |     const rowCount = await page.locator('table tbody tr').count();
  119 |     if (rowCount === 0) {
  120 |       console.log('No approval items available — skipping detail check.');
  121 |       return;
  122 |     }
  123 | 
  124 |     const firstRow = page.locator('table tbody tr').first();
  125 |     await expect(firstRow).toBeVisible({ timeout: 20000 });
  126 | 
  127 |     const approvalButton = firstRow.locator('button:has-text("Xem hồ sơ"), button:has-text("View"), button:has-text("Open")').first();
  128 |     await expect(approvalButton).toBeVisible({ timeout: 15000 });
  129 |     await approvalButton.click();
  130 |     await page.waitForURL(/\/manager\/approvals\/[A-Za-z0-9_-]+/, { timeout: 30000 });
  131 | 
  132 |     await expect(page.getByRole('heading', { name: /Nội dung phản ánh|Chi tiết phản ánh|Không tìm thấy hồ sơ/i }).first()).toBeVisible({ timeout: 15000 });
  133 |     await expect(page.getByRole('button', { name: /Quay lại/i })).toBeVisible({ timeout: 15000 });
  134 |     await assertNoErrors(monitor, 'Approval detail');
  135 |   });
  136 | 
  137 |   test('Open SLA analytics dashboard', async ({ page }) => {
  138 |     const monitor = attachPageMonitoring(page);
  139 | 
  140 |     await loginAsInteractionManager(page);
  141 |     await verifyRouteAndPage(
  142 |       page,
  143 |       slaRoute,
  144 |       page.getByRole('heading', { name: /Chỉ số SLA dịch vụ|SLA/i }).first(),
  145 |       'SLA analytics'
  146 |     );
  147 | 
  148 |     await assertNoErrors(monitor, 'SLA analytics');
  149 |   });
  150 | 
```