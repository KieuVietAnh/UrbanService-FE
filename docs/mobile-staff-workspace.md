# Mobile System Staff — Incident workspace

## Nguồn và phạm vi

Đối chiếu ba tab trong [tài liệu SYSTEMSTAFF FE](https://docs.google.com/document/d/1KjQY2Yo-RVMcdk4GOsiA_qBjBHSX8VU7-W1N9Sw7nZc/edit), đặc biệt **Final Plan** và **Decision Note**. Incident là đầu việc của Staff; Feedback là Report cung cấp thông tin. Manager kiểm duyệt Report, quyết định liên kết/gộp và duyệt kết quả.

Lần triển khai này sửa phân vai, hoàn thiện nền tảng Incident, Dashboard cá nhân và tích hợp toàn bộ lifecycle Staff theo bản Swagger cập nhật ngày 01/09/2026: bắt đầu xử lý, Provider, minh chứng, gửi kết quả ban đầu, gửi lại khi `NeedRework` và SLA theo từng Feedback/Report. Không tự chọn Report đại diện cho Incident và không tổng hợp SLA giả ở cấp Incident.

Mobile có workspace Service User và System Staff độc lập. Admin, Interaction Manager và Service Provider vẫn tới màn vai trò chưa hỗ trợ. Đăng nhập, Google, OTP, khôi phục phiên và deep link dùng chính sách `apps/mobile/src/features/auth/mobile-access.ts`; `Stack.Protected` chặn mount workspace sai vai trò. Backend vẫn phải thực thi phân quyền và phạm vi dữ liệu.

## Màn hình và chức năng

| Màn | Đường dẫn | Phạm vi |
| --- | --- | --- |
| Tổng quan | `/staff/home` | Các nhóm sự vụ cá nhân: được giao, đang xử lý, cần làm lại, chờ duyệt; mở danh sách tương ứng |
| Sự vụ của tôi | `/staff/incidents` | Tìm kiếm; lọc Status, Priority, Severity, Ward/Area, Category; có `NeedRework`; phân trang và tải lại; luôn truyền `AssignedStaffUserId` |
| Chi tiết sự vụ — Tổng quan | `/staff/incidents/:id` | Severity, Priority, khu vực, danh mục, người phụ trách, thời gian và hạn xử lý; Staff đang phụ trách có thể xác nhận bắt đầu `Assigned → InProgress` |
| Chi tiết sự vụ — Reports | Cùng màn chi tiết | Toàn bộ Reports API trả về, Report Count, metadata liên kết và SLA riêng của từng Report; mở Report rồi quay về Incident |
| Chi tiết sự vụ — Timeline | Cùng màn chi tiết | Timeline Incident thật, chỉ đọc, có phân trang; hiển thị nội dung sự kiện được API cung cấp |
| Đơn vị xử lý & liên hệ | `/staff/incidents/:id/provider` | Chọn Provider phù hợp, xác nhận phân công một lần, thông tin liên hệ, cập nhật trạng thái riêng của đơn vị và nhật ký liên hệ |
| Minh chứng & kết quả | `/staff/incidents/:id/resolution` | Ba tab: chọn/tải ảnh minh chứng; nhập và xác nhận gửi kết quả ban đầu hoặc gửi lại khi `NeedRework`; xem toàn bộ lịch sử kết quả cùng minh chứng |
| Tra cứu Reports | `/staff/feedbacks` | Tìm kiếm, lọc trạng thái, phân trang; không phải hàng đợi kiểm duyệt |
| Chi tiết Report | `/staff/feedbacks/:id` | Nội dung, người gửi, vị trí, ảnh/tệp đính kèm, phân tích AI khi có, SLA của Report, liên kết Incident và trao đổi; không có Verify/Reject |
| Trao đổi | `/staff/conversations` | Chọn Report để mở cuộc trao đổi |
| Chat Report | `/staff/feedbacks/:id/chat` | Phản hồi người dân hoặc ghi chú nội bộ; cập nhật khi focus; giữ bản nháp khi gửi lỗi |
| Thông báo | `/staff/notifications` | Lọc chưa đọc, phân trang, đánh dấu đọc và mở đúng hồ sơ Staff |
| Tài khoản | `/staff/account` | Xem/sửa tên và điện thoại, đăng xuất có xác nhận |

Không còn mục Kiểm duyệt AI trong điều hướng Staff. Module API mobile Staff không cung cấp Verify/Reject, quyết định duplicate/match, Assign Staff, Approve hoặc NeedRework decision. Đường dẫn queue cũ không được dùng để khôi phục chức năng kiểm duyệt.

## Quy tắc dữ liệu

- Production gọi API Incident list/detail/timeline thật; không tạo Incident giả từ danh sách Feedback, không có fixture sản phẩm.
- Không gọi danh sách Incident khi thiếu ID Staff. Danh sách và số liệu Dashboard đều lọc theo Staff hiện tại, không lấy số liệu Feedback toàn hệ thống thay thế.
- Query key tách Incident/Report/timeline, chứa ID tài khoản; đăng xuất xóa cache.
- Ward/Area và Category lấy từ danh mục backend; lọc ở server và giữ thông tin phân trang backend.
- Overview, Reports, Timeline là các tab riêng. Linkage metadata chỉ hiển thị khi API cung cấp; không coi `linkRole` là quyền chọn Report để thực thi nghiệp vụ.
- `dueDate` của Incident chỉ là hạn xử lý được backend trả về, không phải SLA tổng hợp. SLA được đọc riêng cho từng Feedback/Report qua `GET /api/slas/feedback/{feedbackId}/status`; màn Incident chỉ trình bày các SLA Report liên kết, không gộp thành một chỉ số Incident.
- Tin nhắn Staff dùng `includeInternal=true`; luồng cư dân giữ `false`. Không chuyển ghi chú nội bộ sang luồng công khai.
- Link thông báo chỉ ánh xạ loại hồ sơ/đường dẫn Staff được hỗ trợ, không mở URL tùy ý từ payload.
- Giao diện dùng hệ thống màu/chữ hiện có, safe-area, trạng thái loading/error/empty và nhãn trợ năng; không thay đổi workflow Provider/Resolution cũ của web.
- Provider được đọc bằng Incident; `providerAssignmentId` lấy từ response có `incidentId`, không từ `reports[0]`. GET assignment trả 204 được hiểu là chưa phân công; lỗi hoặc response không hợp lệ không được hiểu là danh sách rỗng.
- Thao tác ghi kiểm tra chủ sở hữu và trạng thái, đọc lại Incident/phân công/lịch sử kết quả trước khi gửi. Backend vẫn là nơi thực thi quyền và transition cuối cùng. Form giữ nội dung khi lỗi; khóa thao tác trùng khi đang gửi; cache phân tách theo tài khoản và sự vụ.
- Staff đang phụ trách có thể bắt đầu Incident ở `Assigned`; mobile đọc lại Incident ngay trước khi gửi `PATCH .../status` với `InProgress` và làm mới dữ liệu khi gặp xung đột.
- Mobile cho cập nhật Provider/minh chứng ở `Assigned`, `InProgress`, `NeedRework` của chính Staff. Gửi kết quả ban đầu chỉ ở `InProgress` khi chưa có lịch sử; `NeedRework` dùng cùng endpoint resolutions để gửi một kết quả mới và giữ nguyên lịch sử các lần trước. Mobile đọc lại lịch sử trước POST để hạn chế gửi trùng sau lỗi mạng.
- SLA query được phân tách theo tài khoản, Incident và Feedback. `404` nghĩa là Report chưa có SLA; lỗi xác thực hoặc lỗi mạng được hiển thị để thử lại, không bị biến thành trạng thái “không có SLA”.
- Ảnh minh chứng dùng multipart `Description` và `Files`; không gọi DELETE xóa toàn bộ minh chứng. Khi gửi kết quả, chỉ truyền Incident ở route, assignment hiện tại (nếu có), nội dung và URL ảnh đã lưu; không gửi Staff ID hoặc Feedback ID.

## Plan và trạng thái

### Phần triển khai cục bộ

- [x] Gỡ nghiệp vụ kiểm duyệt khỏi Staff; Report trở thành màn tra cứu.
- [x] Hoàn thiện bộ lọc và thông tin My Incidents.
- [x] Tách Overview / Reports / Timeline, bổ sung metadata liên kết và điều hướng về Incident.
- [x] Đổi Dashboard sang các nhóm công việc cá nhân; không tạo số liệu SLA giả.
- [x] Rà soát và tích hợp contract Processing/Resolution/SLA theo Swagger hiện tại.
- [x] Chốt TypeScript và lint. Kết quả unit/integration mới được ghi bên dưới.
- [x] Android bundle và APK `staffValidation` đạt; cài/chạy trên Pixel 5 Android 16 / API 36 với fixture cô lập.
- [x] Chụp và kiểm tra toàn bộ màn Staff; bàn giao gallery 107 trạng thái, ZIP, ma trận 7 cấu hình và ảnh native bên dưới.

### Tích hợp contract Incident mới

- [x] API/model Provider candidates, assignment, status, contact logs, completion documents và resolutions.
- [x] Phân công Provider một lần, xem thông tin, trạng thái đơn vị và nhật ký liên hệ.
- [x] Chọn/tải ảnh minh chứng, giữ ảnh đã chọn khi lỗi, xem tài liệu đã tải.
- [x] Nhập và xác nhận gửi kết quả Incident cho Manager, xem lịch sử kết quả.
- [x] Bắt đầu xử lý Incident `Assigned → InProgress`, có xác nhận, kiểm tra lại quyền sở hữu/trạng thái và xử lý xung đột.
- [x] Gửi lại kết quả khi Incident `NeedRework` bằng contract resolutions, giữ lịch sử và bản nháp khi lỗi.
- [x] Hiển thị response/resolution SLA theo từng Feedback/Report liên kết, gồm hạn, tiến độ, cảnh báo và trạng thái quá hạn khi API cung cấp.

### Ranh giới contract còn giữ nguyên

- Backend là lớp thực thi cuối cùng cho role, ownership và transition; fixture/smoke test không thay cho kiểm thử tích hợp bằng tài khoản Staff thật.
- Lý do yêu cầu làm lại chỉ được hiển thị khi timeline/payload backend có dữ liệu phù hợp; mobile không dùng `resultNote` của Staff để tự tạo lý do Manager.
- Swagger không có SLA tổng hợp cấp Incident. Mobile không suy diễn `dueDate` hoặc các SLA Report thành một chỉ số SLA Incident.

## Contract hiện tại

Các dòng sau tham chiếu bản `swagger.json` trong repository tại thời điểm đối chiếu, không phải xác nhận quyền trên backend đang chạy.

| Chức năng | Contract hiện có / evidence | Trạng thái tích hợp / ranh giới |
| --- | --- | --- |
| Bắt đầu xử lý | `PATCH /api/management/incidents/{incidentId}/status`, `{status,note}` → `IncidentDetailDto`; Swagger dòng 5583 | Đã tích hợp `Assigned → InProgress` cho Staff đang phụ trách. Mobile đọc lại Incident trước mutation, chỉ gửi status/note, làm mới cache sau thành công hoặc xung đột; backend quyết định quyền/transition cuối cùng |
| Trạng thái Provider | `PATCH /api/management/provider-assignments/{providerAssignmentId}/status`, dòng 6607 | Đã tích hợp riêng với trạng thái Incident. Tái sử dụng helper transition Provider hiện có của shared-api; backend quyết định cuối cùng, trạng thái lạ chỉ đọc |
| Gán Provider | GET `.../incidents/{incidentId}/provider-candidates`, dòng 5753; GET/POST `.../provider-assignment`, dòng 5803 | Đã tích hợp, không cần mapping Report. GET 204 chưa có phân công; POST 201 thành công; 409 xung đột. Chỉ một assignment, không đổi đơn vị |
| Liên hệ Provider | `GET/POST /api/management/provider-assignments/{providerAssignmentId}/contact-logs`, dòng 6727 | Đã tích hợp; contactMethod, contactResult, contactNote, contactedAt theo schema |
| Minh chứng | `GET/POST .../provider-assignments/{providerAssignmentId}/completion-documents`, dòng 6955; multipart `Description`, `Files` | Đã tích hợp; DTO có `incidentId` và `providerAssignmentId`. Không gọi DELETE vì mô tả NeedRework còn dùng từ Feedback |
| Submit và lịch sử | `GET/POST /api/management/incidents/{incidentId}/resolutions`, dòng 5926; request dòng 18791 | Đã tích hợp. POST trả 200 không có body; tải lại lịch sử/trạng thái. Request không còn Feedback ID hoặc Staff ID |
| Resubmit / NeedRework reason | `POST /api/management/incidents/{incidentId}/resolutions` dùng cho cả lần đầu và lần gửi lại; lịch sử đọc bằng GET cùng route | Đã tích hợp gửi lại khi Incident `NeedRework`, không ghi đè kết quả trước. Lý do Manager chỉ hiển thị từ timeline/payload backend, không suy diễn từ ghi chú của Staff |
| SLA theo Report | `GET /api/slas/feedback/{feedbackId}/status` | Đã tích hợp ở tab Reports của Incident và chi tiết Report. Query tách theo user/Incident/Feedback; `404` là chưa có SLA, các lỗi khác vẫn hiển thị. Không có và không tạo SLA tổng hợp cấp Incident |

Tài liệu [yêu cầu backend ban đầu](backend/incident-staff-processing-and-provider-requirements.md) là đề xuất lịch sử trước Swagger mới, không phải trạng thái triển khai hiện tại. Endpoint chính thức trong bảng trên được ưu tiên; không dùng `incident.reports[0]`.

## Kiểm chứng và ảnh màn hình

- TypeScript toàn app: đạt. ESLint toàn mobile có **0 lỗi**; các cảnh báo hiện hữu ngoài phạm vi Staff không chặn build. ESLint riêng `src/features/staff` và `app/(staff)`: đạt.
- Mobile + Shared Incident API + helper xử lý Incident trên web: **63/63 test đạt**, bao gồm quyền, start processing, initial/resubmit resolution, SLA theo Report, contract Swagger, payload, 204, multipart native/web, liên kết DTO, cache theo người dùng và layout Android. Riêng `pnpm --dir apps/mobile test:staff`: **38/38 đạt**.
- Native fixture server self-test: **91 assertion đạt** cho login/OTP, refresh token, phạm vi Staff, Incident/Report, start processing, SLA, Provider/contact/status, multipart evidence, initial/resubmit resolution, chat, notification và guard tài khoản.
- Browser smoke cô lập **390 × 844**: **107 ảnh**, **270 API request được intercept**, **107 phép đo hình học**, không runtime error, request ngoài fixture hoặc lỗi geometry. Bao phủ bộ lọc/điều hướng, bắt đầu xử lý và 409, SLA Report, phân công Provider một lần (204/409), liên hệ và thử lại (503), trạng thái đơn vị, chọn/tải ảnh multipart và giữ bản nháp khi lỗi, gửi kết quả ban đầu/gửi lại 200 không body/409, lịch sử, quyền sở hữu/403, trạng thái chỉ đọc và chống gửi trùng.
- Ma trận responsive: **7/7 cấu hình đạt** — 320 × 640, 360 × 800, text lớn, vùng trống kiểu gesture/3 nút, landscape stress và tablet. Tổng cộng **254 ảnh chọn lọc**, **820 phép đo hình học** và **1.890 request fixture** (270 mỗi profile), 0 lỗi runtime/unmocked/geometry. Đây là bằng chứng Expo web tổng hợp, tách biệt với kiểm thử native.
- APK native: build Gradle thành công trong **4 phút 02 giây**, **832 task** (24 executed, 808 up-to-date); artifact test-only **50.823.243 byte**, SHA-256 `9c07b0405b338e6edcf235bdb010122320d2703d9c5f060a0d6cb83d5c6993ea`. Đã cài/chạy fixture Staff trên Pixel 5 emulator Android 16 / API 36; các kiểm tra native dùng đúng APK này.
- Trên đúng APK cuối, luồng native đã đi qua `Assigned → InProgress`, SLA riêng của Report, xác nhận/gửi lại kết quả `NeedRework` và lịch sử kết quả. Dashboard cũng được chụp ở gesture navigation, 3-button navigation, font hệ thống 200% và cửa sổ 720 × 1280; năm tab vẫn hiển thị đủ, nội dung không bị cắt. Danh sách/chi tiết chat và Gboard mở đã được chụp lại sau build cuối; ô đang focus cùng nút gửi nằm trọn phía trên IME. Phép kiểm tra lặp lại `staff-native-device.mjs errors` không ghi nhận `AndroidRuntime` hoặc `ReactNativeJS` error trong vòng nghiệm thu cuối.
- Bàn giao **107 ảnh chụp PNG** (màn hình, phần cuộn và trạng thái) cùng **4 ảnh tổng hợp PNG**, gallery, manifest và verification JSON. ZIP có **118 tệp đã xác minh**, gồm 107 ảnh chụp, 4 ảnh tổng hợp và gallery/metadata.

Mở [gallery toàn bộ 107 màn/trạng thái Staff](screenshots/mobile-staff/index.html), [ma trận 7 cấu hình](screenshots/mobile-staff-compatibility/index.html), [ảnh chạy Android native](screenshots/mobile-staff-native/index.html) hoặc [tải bộ ảnh ZIP](screenshots/mobile-staff.zip). Xem nhanh [lifecycle start/SLA/rework](screenshots/mobile-staff/overview-lifecycle.png), [luồng Provider và kết quả](screenshots/mobile-staff/overview-execution.png), [nhóm màn Incident](screenshots/mobile-staff/overview-main.png) và [nhóm màn hỗ trợ](screenshots/mobile-staff/overview-support.png). Danh mục ảnh nằm trong [manifest.json](screenshots/mobile-staff/manifest.json); [verification.json](screenshots/mobile-staff/verification.json) ghi kết quả lượt chụp 390 × 844; `mobile-staff-compatibility/matrix.json` ghi số liệu từng profile.

Ảnh browser và APK native đều dùng **API fixtures cô lập**; không phải ảnh thiết kế tạo sinh hay dữ liệu backend live. Kiểm thử native hiện giới hạn ở một Pixel 5 API 36 emulator, không phải mọi OEM/Android/IME. Chưa kiểm thử bằng tài khoản Staff backend thật; backend vẫn là lớp thực thi cuối cùng cho role, ownership và transition. Các kết quả trên không biến SLA theo Report thành SLA cấp Incident.

Chạy từ workspace root:

```sh
node node_modules/typescript/bin/tsc --project apps/mobile/tsconfig.json --noEmit
pnpm --dir apps/mobile test:staff
node --test packages/shared-api/src/incidentManagementApi.test.js apps/web/src/pages/staff/staffIncidentProcessing.test.js
node apps/mobile/tests/staff-smoke.mjs
node apps/mobile/tests/staff-compatibility.mjs
node apps/mobile/tests/staff-native-server.mjs --self-test
node apps/mobile/tests/staff-native-build.mjs
```

Chạy các lệnh sau từ thư mục `apps/mobile`. Cần mở Expo web trước khi chạy smoke test; lệnh start tiếp tục chạy trong terminal riêng.

```sh
node ../../node_modules/eslint/bin/eslint.js src/features/staff "app/(staff)"
node ../../node_modules/expo/bin/cli start --web --port 8082
node ../../node_modules/expo/bin/cli export --platform android --output-dir .expo/staff-android-execution
```

Smoke test cần Playwright và Chromium của workspace. Node unit test sử dụng type stripping/registerHooks; môi trường hiện dùng Node 24. Các biến `MOBILE_SMOKE_URL`, `MOBILE_SMOKE_WIDTH`, `MOBILE_SMOKE_HEIGHT` cho phép đổi URL và viewport. Không dùng tài khoản thật hoặc gửi mutation lên backend thật trong smoke test.

`staff-smoke.mjs` tự tạo gallery bằng `staff-gallery.mjs` và ZIP bằng `staff-archive.mjs` sau khi tất cả assert đạt. Hướng dẫn Expo được áp dụng để giữ navigation hiện tại, xử lý safe-area, query key theo phạm vi, hủy request đọc và phục hồi form khi lỗi; tiếp tục sử dụng authenticated shared client của dự án để không thay đổi luồng đăng nhập.
