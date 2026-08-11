# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Login successfully and open dashboard
- Location: tests\smoke\service-user\service-user.spec.ts:92:3

# Error details

```
Error: Dashboard: unexpected uncaught page errors

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
- generic [ref=e3]:
  - banner [ref=e4]:
    - navigation "Điều hướng UrbanMind" [ref=e5]:
      - link "UrbanMind - Trang chủ" [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e8]
        - generic [ref=e13]:
          - strong [ref=e14]: UrbanMind
          - generic [ref=e15]: Cổng phản ánh đô thị
      - list [ref=e16]:
        - listitem [ref=e17]:
          - link "Trang chủ" [ref=e18] [cursor=pointer]:
            - /url: /
        - listitem [ref=e19]:
          - link "Phản ánh của tôi" [ref=e20] [cursor=pointer]:
            - /url: /tickets
        - listitem [ref=e21]:
          - link "Bảng tin" [ref=e22] [cursor=pointer]:
            - /url: /community/feed
        - listitem [ref=e23]:
          - link "Bản đồ sự cố" [ref=e24] [cursor=pointer]:
            - /url: /community/map
      - generic [ref=e25]:
        - link "Gửi phản ánh" [ref=e26] [cursor=pointer]:
          - /url: /tickets/create
          - img [ref=e27]
          - text: Gửi phản ánh
        - button "Chuyển sang giao diện tối" [ref=e30]:
          - img [ref=e31]
        - button "Thông báo, 24 chưa đọc" [ref=e34]:
          - img [ref=e35]
          - generic [ref=e38]: "24"
        - group [ref=e39]:
          - generic "N Nguyen Huu Giau" [ref=e40] [cursor=pointer]:
            - generic [ref=e41]: "N"
            - generic [ref=e42]: Nguyen Huu Giau
            - img [ref=e43]
  - main [ref=e47]:
    - region "Biết điều gì đang diễn ra. Gửi đúng nơi, theo dõi đến cùng." [ref=e48]:
      - generic:
        - img
      - generic [ref=e49]:
        - generic [ref=e50]:
          - generic [ref=e51]:
            - img [ref=e52]
            - text: Cổng thông tin phản ánh đô thị
          - heading "Biết điều gì đang diễn ra. Gửi đúng nơi, theo dõi đến cùng." [level=1] [ref=e60]:
            - text: Biết điều gì đang diễn ra.
            - generic [ref=e61]: Gửi đúng nơi, theo dõi đến cùng.
          - paragraph [ref=e62]: UrbanMind tập trung phản ánh cộng đồng, dữ liệu bản đồ và tiến độ xử lý trong một cổng thông tin rõ ràng — để người dân dễ xem, dễ gửi và dễ theo dõi.
          - generic [ref=e63]:
            - link "Gửi phản ánh ngay" [ref=e64] [cursor=pointer]:
              - /url: /tickets/create
              - img [ref=e65]
              - text: Gửi phản ánh ngay
            - link "Xem bảng tin công khai" [ref=e69] [cursor=pointer]:
              - /url: /community/feed
              - img [ref=e70]
              - text: Xem bảng tin công khai
          - list [ref=e75]:
            - listitem [ref=e76]:
              - img [ref=e78]
              - text: Bảng tin và bản đồ xem công khai
            - listitem [ref=e81]:
              - img [ref=e83]
              - text: Sẵn sàng gửi và theo dõi
        - complementary "Tổng quan dữ liệu phản ánh công khai" [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]:
              - paragraph [ref=e89]: Dữ liệu cộng đồng
              - heading "Tổng quan đô thị gần đây" [level=2] [ref=e90]
            - generic [ref=e91]: Dữ liệu trực tiếp
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e95]:
                - generic:
                  - generic:
                    - button [ref=e96] [cursor=pointer]
                    - button [ref=e99] [cursor=pointer]
                    - button [ref=e102] [cursor=pointer]
                    - button [ref=e105] [cursor=pointer]
                    - button [ref=e108] [cursor=pointer]
                    - button [ref=e111] [cursor=pointer]
                    - button [ref=e114] [cursor=pointer]
                    - button [ref=e117] [cursor=pointer]
                    - button "2" [ref=e120] [cursor=pointer]:
                      - generic [ref=e121]: "2"
                    - button [ref=e122] [cursor=pointer]
                - generic:
                  - generic [ref=e125]:
                    - button "Zoom in" [ref=e126] [cursor=pointer]: +
                    - button "Zoom out" [ref=e127] [cursor=pointer]: −
                  - generic [ref=e128]:
                    - link "Leaflet" [ref=e129] [cursor=pointer]:
                      - /url: https://leafletjs.com
                      - img [ref=e130]
                      - text: Leaflet
                    - text: "| © OpenStreetMap contributors"
              - generic: 11 điểm đang hiển thị
              - link "Mở bản đồ" [ref=e134] [cursor=pointer]:
                - /url: /community/map#incident-map
                - text: Mở bản đồ
                - img [ref=e135]
              - generic:
                - generic:
                  - generic: Công khai
                  - strong: "11"
                - generic:
                  - generic: Đang xử lý
                  - strong: "9"
                - generic:
                  - generic: Đã kết thúc
                  - strong: "2"
            - generic [ref=e138]:
              - generic [ref=e139]:
                - generic [ref=e140]: Mới cập nhật
                - img [ref=e141]
              - generic [ref=e147]:
                - link "Đang xử lý Đèn đường bị hư trên đường Lò Lu Chiếu sáng công cộng" [ref=e148] [cursor=pointer]:
                  - /url: /community/feed/45e9f903-0e74-4ad6-93ab-2643d893848e
                  - generic [ref=e149]:
                    - generic [ref=e150]: Đang xử lý
                    - img [ref=e152]
                  - heading "Đèn đường bị hư trên đường Lò Lu" [level=3] [ref=e154]
                  - paragraph [ref=e155]:
                    - img [ref=e156]
                    - text: Chiếu sáng công cộng
                - link "Đã xác minh Đèn đường hư trên đường Võ Văn Hát Chiếu sáng công cộng" [ref=e160] [cursor=pointer]:
                  - /url: /community/feed/d5e678eb-5ca9-4041-bedb-f3f0177678f3
                  - generic [ref=e161]:
                    - generic [ref=e162]: Đã xác minh
                    - img [ref=e164]
                  - heading "Đèn đường hư trên đường Võ Văn Hát" [level=3] [ref=e166]
                  - paragraph [ref=e167]:
                    - img [ref=e168]
                    - text: Chiếu sáng công cộng
              - link "Xem toàn bộ bảng tin" [ref=e172] [cursor=pointer]:
                - /url: /community/feed
                - text: Xem toàn bộ bảng tin
                - img [ref=e173]
    - region "Truy cập nhanh" [ref=e176]:
      - generic:
        - img
      - generic [ref=e177]:
        - link "Gửi phản ánh mới Ghi nhận vấn đề bằng hình ảnh, vị trí và mô tả rõ ràng." [ref=e178] [cursor=pointer]:
          - /url: /tickets/create
          - img [ref=e180]
          - generic [ref=e184]:
            - strong [ref=e185]: Gửi phản ánh mới
            - generic [ref=e186]: Ghi nhận vấn đề bằng hình ảnh, vị trí và mô tả rõ ràng.
          - img [ref=e187]
        - link "Theo dõi phản ánh của tôi Xem trạng thái tiếp nhận, xử lý và kết quả mới nhất." [ref=e190] [cursor=pointer]:
          - /url: /tickets
          - img [ref=e192]
          - generic [ref=e198]:
            - strong [ref=e199]: Theo dõi phản ánh của tôi
            - generic [ref=e200]: Xem trạng thái tiếp nhận, xử lý và kết quả mới nhất.
          - img [ref=e201]
        - link "Xem bản đồ công khai Khám phá phản ánh theo vị trí và khu vực quan tâm." [ref=e204] [cursor=pointer]:
          - /url: /community/map
          - img [ref=e206]
          - generic [ref=e210]:
            - strong [ref=e211]: Xem bản đồ công khai
            - generic [ref=e212]: Khám phá phản ánh theo vị trí và khu vực quan tâm.
          - img [ref=e213]
    - region "Phản ánh mới được cập nhật" [ref=e216]:
      - generic:
        - img
      - generic [ref=e218]:
        - generic [ref=e219]:
          - generic [ref=e220]:
            - paragraph [ref=e221]: Cập nhật từ cộng đồng
            - heading "Phản ánh mới được cập nhật" [level=2] [ref=e222]
            - paragraph [ref=e223]: Theo dõi những vấn đề đô thị mới được cộng đồng ghi nhận và cập nhật.
          - link "Xem tất cả phản ánh" [ref=e224] [cursor=pointer]:
            - /url: /community/feed
            - text: Xem tất cả phản ánh
            - img [ref=e225]
        - generic [ref=e229]:
          - article [ref=e230]:
            - generic [ref=e231]:
              - generic [ref=e232]:
                - img [ref=e233]
                - img [ref=e239]
              - generic [ref=e242]: Đã phân công
            - generic [ref=e243]:
              - generic [ref=e244]:
                - generic [ref=e245]: Thu gom rác thải
                - time [ref=e246]: 3 ngày trước
              - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [level=3] [ref=e247]'
              - paragraph [ref=e248]: Người dân phản ánh tình trạng rác thải tại Khu dân cư Đông Tăng Long, Phường Long Trường. Rác tồn đọng gây mùi hôi, ảnh hưởng vệ sinh môi trường và đời sống khu dân cư.
              - generic [ref=e249]:
                - generic [ref=e250]:
                  - img [ref=e251]
                  - generic [ref=e254]: Phường Long Trường
                - generic [ref=e255]:
                  - generic [ref=e256]:
                    - img [ref=e257]
                    - text: "0"
                  - generic [ref=e259]:
                    - img [ref=e260]
                    - text: "0"
              - link "Xem chi tiết phản ánh" [ref=e262] [cursor=pointer]:
                - /url: /community/feed/12456a5d-0c1e-0261-5433-cdb1527a7e00
                - text: Xem chi tiết phản ánh
                - img [ref=e263]
          - article [ref=e266]:
            - generic [ref=e267]:
              - generic [ref=e268]:
                - img [ref=e269]
                - img [ref=e275]
              - generic [ref=e278]: Đang xử lý
            - generic [ref=e279]:
              - generic [ref=e280]:
                - generic [ref=e281]: Cấp nước
                - time [ref=e282]: 4 ngày trước
              - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #28" [level=3] [ref=e283]'
              - paragraph [ref=e284]: Hệ thống cấp nước tại Khu vực Chợ Long Trường, Phường Long Trường có dấu hiệu bất thường. Đề nghị đơn vị phụ trách kiểm tra đường ống và xử lý sớm.
              - generic [ref=e285]:
                - generic [ref=e286]:
                  - img [ref=e287]
                  - generic [ref=e290]: Phường Long Trường
                - generic [ref=e291]:
                  - generic [ref=e292]:
                    - img [ref=e293]
                    - text: "0"
                  - generic [ref=e295]:
                    - img [ref=e296]
                    - text: "0"
              - link "Xem chi tiết phản ánh" [ref=e298] [cursor=pointer]:
                - /url: /community/feed/cd4bdafe-1cfc-d219-b2ab-38e086f6d4bd
                - text: Xem chi tiết phản ánh
                - img [ref=e299]
          - article [ref=e302]:
            - generic [ref=e303]:
              - generic [ref=e304]:
                - img [ref=e305]
                - img [ref=e311]
              - generic [ref=e314]: Đã xác minh
            - generic [ref=e315]:
              - generic [ref=e316]:
                - generic [ref=e317]: Cấp nước
                - time [ref=e318]: 4 ngày trước
              - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #10" [level=3] [ref=e319]'
              - paragraph [ref=e320]: Hệ thống cấp nước tại Đường Nguyễn Duy Trinh, Phường Long Trường có dấu hiệu bất thường. Đề nghị đơn vị phụ trách kiểm tra đường ống và xử lý sớm.
              - generic [ref=e321]:
                - generic [ref=e322]:
                  - img [ref=e323]
                  - generic [ref=e326]: Phường Long Trường
                - generic [ref=e327]:
                  - generic [ref=e328]:
                    - img [ref=e329]
                    - text: "0"
                  - generic [ref=e331]:
                    - img [ref=e332]
                    - text: "0"
              - link "Xem chi tiết phản ánh" [ref=e334] [cursor=pointer]:
                - /url: /community/feed/0bcd2858-5b55-2736-8f20-62116f7da281
                - text: Xem chi tiết phản ánh
                - img [ref=e335]
          - article [ref=e338]:
            - generic [ref=e339]:
              - generic [ref=e340]:
                - img [ref=e341]
                - img [ref=e347]
              - generic [ref=e356]: Đã phân công
            - generic [ref=e357]:
              - generic [ref=e358]:
                - generic [ref=e359]: An toàn công cộng
                - time [ref=e360]: 5 ngày trước
              - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [level=3] [ref=e361]'
              - paragraph [ref=e362]: Người dân phát hiện nguy cơ mất an toàn tại Khu vực Chợ Long Phước, Phường Long Phước. Đề nghị cơ quan chức năng kiểm tra và có biện pháp xử lý kịp thời.
              - generic [ref=e363]:
                - generic [ref=e364]:
                  - img [ref=e365]
                  - generic [ref=e368]: Phường Long Phước
                - generic [ref=e369]:
                  - generic [ref=e370]:
                    - img [ref=e371]
                    - text: "0"
                  - generic [ref=e373]:
                    - img [ref=e374]
                    - text: "0"
              - link "Xem chi tiết phản ánh" [ref=e376] [cursor=pointer]:
                - /url: /community/feed/d0e91afc-81b4-cdab-659f-b015a0a54a26
                - text: Xem chi tiết phản ánh
                - img [ref=e377]
    - region "Từ thông tin của người dân đến kết quả xử lý" [ref=e380]:
      - generic:
        - img
      - generic [ref=e381]:
        - generic [ref=e382]:
          - paragraph [ref=e383]: Một quy trình rõ ràng
          - heading "Từ thông tin của người dân đến kết quả xử lý" [level=2] [ref=e384]
          - paragraph [ref=e385]: Mỗi bước được trình bày minh bạch để người gửi biết phản ánh đang ở đâu trong quy trình.
        - list [ref=e386]:
          - listitem [ref=e388]:
            - generic [ref=e389]:
              - img [ref=e391]
              - generic [ref=e397]: "01"
            - heading "Ghi nhận thông tin" [level=3] [ref=e398]
            - paragraph [ref=e399]: Chụp ảnh, mô tả vấn đề và xác định vị trí xảy ra sự cố.
          - listitem [ref=e400]:
            - generic [ref=e401]:
              - img [ref=e403]
              - generic [ref=e407]: "02"
            - heading "Tiếp nhận và phân luồng" [level=3] [ref=e408]
            - paragraph [ref=e409]: Thông tin được kiểm tra và chuyển đến luồng xử lý phù hợp.
          - listitem [ref=e410]:
            - generic [ref=e411]:
              - img [ref=e413]
              - generic [ref=e416]: "03"
            - heading "Theo dõi đến kết quả" [level=3] [ref=e417]
            - paragraph [ref=e418]: Người dân xem tiến độ, kết quả và các cập nhật liên quan.
    - generic [ref=e419]:
      - generic:
        - img
      - generic [ref=e420]:
        - generic [ref=e421]:
          - paragraph [ref=e422]: Bắt đầu từ một phản ánh rõ ràng
          - heading "Gửi thông tin, theo dõi tiến độ và cùng cải thiện khu vực sống." [level=2] [ref=e423]
        - link "Gửi phản ánh mới" [ref=e424] [cursor=pointer]:
          - /url: /tickets/create
          - text: Gửi phản ánh mới
          - img [ref=e425]
  - contentinfo [ref=e428]:
    - generic:
      - img
    - generic [ref=e429]:
      - generic [ref=e430]:
        - region "UrbanMind" [ref=e431]:
          - generic [ref=e432]:
            - img [ref=e434]
            - generic [ref=e438]:
              - heading "UrbanMind" [level=2] [ref=e439]
              - paragraph [ref=e440]: Cổng thông tin phản ánh đô thị
          - paragraph [ref=e441]: Kết nối thông tin từ cộng đồng với quy trình tiếp nhận, theo dõi và cập nhật kết quả xử lý minh bạch.
        - navigation "Khám phá UrbanMind" [ref=e442]:
          - heading "Khám phá" [level=2] [ref=e443]
          - list [ref=e444]:
            - listitem [ref=e445]:
              - link "Bảng tin cộng đồng" [ref=e446] [cursor=pointer]:
                - /url: /community/feed
            - listitem [ref=e447]:
              - link "Bản đồ phản ánh" [ref=e448] [cursor=pointer]:
                - /url: /community/map
            - listitem [ref=e449]:
              - link "Giới thiệu nền tảng" [ref=e450] [cursor=pointer]:
                - /url: /about
        - navigation "Thao tác tài khoản" [ref=e451]:
          - heading "Tài khoản" [level=2] [ref=e452]
          - list [ref=e453]:
            - listitem [ref=e454]:
              - link "Phản ánh của tôi" [ref=e455] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=e456]:
              - link "Trang cá nhân" [ref=e457] [cursor=pointer]:
                - /url: /profile
            - listitem [ref=e458]:
              - link "Gửi phản ánh mới" [ref=e459] [cursor=pointer]:
                - /url: /tickets/create
      - generic [ref=e460]:
        - paragraph [ref=e461]: © 2026 UrbanMind. Vì một đô thị dễ sống hơn.
        - paragraph [ref=e462]:
          - img [ref=e463]
          - text: Thông tin công khai được hiển thị theo phạm vi cho phép.
  - button "Mở trợ lý AI" [ref=e466]:
    - img [ref=e467]
  - generic [ref=e473]:
    - generic [ref=e474]:
      - generic [ref=e475]:
        - img [ref=e476]
        - generic [ref=e481]:
          - heading "UrbanMind AI Copilot" [level=3] [ref=e482]
          - paragraph [ref=e483]: Tư vấn pháp lý & phản ánh đô thị
      - button "Đóng cửa sổ trợ lý" [ref=e484] [cursor=pointer]:
        - img [ref=e485]
    - generic [ref=e488]:
      - generic [ref=e489]:
        - generic [ref=e490]: Hội thoại của tôi
        - button "Chat mới" [ref=e491] [cursor=pointer]
      - generic [ref=e493]: Chưa có hội thoại cũ.
    - generic [ref=e495]:
      - img [ref=e498]
      - generic [ref=e513]: Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?
    - button "Tạo phản ánh bằng AI" [ref=e515] [cursor=pointer]:
      - img [ref=e516]
      - text: Tạo phản ánh bằng AI
      - img [ref=e521]
    - generic [ref=e523]:
      - textbox "Hỏi AI" [ref=e524]:
        - /placeholder: Hỏi AI về luật, thủ tục phản ánh...
      - button "Gửi tin nhắn" [ref=e525] [cursor=pointer]:
        - img [ref=e526]
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
      |                                                                             ^ Error: Dashboard: unexpected uncaught page errors
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