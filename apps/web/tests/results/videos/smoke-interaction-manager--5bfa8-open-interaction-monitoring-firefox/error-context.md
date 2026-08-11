# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\interaction-manager\interaction-manager.spec.ts >> Interaction Manager smoke tests >> Login successfully and open interaction monitoring
- Location: tests\smoke\interaction-manager\interaction-manager.spec.ts:82:3

# Error details

```
Error: Interaction monitoring: unexpected uncaught page errors

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
          - generic [ref=e36]: Quản Lý Tương Tác
      - navigation [ref=e37]:
        - link "Tổng Quan Chỉ Số" [ref=e38] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e41]
          - generic [ref=e46]: Tổng Quan Chỉ Số
        - link "Giám Sát Tương Tác" [ref=e47] [cursor=pointer]:
          - /url: /manager/interactions
          - img [ref=e50]
          - generic [ref=e61]: Giám Sát Tương Tác
        - link "Hàng Đợi Duyệt" [ref=e62] [cursor=pointer]:
          - /url: /manager/approvals
          - img [ref=e65]
          - generic [ref=e71]: Hàng Đợi Duyệt
        - link "Phân Tích SLA" [ref=e72] [cursor=pointer]:
          - /url: /analytics/sla
          - img [ref=e75]
          - generic [ref=e80]: Phân Tích SLA
        - link "Cảm Xúc Người Dân (AI)" [ref=e81] [cursor=pointer]:
          - /url: /analytics/sentiment
          - img [ref=e84]
          - generic [ref=e89]: Cảm Xúc Người Dân (AI)
        - link "Bản Đồ Nhiệt Sự Cố" [ref=e90] [cursor=pointer]:
          - /url: /analytics/heatmap
          - img [ref=e93]
          - generic [ref=e95]: Bản Đồ Nhiệt Sự Cố
        - link "Cài Đặt" [ref=e96] [cursor=pointer]:
          - /url: /settings
          - img [ref=e99]
          - generic [ref=e102]: Cài Đặt
      - button "Đăng xuất" [ref=e104] [cursor=pointer]:
        - img [ref=e105]
        - text: Đăng xuất
  - generic [ref=e109]:
    - banner [ref=e110]:
      - navigation "Breadcrumb" [ref=e112]:
        - generic [ref=e113]:
          - link "Tổng quan hệ thống" [ref=e114] [cursor=pointer]:
            - /url: /dashboard
          - generic [ref=e115]:
            - img [ref=e116]
            - generic [ref=e118]: Giám sát tương tác
      - generic [ref=e119]:
        - button "Toggle theme" [ref=e120]:
          - img [ref=e121]
        - button "Thông báo, 3 chưa đọc" [ref=e124]:
          - img [ref=e125]
          - generic [ref=e128]: "3"
    - main [ref=e129]:
      - article [ref=e132]:
        - generic [ref=e134]:
          - generic [ref=e135]:
            - img [ref=e137]
            - generic [ref=e140]:
              - heading "Giám sát luồng tương tác" [level=1] [ref=e141]
              - paragraph [ref=e142]: Theo dõi luồng xử lý phản ánh và phát hiện điểm nghẽn dịch vụ.
          - complementary [ref=e143]:
            - button "Làm mới" [ref=e144] [cursor=pointer]:
              - img [ref=e145]
              - text: Làm mới
        - region "Tóm tắt dữ liệu đang xem" [ref=e150]:
          - article [ref=e151]:
            - generic [ref=e152]:
              - generic [ref=e153]:
                - term [ref=e154]: Kết quả phù hợp
                - definition [ref=e155]: "74"
                - definition [ref=e156]: Tổng phản ánh khớp bộ lọc máy chủ.
              - img [ref=e158]
          - article [ref=e162]:
            - generic [ref=e163]:
              - generic [ref=e164]:
                - term [ref=e165]: Đang hiển thị
                - definition [ref=e166]: "10"
                - definition [ref=e167]: Số hồ sơ sau bộ lọc ưu tiên trên trang 1.
              - img [ref=e169]
          - article [ref=e173]:
            - generic [ref=e174]:
              - generic [ref=e175]:
                - term [ref=e176]: Chờ duyệt trên trang
                - definition [ref=e177]: "1"
                - definition [ref=e178]: Hồ sơ cần Manager ra quyết định.
              - img [ref=e180]
          - article [ref=e183]:
            - generic [ref=e184]:
              - generic [ref=e185]:
                - term [ref=e186]: Tương tác trên trang
                - definition [ref=e187]: "0"
                - definition [ref=e188]: 4 hồ sơ ưu tiên cao hoặc khẩn cấp.
              - img [ref=e190]
        - region "Dòng phản ánh toàn hệ thống" [ref=e195]:
          - generic [ref=e196]:
            - generic [ref=e197]:
              - img [ref=e199]
              - generic [ref=e205]:
                - heading "Dòng phản ánh toàn hệ thống" [level=2] [ref=e206]
                - paragraph [ref=e207]: Tìm kiếm, lọc trạng thái và mức ưu tiên để theo dõi hồ sơ.
            - complementary [ref=e208]:
              - search [ref=e209]:
                - generic [ref=e210]:
                  - generic [ref=e211]: Tìm phản ánh
                  - img
                  - searchbox "Tìm phản ánh" [ref=e212]
                - group [ref=e213]:
                  - generic "Lọc theo mức ưu tiên" [ref=e214] [cursor=pointer]:
                    - img [ref=e215]
                    - generic [ref=e217]: Tất cả ưu tiên
                    - img [ref=e218]
                - group [ref=e220]:
                  - generic "Lọc theo trạng thái" [ref=e221] [cursor=pointer]:
                    - img [ref=e222]
                    - generic [ref=e226]: Tất cả trạng thái
                    - img [ref=e227]
          - table "Danh sách phản ánh và trạng thái tương tác trong hệ thống" [ref=e231]:
            - caption [ref=e232]: Danh sách phản ánh và trạng thái tương tác trong hệ thống
            - rowgroup [ref=e233]:
              - row "Phản ánh Phân loại Tương tác Ưu tiên Trạng thái Cập nhật Theo dõi" [ref=e234]:
                - columnheader "Phản ánh" [ref=e235]
                - columnheader "Phân loại" [ref=e236]
                - columnheader "Tương tác" [ref=e237]
                - columnheader "Ưu tiên" [ref=e238]
                - columnheader "Trạng thái" [ref=e239]
                - columnheader "Cập nhật" [ref=e240]
                - columnheader "Theo dõi" [ref=e241]
            - rowgroup [ref=e242]:
              - 'row "Thu gom rác thải Bình luận 0 Đồng tình 0 Urgent Đã phân công 16:56 06/08/2026 Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [ref=e243]':
                - rowheader [ref=e244]:
                  - article [ref=e245]:
                    - text: 12456a5d-0c1e-0261-5433-cdb1527a7e00
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [level=3] [ref=e246]'
                    - generic [ref=e247]:
                      - img [ref=e248]
                      - text: Khu dân cư Đông Tăng Long, Phường Long Trường
                - cell "Thu gom rác thải" [ref=e251]
                - cell "Bình luận 0 Đồng tình 0" [ref=e252]:
                  - generic [ref=e253]:
                    - generic [ref=e254]:
                      - img [ref=e255]
                      - term [ref=e257]: Bình luận
                      - definition [ref=e258]: "0"
                    - generic [ref=e259]:
                      - img [ref=e260]
                      - term [ref=e263]: Đồng tình
                      - definition [ref=e264]: "0"
                - cell "Urgent" [ref=e265]:
                  - generic [ref=e266]: Urgent
                - cell "Đã phân công" [ref=e267]:
                  - generic [ref=e268]: Đã phân công
                - cell "16:56 06/08/2026" [ref=e269]:
                  - time [ref=e270]: 16:56 06/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [ref=e271]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [ref=e272] [cursor=pointer]':
                    - img [ref=e273]
                    - text: Mở chi tiết
              - 'row "An toàn công cộng Bình luận 0 Đồng tình 0 High Không xác định 02:03 05/08/2026 Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #06" [ref=e276]':
                - rowheader [ref=e277]:
                  - article [ref=e278]:
                    - text: 0ff6eeec-2c8b-c11a-df09-ba6239e246e3
                    - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #06" [level=3] [ref=e279]'
                    - generic [ref=e280]:
                      - img [ref=e281]
                      - text: Khu dân cư Long Thuận, Phường Long Phước
                - cell "An toàn công cộng" [ref=e284]
                - cell "Bình luận 0 Đồng tình 0" [ref=e285]:
                  - generic [ref=e286]:
                    - generic [ref=e287]:
                      - img [ref=e288]
                      - term [ref=e290]: Bình luận
                      - definition [ref=e291]: "0"
                    - generic [ref=e292]:
                      - img [ref=e293]
                      - term [ref=e296]: Đồng tình
                      - definition [ref=e297]: "0"
                - cell "High" [ref=e298]:
                  - generic [ref=e299]: High
                - cell "Không xác định" [ref=e300]:
                  - generic [ref=e301]: Không xác định
                - cell "02:03 05/08/2026" [ref=e302]:
                  - time [ref=e303]: 02:03 05/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #06" [ref=e304]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #06" [ref=e305] [cursor=pointer]':
                    - img [ref=e306]
                    - text: Mở chi tiết
              - 'row "Chiếu sáng công cộng Bình luận 0 Đồng tình 0 High Đã gửi 22:16 04/08/2026 Mở chi tiết phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #02" [ref=e309]':
                - rowheader [ref=e310]:
                  - article [ref=e311]:
                    - text: b8662d80-b841-cf24-9568-76faa3409601
                    - 'heading "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #02" [level=3] [ref=e312]'
                    - generic [ref=e313]:
                      - img [ref=e314]
                      - text: Khu dân cư Linh Xuân, Phường Linh Xuân
                - cell "Chiếu sáng công cộng" [ref=e317]
                - cell "Bình luận 0 Đồng tình 0" [ref=e318]:
                  - generic [ref=e319]:
                    - generic [ref=e320]:
                      - img [ref=e321]
                      - term [ref=e323]: Bình luận
                      - definition [ref=e324]: "0"
                    - generic [ref=e325]:
                      - img [ref=e326]
                      - term [ref=e329]: Đồng tình
                      - definition [ref=e330]: "0"
                - cell "High" [ref=e331]:
                  - generic [ref=e332]: High
                - cell "Đã gửi" [ref=e333]:
                  - generic [ref=e334]: Đã gửi
                - cell "22:16 04/08/2026" [ref=e335]:
                  - time [ref=e336]: 22:16 04/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #02" [ref=e337]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Trụ đèn công cộng bị hư hỏng #02" [ref=e338] [cursor=pointer]':
                    - img [ref=e339]
                    - text: Mở chi tiết
              - 'row "Thoát nước & Ngập úng Bình luận 0 Đồng tình 0 Medium Đã gửi 11:39 04/08/2026 Mở chi tiết phản ánh [SEED-SLA] Miệng cống bị rác che kín #03" [ref=e342]':
                - rowheader [ref=e343]:
                  - article [ref=e344]:
                    - text: d983c5e5-9afa-088b-53af-023e4fc1dc48
                    - 'heading "[SEED-SLA] Miệng cống bị rác che kín #03" [level=3] [ref=e345]'
                    - generic [ref=e346]:
                      - img [ref=e347]
                      - text: Khu vực Chợ Long Phước, Phường Long Phước
                - cell "Thoát nước & Ngập úng" [ref=e350]
                - cell "Bình luận 0 Đồng tình 0" [ref=e351]:
                  - generic [ref=e352]:
                    - generic [ref=e353]:
                      - img [ref=e354]
                      - term [ref=e356]: Bình luận
                      - definition [ref=e357]: "0"
                    - generic [ref=e358]:
                      - img [ref=e359]
                      - term [ref=e362]: Đồng tình
                      - definition [ref=e363]: "0"
                - cell "Medium" [ref=e364]:
                  - generic [ref=e365]: Medium
                - cell "Đã gửi" [ref=e366]:
                  - generic [ref=e367]: Đã gửi
                - cell "11:39 04/08/2026" [ref=e368]:
                  - time [ref=e369]: 11:39 04/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Miệng cống bị rác che kín #03" [ref=e370]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Miệng cống bị rác che kín #03" [ref=e371] [cursor=pointer]':
                    - img [ref=e372]
                    - text: Mở chi tiết
              - 'row "Cấp nước Bình luận 0 Đồng tình 0 Low Đang xử lý 07:53 04/08/2026 Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #28" [ref=e375]':
                - rowheader [ref=e376]:
                  - article [ref=e377]:
                    - text: cd4bdafe-1cfc-d219-b2ab-38e086f6d4bd
                    - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #28" [level=3] [ref=e378]'
                    - generic [ref=e379]:
                      - img [ref=e380]
                      - text: Khu vực Chợ Long Trường, Phường Long Trường
                - cell "Cấp nước" [ref=e383]
                - cell "Bình luận 0 Đồng tình 0" [ref=e384]:
                  - generic [ref=e385]:
                    - generic [ref=e386]:
                      - img [ref=e387]
                      - term [ref=e389]: Bình luận
                      - definition [ref=e390]: "0"
                    - generic [ref=e391]:
                      - img [ref=e392]
                      - term [ref=e395]: Đồng tình
                      - definition [ref=e396]: "0"
                - cell "Low" [ref=e397]:
                  - generic [ref=e398]: Low
                - cell "Đang xử lý" [ref=e399]:
                  - generic [ref=e400]: Đang xử lý
                - cell "07:53 04/08/2026" [ref=e401]:
                  - time [ref=e402]: 07:53 04/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #28" [ref=e403]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #28" [ref=e404] [cursor=pointer]':
                    - img [ref=e405]
                    - text: Mở chi tiết
              - 'row "Cấp nước Bình luận 0 Đồng tình 0 High Đã xác minh 05:23 04/08/2026 Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #10" [ref=e408]':
                - rowheader [ref=e409]:
                  - article [ref=e410]:
                    - text: 0bcd2858-5b55-2736-8f20-62116f7da281
                    - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #10" [level=3] [ref=e411]'
                    - generic [ref=e412]:
                      - img [ref=e413]
                      - text: Đường Nguyễn Duy Trinh, Phường Long Trường
                - cell "Cấp nước" [ref=e416]
                - cell "Bình luận 0 Đồng tình 0" [ref=e417]:
                  - generic [ref=e418]:
                    - generic [ref=e419]:
                      - img [ref=e420]
                      - term [ref=e422]: Bình luận
                      - definition [ref=e423]: "0"
                    - generic [ref=e424]:
                      - img [ref=e425]
                      - term [ref=e428]: Đồng tình
                      - definition [ref=e429]: "0"
                - cell "High" [ref=e430]:
                  - generic [ref=e431]: High
                - cell "Đã xác minh" [ref=e432]:
                  - generic [ref=e433]: Đã xác minh
                - cell "05:23 04/08/2026" [ref=e434]:
                  - time [ref=e435]: 05:23 04/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #10" [ref=e436]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Đồng hồ nước bị hư hỏng #10" [ref=e437] [cursor=pointer]':
                    - img [ref=e438]
                    - text: Mở chi tiết
              - 'row "An toàn công cộng Bình luận 0 Đồng tình 0 High Đã phân công 06:30 03/08/2026 Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [ref=e441]':
                - rowheader [ref=e442]:
                  - article [ref=e443]:
                    - text: d0e91afc-81b4-cdab-659f-b015a0a54a26
                    - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [level=3] [ref=e444]'
                    - generic [ref=e445]:
                      - img [ref=e446]
                      - text: Khu vực Chợ Long Phước, Phường Long Phước
                - cell "An toàn công cộng" [ref=e449]
                - cell "Bình luận 0 Đồng tình 0" [ref=e450]:
                  - generic [ref=e451]:
                    - generic [ref=e452]:
                      - img [ref=e453]
                      - term [ref=e455]: Bình luận
                      - definition [ref=e456]: "0"
                    - generic [ref=e457]:
                      - img [ref=e458]
                      - term [ref=e461]: Đồng tình
                      - definition [ref=e462]: "0"
                - cell "High" [ref=e463]:
                  - generic [ref=e464]: High
                - cell "Đã phân công" [ref=e465]:
                  - generic [ref=e466]: Đã phân công
                - cell "06:30 03/08/2026" [ref=e467]:
                  - time [ref=e468]: 06:30 03/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [ref=e469]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [ref=e470] [cursor=pointer]':
                    - img [ref=e471]
                    - text: Mở chi tiết
              - 'row "Bảo trì đường bộ Bình luận 0 Đồng tình 0 Urgent Đang xử lý 07:16 03/08/2026 Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #29" [ref=e474]':
                - rowheader [ref=e475]:
                  - article [ref=e476]:
                    - text: b5e6d4d8-d6bf-0003-c699-f44cc7c198d9
                    - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #29" [level=3] [ref=e477]'
                    - generic [ref=e478]:
                      - img [ref=e479]
                      - text: Đường Quốc lộ 1K, Phường Linh Xuân
                - cell "Bảo trì đường bộ" [ref=e482]
                - cell "Bình luận 0 Đồng tình 0" [ref=e483]:
                  - generic [ref=e484]:
                    - generic [ref=e485]:
                      - img [ref=e486]
                      - term [ref=e488]: Bình luận
                      - definition [ref=e489]: "0"
                    - generic [ref=e490]:
                      - img [ref=e491]
                      - term [ref=e494]: Đồng tình
                      - definition [ref=e495]: "0"
                - cell "Urgent" [ref=e496]:
                  - generic [ref=e497]: Urgent
                - cell "Đang xử lý" [ref=e498]:
                  - generic [ref=e499]: Đang xử lý
                - cell "07:16 03/08/2026" [ref=e500]:
                  - time [ref=e501]: 07:16 03/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #29" [ref=e502]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #29" [ref=e503] [cursor=pointer]':
                    - img [ref=e504]
                    - text: Mở chi tiết
              - 'row "Bảo trì đường bộ Bình luận 0 Đồng tình 0 Medium Đã xác minh 04:46 03/08/2026 Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #11" [ref=e507]':
                - rowheader [ref=e508]:
                  - article [ref=e509]:
                    - text: 0ba7d13a-e772-68b0-9703-36d431f94ccd
                    - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #11" [level=3] [ref=e510]'
                    - generic [ref=e511]:
                      - img [ref=e512]
                      - text: Đường số 9, Phường Linh Xuân
                - cell "Bảo trì đường bộ" [ref=e515]
                - cell "Bình luận 0 Đồng tình 0" [ref=e516]:
                  - generic [ref=e517]:
                    - generic [ref=e518]:
                      - img [ref=e519]
                      - term [ref=e521]: Bình luận
                      - definition [ref=e522]: "0"
                    - generic [ref=e523]:
                      - img [ref=e524]
                      - term [ref=e527]: Đồng tình
                      - definition [ref=e528]: "0"
                - cell "Medium" [ref=e529]:
                  - generic [ref=e530]: Medium
                - cell "Đã xác minh" [ref=e531]:
                  - generic [ref=e532]: Đã xác minh
                - cell "04:46 03/08/2026" [ref=e533]:
                  - time [ref=e534]: 04:46 03/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #11" [ref=e535]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Đường giao thông cần được sửa chữa #11" [ref=e536] [cursor=pointer]':
                    - img [ref=e537]
                    - text: Mở chi tiết
              - 'row "Thu gom rác thải Bình luận 0 Đồng tình 0 Medium Chờ nghiệm thu 13:54 06/08/2026 Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e540]':
                - rowheader [ref=e541]:
                  - article [ref=e542]:
                    - text: 88176f30-6be6-4737-70e5-cdfaade2efd6
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [level=3] [ref=e543]'
                    - generic [ref=e544]:
                      - img [ref=e545]
                      - text: Đường Trường Lưu, Phường Long Trường
                - cell "Thu gom rác thải" [ref=e548]
                - cell "Bình luận 0 Đồng tình 0" [ref=e549]:
                  - generic [ref=e550]:
                    - generic [ref=e551]:
                      - img [ref=e552]
                      - term [ref=e554]: Bình luận
                      - definition [ref=e555]: "0"
                    - generic [ref=e556]:
                      - img [ref=e557]
                      - term [ref=e560]: Đồng tình
                      - definition [ref=e561]: "0"
                - cell "Medium" [ref=e562]:
                  - generic [ref=e563]: Medium
                - cell "Chờ nghiệm thu" [ref=e564]:
                  - generic [ref=e565]: Chờ nghiệm thu
                - cell "13:54 06/08/2026" [ref=e566]:
                  - time [ref=e567]: 13:54 06/08/2026
                - 'cell "Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e568]':
                  - 'button "Mở chi tiết phản ánh [SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e569] [cursor=pointer]':
                    - img [ref=e570]
                    - text: Mở chi tiết
          - generic [ref=e573]:
            - paragraph [ref=e574]:
              - text: Trang
              - strong [ref=e575]: "1"
              - text: / 8 · 74 phản ánh
            - region "Điều khiển phân trang" [ref=e576]:
              - generic [ref=e577]:
                - generic [ref=e578]: Số dòng
                - combobox "Số dòng" [ref=e579]:
                  - option "10" [selected]
                  - option "20"
                  - option "50"
              - navigation "Phân trang danh sách phản ánh" [ref=e580]:
                - button "Trước" [disabled]:
                  - img
                  - text: Trước
                - button "Sau" [ref=e581] [cursor=pointer]:
                  - text: Sau
                  - img [ref=e582]
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
> 41  |   expect(relevantPageErrors, `${context}: unexpected uncaught page errors`).toEqual([]);
      |                                                                             ^ Error: Interaction monitoring: unexpected uncaught page errors
  42  | 
  43  |   const consoleRelevant = monitor.consoleErrors.filter((message) => {
  44  |     if (!message) return false;
  45  |     if (/Unexpected token '<'/.test(message)) return false;
  46  |     if (/Failed to load resource: the server responded with a status of 405/.test(message)) return false;
  47  |     if (/\b405\b/.test(message) && /Method Not Allowed/i.test(message)) return false;
  48  |     return true;
  49  |   });
  50  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
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
```