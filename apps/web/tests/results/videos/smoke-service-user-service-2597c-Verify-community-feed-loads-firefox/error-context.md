# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\service-user\service-user.spec.ts >> Service User smoke tests >> Verify community feed loads
- Location: tests\smoke\service-user\service-user.spec.ts:138:3

# Error details

```
Error: Community feed: unexpected uncaught page errors

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
        - generic [ref=e50]:
          - generic:
            - img
            - generic:
              - img
            - generic:
              - img
            - generic:
              - img
          - generic [ref=e51]:
            - generic [ref=e52]:
              - heading "Bảng tin đô thị" [level=1] [ref=e53]
              - paragraph [ref=e54]: Theo dõi các phản ánh đã được xác minh, cùng trao đổi và giám sát tiến độ xử lý trong cộng đồng.
              - generic [ref=e56]:
                - img [ref=e57]
                - text: Cập nhật theo thời gian thực
            - generic [ref=e64]:
              - button "Tổng công khai 68 Xem toàn bộ" [ref=e65]:
                - term [ref=e66]:
                  - text: Tổng công khai
                  - img [ref=e67]
                - definition [ref=e71]: "68"
                - generic [ref=e72]: Xem toàn bộ
              - button "Đang xử lý 10 Theo dõi tiến độ" [ref=e73]:
                - term [ref=e74]:
                  - text: Đang xử lý
                  - img [ref=e75]
                - definition [ref=e77]: "10"
                - generic [ref=e78]: Theo dõi tiến độ
              - button "Đã kết thúc 0 Xem hồ sơ đã kết thúc" [ref=e79]:
                - term [ref=e80]:
                  - text: Đã kết thúc
                  - img [ref=e81]
                - definition [ref=e84]: "0"
                - generic [ref=e85]: Xem hồ sơ đã kết thúc
        - generic [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e89]:
                - tablist "Lọc bảng tin" [ref=e90]:
                  - tab "Mới nhất" [selected] [ref=e91]:
                    - img [ref=e92]
                    - text: Mới nhất
                  - tab "Được quan tâm" [ref=e95]:
                    - img [ref=e96]
                    - text: Được quan tâm
                  - tab "Gần bạn" [ref=e98]:
                    - img [ref=e99]
                    - text: Gần bạn
                  - tab "Đang xử lý" [ref=e102]:
                    - img [ref=e103]
                    - text: Đang xử lý
                  - tab "Đã kết thúc" [ref=e105]:
                    - img [ref=e106]
                    - text: Đã kết thúc
                - generic [ref=e109]:
                  - generic [ref=e110]: Tìm kiếm trong bảng tin
                  - img
                  - searchbox "Tìm kiếm trong bảng tin" [ref=e111]
              - generic [ref=e112]:
                - generic [ref=e113]: 10+ phản ánh phù hợp
                - generic [ref=e114]: Cập nhật trực tiếp
            - generic [ref=e116]:
              - article [ref=e117]:
                - generic [ref=e119]:
                  - generic [ref=e120]:
                    - generic [ref=e121]: A
                    - generic [ref=e122]:
                      - paragraph [ref=e123]: Anh
                      - generic [ref=e124]:
                        - generic [ref=e125]:
                          - img [ref=e126]
                          - generic [ref=e129]: Phường Long Trường
                        - generic [ref=e130]:
                          - img [ref=e131]
                          - text: 08:53 05/08/2026
                  - generic [ref=e134]:
                    - img [ref=e135]
                    - text: Đã chuyển xử lý
                - generic [ref=e140]:
                  - generic [ref=e142]:
                    - img [ref=e143]
                    - text: Thu gom rác thải
                  - 'button "[SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [ref=e146]':
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #01" [level=2] [ref=e147]'
                - button "Chưa có hình ảnh công khai" [ref=e149]:
                  - img [ref=e150]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e157]:
                  - generic [ref=e158]:
                    - button "Quan tâm phản ánh" [ref=e159]:
                      - img [ref=e160]
                      - generic [ref=e162]: "0"
                    - button "0" [ref=e163]:
                      - img [ref=e164]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e166]:
                    - text: Xem chi tiết
                    - img [ref=e167]
              - article [ref=e170]:
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - generic [ref=e174]: A
                    - generic [ref=e175]:
                      - paragraph [ref=e176]: Anh Kieu
                      - generic [ref=e177]:
                        - generic [ref=e178]:
                          - img [ref=e179]
                          - generic [ref=e182]: Phường Long Trường
                        - generic [ref=e183]:
                          - img [ref=e184]
                          - text: 04:53 04/08/2026
                  - generic [ref=e187]:
                    - img [ref=e188]
                    - text: Đã xác minh
                - generic [ref=e191]:
                  - generic [ref=e193]:
                    - img [ref=e194]
                    - text: Cấp nước
                  - 'button "[SEED-SLA] Đồng hồ nước bị hư hỏng #10" [ref=e197]':
                    - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #10" [level=2] [ref=e198]'
                - button "Chưa có hình ảnh công khai" [ref=e200]:
                  - img [ref=e201]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e208]:
                  - generic [ref=e209]:
                    - button "Quan tâm phản ánh" [ref=e210]:
                      - img [ref=e211]
                      - generic [ref=e213]: "0"
                    - button "0" [ref=e214]:
                      - img [ref=e215]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e217]:
                    - text: Xem chi tiết
                    - img [ref=e218]
              - article [ref=e221]:
                - generic [ref=e223]:
                  - generic [ref=e224]:
                    - generic [ref=e225]: V
                    - generic [ref=e226]:
                      - paragraph [ref=e227]: Vũ Bảo
                      - generic [ref=e228]:
                        - generic [ref=e229]:
                          - img [ref=e230]
                          - generic [ref=e233]: Phường Long Trường
                        - generic [ref=e234]:
                          - img [ref=e235]
                          - text: 04:53 04/08/2026
                  - generic [ref=e238]:
                    - img [ref=e239]
                    - text: Đang xử lý
                - generic [ref=e241]:
                  - generic [ref=e243]:
                    - img [ref=e244]
                    - text: Cấp nước
                  - 'button "[SEED-SLA] Đồng hồ nước bị hư hỏng #28" [ref=e247]':
                    - 'heading "[SEED-SLA] Đồng hồ nước bị hư hỏng #28" [level=2] [ref=e248]'
                - button "Chưa có hình ảnh công khai" [ref=e250]:
                  - img [ref=e251]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e258]:
                  - generic [ref=e259]:
                    - button "Quan tâm phản ánh" [ref=e260]:
                      - img [ref=e261]
                      - generic [ref=e263]: "0"
                    - button "0" [ref=e264]:
                      - img [ref=e265]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e267]:
                    - text: Xem chi tiết
                    - img [ref=e268]
              - article [ref=e271]:
                - generic [ref=e273]:
                  - generic [ref=e274]:
                    - generic [ref=e275]: K
                    - generic [ref=e276]:
                      - paragraph [ref=e277]: KieuVietAnh
                      - generic [ref=e278]:
                        - generic [ref=e279]:
                          - img [ref=e280]
                          - generic [ref=e283]: Phường Long Phước
                        - generic [ref=e284]:
                          - img [ref=e285]
                          - text: 05:30 03/08/2026
                  - generic [ref=e288]:
                    - img [ref=e289]
                    - text: Đã chuyển xử lý
                - generic [ref=e294]:
                  - generic [ref=e296]:
                    - img [ref=e297]
                    - text: An toàn công cộng
                  - 'button "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [ref=e300]':
                    - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #18" [level=2] [ref=e301]'
                - button "Chưa có hình ảnh công khai" [ref=e303]:
                  - img [ref=e304]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e311]:
                  - generic [ref=e312]:
                    - button "Quan tâm phản ánh" [ref=e313]:
                      - img [ref=e314]
                      - generic [ref=e316]: "0"
                    - button "0" [ref=e317]:
                      - img [ref=e318]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e320]:
                    - text: Xem chi tiết
                    - img [ref=e321]
              - article [ref=e324]:
                - generic [ref=e326]:
                  - generic [ref=e327]:
                    - generic [ref=e328]: T
                    - generic [ref=e329]:
                      - paragraph [ref=e330]: Thing Cute
                      - generic [ref=e331]:
                        - generic [ref=e332]:
                          - img [ref=e333]
                          - generic [ref=e336]: Phường Linh Xuân
                        - generic [ref=e337]:
                          - img [ref=e338]
                          - text: 04:16 03/08/2026
                  - generic [ref=e341]:
                    - img [ref=e342]
                    - text: Đã xác minh
                - generic [ref=e345]:
                  - generic [ref=e347]:
                    - img [ref=e348]
                    - text: Bảo trì đường bộ
                  - 'button "[SEED-SLA] Đường giao thông cần được sửa chữa #11" [ref=e351]':
                    - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #11" [level=2] [ref=e352]'
                - button "Chưa có hình ảnh công khai" [ref=e354]:
                  - img [ref=e355]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e362]:
                  - generic [ref=e363]:
                    - button "Quan tâm phản ánh" [ref=e364]:
                      - img [ref=e365]
                      - generic [ref=e367]: "0"
                    - button "0" [ref=e368]:
                      - img [ref=e369]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e371]:
                    - text: Xem chi tiết
                    - img [ref=e372]
              - article [ref=e375]:
                - generic [ref=e377]:
                  - generic [ref=e378]:
                    - generic [ref=e379]: V
                    - generic [ref=e380]:
                      - paragraph [ref=e381]: Văn Quốc
                      - generic [ref=e382]:
                        - generic [ref=e383]:
                          - img [ref=e384]
                          - generic [ref=e387]: Phường Linh Xuân
                        - generic [ref=e388]:
                          - img [ref=e389]
                          - text: 04:16 03/08/2026
                  - generic [ref=e392]:
                    - img [ref=e393]
                    - text: Đang xử lý
                - generic [ref=e395]:
                  - generic [ref=e397]:
                    - img [ref=e398]
                    - text: Bảo trì đường bộ
                  - 'button "[SEED-SLA] Đường giao thông cần được sửa chữa #29" [ref=e401]':
                    - 'heading "[SEED-SLA] Đường giao thông cần được sửa chữa #29" [level=2] [ref=e402]'
                - button "Chưa có hình ảnh công khai" [ref=e404]:
                  - img [ref=e405]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e412]:
                  - generic [ref=e413]:
                    - button "Quan tâm phản ánh" [ref=e414]:
                      - img [ref=e415]
                      - generic [ref=e417]: "0"
                    - button "0" [ref=e418]:
                      - img [ref=e419]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e421]:
                    - text: Xem chi tiết
                    - img [ref=e422]
              - article [ref=e425]:
                - generic [ref=e427]:
                  - generic [ref=e428]:
                    - generic [ref=e429]: M
                    - generic [ref=e430]:
                      - paragraph [ref=e431]: Mạnh Vũ Đức
                      - generic [ref=e432]:
                        - generic [ref=e433]:
                          - img [ref=e434]
                          - generic [ref=e437]: Phường Long Trường
                        - generic [ref=e438]:
                          - img [ref=e439]
                          - text: 04:53 02/08/2026
                  - generic [ref=e442]:
                    - img [ref=e443]
                    - text: Đang kiểm tra kết quả
                - generic [ref=e447]:
                  - generic [ref=e449]:
                    - img [ref=e450]
                    - text: Thu gom rác thải
                  - 'button "[SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [ref=e453]':
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #19" [level=2] [ref=e454]'
                - button "Chưa có hình ảnh công khai" [ref=e456]:
                  - img [ref=e457]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e464]:
                  - generic [ref=e465]:
                    - button "Quan tâm phản ánh" [ref=e466]:
                      - img [ref=e467]
                      - generic [ref=e469]: "0"
                    - button "0" [ref=e470]:
                      - img [ref=e471]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e473]:
                    - text: Xem chi tiết
                    - img [ref=e474]
              - article [ref=e477]:
                - generic [ref=e479]:
                  - generic [ref=e480]:
                    - generic [ref=e481]: V
                    - generic [ref=e482]:
                      - paragraph [ref=e483]: Việt Anh
                      - generic [ref=e484]:
                        - generic [ref=e485]:
                          - img [ref=e486]
                          - generic [ref=e489]: Phường Long Phước
                        - generic [ref=e490]:
                          - img [ref=e491]
                          - text: 03:39 02/08/2026
                  - generic [ref=e494]:
                    - img [ref=e495]
                    - text: Đang xử lý
                - generic [ref=e497]:
                  - generic [ref=e499]:
                    - img [ref=e500]
                    - text: An toàn công cộng
                  - 'button "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #30" [ref=e503]':
                    - 'heading "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #30" [level=2] [ref=e504]'
                - button "Chưa có hình ảnh công khai" [ref=e506]:
                  - img [ref=e507]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e514]:
                  - generic [ref=e515]:
                    - button "Quan tâm phản ánh" [ref=e516]:
                      - img [ref=e517]
                      - generic [ref=e519]: "0"
                    - button "0" [ref=e520]:
                      - img [ref=e521]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e523]:
                    - text: Xem chi tiết
                    - img [ref=e524]
              - article [ref=e527]:
                - generic [ref=e529]:
                  - generic [ref=e530]:
                    - generic [ref=e531]: M
                    - generic [ref=e532]:
                      - paragraph [ref=e533]: Mạnh Vũ Đức
                      - generic [ref=e534]:
                        - generic [ref=e535]:
                          - img [ref=e536]
                          - generic [ref=e539]: Phường Linh Xuân
                        - generic [ref=e540]:
                          - img [ref=e541]
                          - text: 04:16 01/08/2026
                  - generic [ref=e544]:
                    - img [ref=e545]
                    - text: Đã chuyển xử lý
                - generic [ref=e550]:
                  - generic [ref=e552]:
                    - img [ref=e553]
                    - text: Chiếu sáng công cộng
                  - 'button "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #20" [ref=e556]':
                    - 'heading "[SEED-SLA] Trụ đèn công cộng bị hư hỏng #20" [level=2] [ref=e557]'
                - button "Chưa có hình ảnh công khai" [ref=e559]:
                  - img [ref=e560]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e567]:
                  - generic [ref=e568]:
                    - button "Quan tâm phản ánh" [ref=e569]:
                      - img [ref=e570]
                      - generic [ref=e572]: "0"
                    - button "0" [ref=e573]:
                      - img [ref=e574]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e576]:
                    - text: Xem chi tiết
                    - img [ref=e577]
              - article [ref=e580]:
                - generic [ref=e582]:
                  - generic [ref=e583]:
                    - generic [ref=e584]: K
                    - generic [ref=e585]:
                      - paragraph [ref=e586]: KieuVietAnh
                      - generic [ref=e587]:
                        - generic [ref=e588]:
                          - img [ref=e589]
                          - generic [ref=e592]: Phường Long Trường
                        - generic [ref=e593]:
                          - img [ref=e594]
                          - text: 03:02 01/08/2026
                  - generic [ref=e597]:
                    - img [ref=e598]
                    - text: Đang xử lý
                - generic [ref=e600]:
                  - generic [ref=e602]:
                    - img [ref=e603]
                    - text: Thu gom rác thải
                  - 'button "[SEED-SLA] Điểm tập kết rác gây mùi hôi #31" [ref=e606]':
                    - 'heading "[SEED-SLA] Điểm tập kết rác gây mùi hôi #31" [level=2] [ref=e607]'
                - button "Chưa có hình ảnh công khai" [ref=e609]:
                  - img [ref=e610]
                  - text: Chưa có hình ảnh công khai
                - generic [ref=e617]:
                  - generic [ref=e618]:
                    - button "Quan tâm phản ánh" [ref=e619]:
                      - img [ref=e620]
                      - generic [ref=e622]: "0"
                    - button "0" [ref=e623]:
                      - img [ref=e624]
                      - text: "0"
                  - button "Xem chi tiết" [ref=e626]:
                    - text: Xem chi tiết
                    - img [ref=e627]
            - button "Hiện thêm phản ánh" [ref=e631] [cursor=pointer]:
              - img [ref=e632]
              - text: Hiện thêm phản ánh
          - complementary [ref=e635]:
            - generic [ref=e636]:
              - generic [ref=e637]:
                - generic [ref=e638]:
                  - heading "Được quan tâm" [level=2] [ref=e639]
                  - paragraph [ref=e640]: Phản ánh có nhiều tương tác
                - img [ref=e642]
              - list [ref=e644]:
                - listitem [ref=e645]:
                  - 'button "1 [SEED-SLA] Điểm tập kết rác gây mùi hôi #01 0 0" [ref=e646]':
                    - generic [ref=e647]: "1"
                    - generic [ref=e648]:
                      - generic [ref=e649]: "[SEED-SLA] Điểm tập kết rác gây mùi hôi #01"
                      - generic [ref=e650]:
                        - generic [ref=e651]:
                          - img [ref=e652]
                          - text: "0"
                        - generic [ref=e654]:
                          - img [ref=e655]
                          - text: "0"
                    - img [ref=e657]
                - listitem [ref=e659]:
                  - 'button "2 [SEED-SLA] Đồng hồ nước bị hư hỏng #10 0 0" [ref=e660]':
                    - generic [ref=e661]: "2"
                    - generic [ref=e662]:
                      - generic [ref=e663]: "[SEED-SLA] Đồng hồ nước bị hư hỏng #10"
                      - generic [ref=e664]:
                        - generic [ref=e665]:
                          - img [ref=e666]
                          - text: "0"
                        - generic [ref=e668]:
                          - img [ref=e669]
                          - text: "0"
                    - img [ref=e671]
                - listitem [ref=e673]:
                  - 'button "3 [SEED-SLA] Đồng hồ nước bị hư hỏng #28 0 0" [ref=e674]':
                    - generic [ref=e675]: "3"
                    - generic [ref=e676]:
                      - generic [ref=e677]: "[SEED-SLA] Đồng hồ nước bị hư hỏng #28"
                      - generic [ref=e678]:
                        - generic [ref=e679]:
                          - img [ref=e680]
                          - text: "0"
                        - generic [ref=e682]:
                          - img [ref=e683]
                          - text: "0"
                    - img [ref=e685]
                - listitem [ref=e687]:
                  - 'button "4 [SEED-SLA] Cây xanh có nguy cơ gãy đổ #18 0 0" [ref=e688]':
                    - generic [ref=e689]: "4"
                    - generic [ref=e690]:
                      - generic [ref=e691]: "[SEED-SLA] Cây xanh có nguy cơ gãy đổ #18"
                      - generic [ref=e692]:
                        - generic [ref=e693]:
                          - img [ref=e694]
                          - text: "0"
                        - generic [ref=e696]:
                          - img [ref=e697]
                          - text: "0"
                    - img [ref=e699]
            - generic [ref=e701]:
              - generic [ref=e702]:
                - img [ref=e704]
                - generic [ref=e706]:
                  - heading "Hoạt động cộng đồng" [level=2] [ref=e707]
                  - paragraph [ref=e708]: Dựa trên toàn bộ bảng tin
              - generic [ref=e709]:
                - generic [ref=e710]:
                  - term [ref=e711]: Phản ánh mới trong 7 ngày
                  - definition [ref=e712]: "8"
                - generic [ref=e713]:
                  - term [ref=e714]: Tổng lượt tương tác
                  - definition [ref=e715]: "0"
                - generic [ref=e716]:
                  - term [ref=e717]: Cập nhật gần nhất
                  - definition [ref=e718]: 16:56 06-08
            - generic [ref=e719]:
              - heading "Khám phá theo khu vực" [level=2] [ref=e720]
              - paragraph [ref=e721]: Xem các phản ánh trên bản đồ để nắm tình hình xung quanh bạn.
              - button "Mở bản đồ sự cố" [ref=e722] [cursor=pointer]:
                - img [ref=e723]
                - text: Mở bản đồ sự cố
      - generic [ref=e728]:
        - generic [ref=e729]:
          - img [ref=e731]
          - generic [ref=e735]:
            - paragraph [ref=e736]: UrbanMind
            - paragraph [ref=e737]: © 2026 Cổng phản ánh đô thị
        - navigation "Thông tin pháp lý và hỗ trợ" [ref=e738]:
          - link "Chính sách riêng tư" [ref=e739] [cursor=pointer]:
            - /url: "#privacy"
          - link "Điều khoản sử dụng" [ref=e740] [cursor=pointer]:
            - /url: "#terms"
          - link "Hỗ trợ" [ref=e741] [cursor=pointer]:
            - /url: mailto:support@urbanmind.vn
            - img [ref=e742]
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
      |                                                                             ^ Error: Community feed: unexpected uncaught page errors
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