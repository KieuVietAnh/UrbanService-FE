# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\map.spec.ts >> Map view >> Map loads and markers are clickable
- Location: tests\smoke\map.spec.ts:53:3

# Error details

```
TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 9654.59599999999ms exceeded.
Call log:
  - attempting scroll into view action
    - waiting for element to be stable

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - banner [ref=e6]:
        - generic [ref=e7]:
          - link "Về trang chủ UrbanMind" [ref=e8]:
            - /url: /dashboard
            - img [ref=e10]
            - generic [ref=e14]:
              - strong [ref=e15]: UrbanMind
              - generic [ref=e16]: Cổng phản ánh đô thị
          - navigation "Điều hướng người dân" [ref=e17]:
            - link "Trang chủ" [ref=e18]:
              - /url: /dashboard
            - link "Phản ánh của tôi" [ref=e19]:
              - /url: /tickets
            - link "Bảng tin" [ref=e20]:
              - /url: /community/feed
            - link "Bản đồ sự cố" [ref=e21]:
              - /url: /community/map
          - generic [ref=e22]:
            - link "Gửi phản ánh" [ref=e23]:
              - /url: /tickets/create
              - img [ref=e24]
              - text: Gửi phản ánh
            - button "Toggle theme" [ref=e25]:
              - img [ref=e26]
            - button "Thông báo" [ref=e29] [cursor=pointer]:
              - img [ref=e31]
            - button "Mở menu tài khoản" [ref=e35]:
              - generic [ref=e37]: TU
      - main [ref=e38]:
        - generic [ref=e39]:
          - main [ref=e41]:
            - region "Bản đồ sự cố đô thị" [ref=e42]:
              - generic:
                - img
                - generic:
                  - img
                - generic:
                  - img
                - generic:
                  - img
              - generic [ref=e43]:
                - generic [ref=e44]:
                  - img [ref=e47]
                  - heading "Bản đồ sự cố đô thị" [level=1] [ref=e52]
                  - paragraph [ref=e53]: Theo dõi vị trí các phản ánh công khai và quan sát tình hình sự cố đô thị theo từng khu vực.
                  - generic [ref=e54]:
                    - generic [ref=e55]:
                      - img [ref=e56]
                      - text: Cập nhật theo dữ liệu công khai
                    - generic [ref=e62]:
                      - img [ref=e63]
                      - text: Chọn marker để xem chi tiết
                - generic "Lọc nhanh điểm trên bản đồ" [ref=e69]:
                  - button "Tổng phản ánh 1 Hiện toàn bộ marker" [pressed] [ref=e70]:
                    - term [ref=e71]:
                      - text: Tổng phản ánh
                      - img [ref=e72]
                    - definition [ref=e76]: "1"
                    - generic [ref=e77]: Hiện toàn bộ marker
                  - button "Đang xử lý 1 Chỉ hiện điểm đang xử lý" [ref=e78]:
                    - term [ref=e79]:
                      - text: Đang xử lý
                      - img [ref=e80]
                    - definition [ref=e82]: "1"
                    - generic [ref=e83]: Chỉ hiện điểm đang xử lý
                  - button "Đã kết thúc 0 Chỉ hiện hồ sơ đã đóng" [ref=e84]:
                    - term [ref=e85]:
                      - text: Đã kết thúc
                      - img [ref=e86]
                    - definition [ref=e89]: "0"
                    - generic [ref=e90]: Chỉ hiện hồ sơ đã đóng
                  - button "Có tọa độ 1 Fit lại toàn bộ điểm hợp lệ" [ref=e91]:
                    - term [ref=e92]:
                      - text: Có tọa độ
                      - img [ref=e93]
                    - definition [ref=e95]: "1"
                    - generic [ref=e96]: Fit lại toàn bộ điểm hợp lệ
            - region "Phân bố phản ánh trên bản đồ" [ref=e97]:
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - heading "Phân bố phản ánh trên bản đồ" [level=2] [ref=e100]
                  - paragraph [ref=e101]: Phóng to, thu nhỏ hoặc chọn marker để xem thông tin sự cố.
                - generic [ref=e102]:
                  - img [ref=e103]
                  - text: 1 điểm · Tất cả phản ánh
              - generic [ref=e109]:
                - button "Marker" [ref=e110] [cursor=pointer]
                - generic:
                  - generic [ref=e111]:
                    - button "Zoom in" [ref=e112]: +
                    - button "Zoom out" [ref=e113]: −
                  - generic [ref=e114]:
                    - link "Leaflet" [ref=e115]:
                      - /url: https://leafletjs.com
                      - img [ref=e116]
                      - text: Leaflet
                    - text: "| ©"
                    - link "OpenStreetMap" [ref=e120]:
                      - /url: https://www.openstreetmap.org/copyright
                    - text: contributors
            - generic [ref=e121]:
              - article [ref=e122]:
                - generic [ref=e123]:
                  - img [ref=e125]
                  - generic [ref=e131]:
                    - heading "Cách sử dụng bản đồ" [level=2] [ref=e132]
                    - paragraph [ref=e133]: Một vài thao tác cơ bản giúp bạn theo dõi sự cố nhanh hơn.
                - list [ref=e134]:
                  - listitem [ref=e135]:
                    - img [ref=e137]
                    - paragraph [ref=e140]: Chọn marker
                    - paragraph [ref=e141]: Xem nhanh thông tin phản ánh tại vị trí đã chọn.
                  - listitem [ref=e142]:
                    - img [ref=e144]
                    - paragraph [ref=e147]: Thu phóng bản đồ
                    - paragraph [ref=e148]: Quan sát tổng thể hoặc đi sâu vào một khu vực cụ thể.
                  - listitem [ref=e149]:
                    - img [ref=e151]
                    - paragraph [ref=e155]: Mở phản ánh
                    - paragraph [ref=e156]: Truy cập trang chi tiết khi popup marker cung cấp liên kết.
              - complementary [ref=e157]:
                - img [ref=e159]
                - heading "Dữ liệu hiển thị" [level=2] [ref=e161]
                - paragraph [ref=e162]: Bản đồ chỉ hiển thị các phản ánh công khai có tọa độ hợp lệ. Số lượng điểm có thể thấp hơn tổng số phản ánh.
          - generic [ref=e165]:
            - generic [ref=e166]:
              - img [ref=e168]
              - generic [ref=e172]:
                - paragraph [ref=e173]: UrbanMind
                - paragraph [ref=e174]: © 2026 Cổng phản ánh đô thị
            - navigation "Thông tin pháp lý và hỗ trợ" [ref=e175]:
              - link "Chính sách riêng tư" [ref=e176]:
                - /url: "#privacy"
              - link "Điều khoản sử dụng" [ref=e177]:
                - /url: "#terms"
              - link "Hỗ trợ" [ref=e178]:
                - /url: mailto:support@urbanmind.vn
                - img [ref=e179]
                - text: Hỗ trợ
    - button "Mở trợ lý AI" [ref=e186]:
      - img [ref=e187]
    - generic [ref=e191]:
      - generic [ref=e192]:
        - generic [ref=e193]:
          - img [ref=e194]
          - generic [ref=e197]:
            - heading "UrbanMind AI Copilot" [level=3] [ref=e198]
            - paragraph [ref=e199]: Tư vấn pháp lý & phản ánh đô thị
        - button "Đóng cửa sổ trợ lý" [ref=e200] [cursor=pointer]:
          - img [ref=e201]
      - generic [ref=e205]:
        - img [ref=e208]
        - generic [ref=e211]: Chào bạn! Tôi là UrbanMind Assist — trợ giúp bạn điều hướng quy trình phản ánh và giám sát vận hành đô thị. Bạn cần hỗ trợ gì hôm nay?
      - generic [ref=e212]:
        - generic [ref=e213]: "Gợi ý câu hỏi nhanh:"
        - button "Mức phạt vứt rác?" [ref=e214] [cursor=pointer]
        - button "SLA sửa đèn đường?" [ref=e215] [cursor=pointer]
        - button "Báo mất nắp hố ga?" [ref=e216] [cursor=pointer]
      - generic [ref=e217]:
        - textbox "Hỏi AI" [ref=e218]:
          - /placeholder: Hỏi AI về luật, thủ tục phản ánh...
        - button "Gửi tin nhắn" [ref=e219] [cursor=pointer]:
          - img [ref=e220]
  - alertdialog "Phiên đăng nhập đã hết hạn" [ref=e223]:
    - generic [ref=e224]:
      - img [ref=e226]
      - heading "Phiên đăng nhập đã hết hạn" [level=2] [ref=e229]
      - paragraph [ref=e230]: Hệ thống không thể gia hạn phiên làm việc của bạn. Vui lòng đăng nhập lại để tiếp tục. Sau khi đăng nhập, bạn sẽ được đưa về đúng trang đang sử dụng.
      - generic [ref=e231]:
        - img [ref=e232]
        - paragraph [ref=e235]: Đây là biện pháp bảo mật khi cả access token và refresh token không còn hợp lệ.
    - contentinfo [ref=e236]:
      - button "Đăng nhập lại" [active] [ref=e237] [cursor=pointer]:
        - img [ref=e238]
        - text: Đăng nhập lại
```

# Test source

```ts
  1  | import { Page } from '@playwright/test';
  2  | import { BasePage } from '../utils/basePage';
  3  | 
  4  | export class MapPage extends BasePage {
  5  |   readonly leafletContainer;
  6  |   readonly markerLayer;
  7  |   readonly mapContainer;
  8  |   readonly spinner;
  9  |   readonly loadingState;
  10 |   readonly emptyStateCard;
  11 | 
  12 |   constructor(page: Page) {
  13 |     super(page);
  14 |     this.leafletContainer = page.locator('.leaflet-container');
  15 |     this.markerLayer = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
  16 |     this.mapContainer = page.locator('.leaflet-container');
  17 |     this.spinner = page.locator('.loading-spinner, .loading.loading-spinner');
  18 |     this.loadingState = page.getByTestId('community-map-loading');
  19 |     this.emptyStateCard = page.getByTestId('community-map-empty-state');
  20 |   }
  21 | 
  22 |   async expectMapLoaded() {
  23 |     await this.page.waitForLoadState('domcontentloaded');
  24 | 
  25 |     await this.leafletContainer.waitFor({
  26 |       state: 'visible',
  27 |       timeout: 30000,
  28 |     });
  29 | 
  30 |     await this.markerLayer.first().waitFor({
  31 |       state: 'visible',
  32 |       timeout: 30000,
  33 |     });
  34 |   }
  35 | 
  36 |   async hasMarkers() {
  37 |     return (await this.markerLayer.count()) > 0;
  38 |   }
  39 | 
  40 |   async clickFirstMarker() {
  41 |     const marker = this.markerLayer.first();
  42 |     await marker.waitFor({ state: 'visible', timeout: 20000 });
> 43 |     await marker.scrollIntoViewIfNeeded();
     |                  ^ TimeoutError: locator.scrollIntoViewIfNeeded: Timeout 9654.59599999999ms exceeded.
  44 | 
  45 |     // Leaflet markers can be flaky in CI while the map is settling or when a
  46 |     // tooltip is rendered during Playwright's hover step. Try a normal click
  47 |     // first, then fall back to a forced DOM click and a coordinate click.
  48 |     await marker.click({ force: true });
  49 | 
  50 |     if ((await this.page.locator('.leaflet-popup-content').count()) === 0) {
  51 |       await marker.dispatchEvent('click');
  52 |     }
  53 | 
  54 |     if ((await this.page.locator('.leaflet-popup-content').count()) === 0) {
  55 |       const box = await marker.boundingBox();
  56 |       if (box) {
  57 |         await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  58 |       }
  59 |     }
  60 |   }
  61 | }
  62 | 
```