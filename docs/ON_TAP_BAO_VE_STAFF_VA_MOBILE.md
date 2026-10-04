# Cẩm nang ôn bảo vệ: System Staff Web và toàn bộ Mobile UrbanMind

> Mục tiêu của tài liệu này là giúp người chưa quen code có thể lần được một chức năng từ giao diện đến API và trả lời câu hỏi bảo vệ. Nội dung được đối chiếu với source hiện tại ngày 04/10/2026. Khi tài liệu cũ mâu thuẫn với source, ưu tiên source và `swagger.json`.

---

## Cách học tài liệu này

Không nên cố học thuộc từng dòng code. Với mỗi chức năng, chỉ cần trả lời được 6 câu:

1. Người dùng nhìn thấy gì?
2. Component/page nào hiển thị nó?
3. State và logic nằm ở đâu?
4. Hàm API nào được gọi?
5. Endpoint, method và dữ liệu gửi đi là gì?
6. Quyền và trạng thái nào cho phép thao tác?

Thứ tự ôn được khuyến nghị:

1. Đọc phần 1–4 để hiểu kiến trúc và khái niệm.
2. Đọc phần 5–10 để nắm System Staff Web.
3. Đọc phần 11–19 để nắm Mobile.
4. Đọc phần 20–22 để hiểu bảo mật, lỗi và kiểm thử.
5. Dùng phần 23 để tự luyện câu hỏi–trả lời.
6. Học bài nói ở phần 24 trước ngày bảo vệ.

---

# PHẦN I — KIẾN THỨC NỀN

## 1. Dự án này là gì?

UrbanMind là một monorepo, tức nhiều ứng dụng/package nằm chung một repository.

```text
UrbanMind
├── apps/web              Web React + Vite
├── apps/mobile           Mobile Expo + React Native
├── packages/shared-api   API client dùng chung
├── packages/shared-types Role, status, constant dùng chung
├── packages/shared-ui    Một số component React dùng chung
└── docs                  Tài liệu và bằng chứng kiểm thử
```

File package gốc: [`../package.json`](../package.json).

### Công nghệ chính

| Phần | Công nghệ | Dùng để làm gì? |
| --- | --- | --- |
| Web | React | Xây giao diện theo component |
| Web | React Router | Điều hướng URL, bảo vệ route |
| Web | Vite | Dev server và build web |
| Mobile | React Native | Giao diện native iOS/Android |
| Mobile | Expo | Toolchain, camera, location, document picker |
| Mobile | Expo Router | Điều hướng dựa trên cấu trúc file |
| Mobile | Zustand | Client state như user và draft |
| Mobile | React Query | Server state, cache, retry, refetch |
| Chung | Axios | Gửi HTTP request tới backend |
| Chung | SignalR | Nhận message realtime |
| Auth mobile | Firebase Auth | Xác thực OTP số điện thoại |

### Câu trả lời ngắn khi bị hỏi kiến trúc

> Dự án là monorepo gồm web React/Vite và mobile Expo/React Native. Hai ứng dụng dùng chung API client và type qua workspace packages. Mobile dùng Zustand cho client state, React Query cho server state và Expo Router cho navigation.

---

## 2. Bốn khái niệm nghiệp vụ phải phân biệt

### 2.1 Feedback/Report

Một phản ánh do một người dân gửi. Ví dụ: “Có cây đổ trước số 10 đường A”.

- ID thường là `feedbackId`.
- Có người gửi, nội dung, vị trí và tệp đính kèm.
- Chat với người dân gắn theo Feedback.
- Staff được xem và trao đổi nhưng không tự Verify/Reject.

### 2.2 Incident/Sự vụ

Đầu việc nghiệp vụ mà cơ quan thực sự xử lý. Nhiều người có thể gửi nhiều Feedback về cùng một sự cố, và Manager liên kết chúng vào một Incident.

- ID là `incidentId`.
- Staff được phân công theo Incident.
- SLA, Provider assignment, minh chứng và Resolution hiện đều xử lý theo Incident.

### 2.3 Provider Assignment

Việc giao một Incident cho một đơn vị/đầu mối bên ngoài phối hợp xử lý.

- ID là `providerAssignmentId`.
- Candidate được backend lọc theo khu vực và danh mục của Incident.
- Một Incident hiện chỉ có một assignment đang hoạt động; frontend không hỗ trợ tự phân công lại.

### 2.4 Resolution

Kết quả xử lý Staff gửi cho Manager xem xét.

- ID là `resolutionId`.
- Có `resolutionSummary`, `actionTaken`, `resultNote`.
- Khi `NeedRework`, Staff gửi một Resolution mới; lịch sử cũ vẫn được giữ.

### Quy tắc quan trọng nhất

```text
Feedback là nguồn thông tin.
Incident là đơn vị công việc.
Staff xử lý Incident, không xử lý một Feedback tùy ý thay cho Incident.
```

Không được tự chọn `reports[0]` làm Report đại diện cho Incident.

---

## 3. Frontend, shared API và backend chia trách nhiệm thế nào?

### Frontend chịu trách nhiệm

- Hiển thị giao diện.
- Thu thập input.
- Validate cơ bản.
- Ẩn/khóa nút không phù hợp trạng thái.
- Gọi API.
- Quản lý loading, error và cache.
- Không để người dùng vô tình thao tác sai.

### Shared API chịu trách nhiệm

- Chuẩn hóa URL và request payload.
- Gắn access token.
- Refresh token khi 401.
- Chuẩn hóa response.
- Validate ID/payload trước khi gửi.
- Được cả web và mobile tái sử dụng.

File quan trọng:

- [`../packages/shared-api/src/axiosClient.js`](../packages/shared-api/src/axiosClient.js)
- [`../packages/shared-api/src/incidentManagementApi.js`](../packages/shared-api/src/incidentManagementApi.js)
- [`../packages/shared-api/src/managementFeedbackApi.js`](../packages/shared-api/src/managementFeedbackApi.js)

### Backend chịu trách nhiệm cuối cùng

- Xác thực JWT.
- Kiểm tra role.
- Kiểm tra ownership.
- Kiểm tra transition trạng thái.
- Chống client sửa request.
- Ghi database và audit/timeline.

### Câu rất hay bị hỏi

**Frontend đã disable nút rồi, sao backend còn phải kiểm tra?**

> Vì frontend chạy trên thiết bị người dùng và có thể bị sửa hoặc bỏ qua bằng Postman. Disable nút chỉ là UX guard. Backend mới là security boundary và phải kiểm tra JWT, role, ownership và trạng thái một cách atomic.

---

## 4. Cách một request đi qua hệ thống

Ví dụ tải Incident của Staff:

```text
StaffIncidentDashboardPage.jsx
→ useStaffIncidentDashboard.js
→ fetchAllAssignedStaffIncidents()
→ incidentManagementApi.getIncidents()
→ axiosClient.get()
→ GET /api/management/incidents
→ Backend
→ response
→ shared API normalize
→ hook cập nhật state
→ React render giao diện
```

Đây là mẫu trả lời chuẩn khi hội đồng hỏi “API được call ở đâu?”. Không chỉ nói endpoint; hãy lần đủ UI → logic → shared API → HTTP.

---

# PHẦN II — SYSTEM STAFF WEB

## 5. Route, đăng nhập và phân quyền Staff Web

### 5.1 Route nằm ở đâu?

File: [`../apps/web/src/routes/AppRoutes.jsx`](../apps/web/src/routes/AppRoutes.jsx).

Các route chính:

| Route | Page | Ý nghĩa |
| --- | --- | --- |
| `/dashboard` | `StaffIncidentDashboardPage` | Tổng quan Staff |
| `/staff/incidents` | `StaffIncidentListPage` | Incident của Staff |
| `/staff/incidents/:incidentId` | `StaffIncidentDetailPage` | Chi tiết và xử lý Incident |
| `/staff/feedbacks` | `ManagementFeedbackListPage` | Tra cứu Report |
| `/staff/feedbacks/:feedbackId` | `ManagementFeedbackDetailPage` | Chi tiết Report |
| `/staff/conversations` | `ConversationQueuePage` | Danh sách trao đổi |
| `/staff/area-alerts` | `AreaAlertManagementPage` | Cảnh báo khu vực |
| `/staff/coordinators` | `CoordinatorDirectoryPage` | Danh bạ đơn vị |
| `/notifications` | `NotificationCenterPage` | Thông báo |
| `/profile` | `ProfilePage` | Hồ sơ |

### 5.2 Route được bảo vệ thế nào?

Một route Staff thường được bọc như sau:

```jsx
<ProtectedRoute>
  <RoleGuard allowedRoles={[APP_ROLES.SYSTEM_STAFF]}>
    <DashboardLayout>
      <StaffIncidentListPage />
    </DashboardLayout>
  </RoleGuard>
</ProtectedRoute>
```

- `ProtectedRoute`: yêu cầu có phiên đăng nhập.
- `RoleGuard`: yêu cầu role phù hợp.
- `DashboardLayout`: khung sidebar/header.

File liên quan:

- [`../apps/web/src/guards/ProtectedRoute.jsx`](../apps/web/src/guards/ProtectedRoute.jsx)
- [`../apps/web/src/guards/RoleGuard.jsx`](../apps/web/src/guards/RoleGuard.jsx)
- [`../apps/web/src/contexts/AuthContext.jsx`](../apps/web/src/contexts/AuthContext.jsx)
- [`../packages/shared-types/src/roleMap.js`](../packages/shared-types/src/roleMap.js)

### 5.3 Role backend và role frontend

Backend có thể trả `SystemStaff`; frontend chuẩn hóa thành `system-staff`.

Việc normalize giúp các component không phải xử lý nhiều cách viết role.

### 5.4 Staff được phép làm gì với Report?

File: [`../apps/web/src/roles/system-staff/permissions.js`](../apps/web/src/roles/system-staff/permissions.js).

Được phép:

- Xem Report.
- Yêu cầu thêm thông tin.
- Nhắn người dân.
- Xem lịch sử xử lý.

Không được phép:

- Verify/Reject Report.
- Assign Staff.
- Quyết định duplicate.
- Approve Resolution.
- Yêu cầu NeedRework.

Các quyết định đó thuộc Interaction Manager.

---

## 6. Dashboard Staff Web

### 6.1 File nào làm gì?

| File | Trách nhiệm |
| --- | --- |
| [`StaffIncidentDashboardPage.jsx`](../apps/web/src/pages/staff/StaffIncidentDashboardPage.jsx) | Render UI Dashboard |
| [`useStaffIncidentDashboard.js`](../apps/web/src/hooks/useStaffIncidentDashboard.js) | Điều phối loading/error/request |
| [`staffIncidentDashboard.js`](../apps/web/src/pages/staff/staffIncidentDashboard.js) | Hàm thuần: pagination, KPI, sort |
| [`incidentManagementApi.js`](../packages/shared-api/src/incidentManagementApi.js) | Gọi endpoint Incident |
| [`slaApi.js`](../packages/shared-api/src/slaApi.js) | Gọi endpoint SLA |

### 6.2 `assignedStaffUserId` lấy từ đâu?

Trong `StaffIncidentDashboardPage`:

```js
const { user } = useAuth();
const assignedStaffUserId = String(user?.userId ?? user?.id ?? '').trim();
```

Luồng nguồn dữ liệu:

```text
Backend trả thông tin user khi đăng nhập
→ AuthContext giữ user
→ Dashboard đọc user.userId hoặc user.id
→ tạo assignedStaffUserId
```

Không nên trả lời đơn giản “lấy từ backend”. Câu chuẩn là: “Nó được đọc từ authenticated user trong AuthContext; user ban đầu đến từ response đăng nhập/backend.”

### 6.3 `assignedStaffUserId` đi đâu?

```text
StaffIncidentDashboardPage
→ useStaffIncidentDashboard(assignedStaffUserId)
→ fetchAllAssignedStaffIncidents({ assignedStaffUserId })
→ incidentManagementApi.getIncidents({ assignedStaffUserId })
→ normalizeIncidentListParams()
→ query AssignedStaffUserId
```

Request tương đương:

```http
GET /api/management/incidents
  ?PageNumber=1
  &PageSize=100
  &AssignedStaffUserId=<current-user-id>
  &IncludeMerged=false
```

Đây là query parameter, không phải body và không phải path parameter.

### 6.4 Nếu thiếu `assignedStaffUserId` thì sao?

Hook chuyển state thành `SCOPE_UNAVAILABLE`, trả danh sách rỗng và không gọi API.

Helper thuần cũng fail-closed:

```js
if (!normalizedStaffUserId) {
  throw new TypeError('assignedStaffUserId is required');
}
```

Nó không được phép âm thầm lấy toàn bộ Incident.

### 6.5 Vì sao Dashboard phải tải tất cả trang?

API danh sách có phân trang, nhưng Dashboard cần KPI trên toàn bộ Incident được giao. Nếu chỉ dùng trang 1, số lượng `Assigned`, `InProgress`... có thể sai.

Quy trình:

1. Gọi trang 1 với `pageSize=100`.
2. Đọc `totalItems` và `totalPages`.
3. Tải các trang còn lại.
4. Tải song song theo batch 4 bằng `Promise.all`.
5. Gộp dữ liệu.
6. Loại trùng theo `incidentId`.
7. Tính KPI.

Batch 4 giúp nhanh hơn gọi tuần tự nhưng không tạo quá nhiều request cùng lúc.

### 6.6 Loại trùng thế nào?

`deduplicateIncidents` dùng `Map` với key là `incidentId`. Nếu một Incident xuất hiện hai lần, giữ bản có `updatedAt`/`createdAt` mới hơn.

Trùng có thể xuất hiện nếu dữ liệu thay đổi và thứ tự phân trang dịch chuyển trong lúc frontend đang gọi nhiều trang.

### 6.7 Vì sao `includeMerged: false`?

Incident đã `Merged` không còn là một đầu việc độc lập. Nếu vẫn tính, Dashboard có thể đếm trùng công việc.

### 6.8 KPI được tính thế nào?

`calculateStaffIncidentKpis()` đếm:

- `assigned`.
- `inProgress`.
- `needRework`.
- `pendingApproval`.
- `totalActive` là tổng bốn nhóm trên.

### 6.9 Incident cần chú ý được sắp xếp thế nào?

Thứ tự ưu tiên:

1. SLA breached.
2. SLA warning.
3. `NeedRework`.
4. Severity cao.
5. Priority cao.
6. Cập nhật gần nhất.

### 6.10 SLA gọi ở đâu?

```text
useStaffIncidentDashboard
→ fetchAssignedIncidentSlaStatuses
→ slaApi.getIncidentSlaStatus(incidentId)
→ GET /api/slas/incident/{incidentId}/status
```

SLA được tải theo batch 4. HTTP 404 được hiểu là Incident chưa có SLA, còn lỗi auth/network vẫn được hiển thị là lỗi.

### Điểm thiết kế có thể cải thiện

Hiện frontend tải toàn bộ Incident chỉ để tính KPI. Backend có thể cung cấp endpoint aggregation riêng để trả KPI và attention list, giảm N+1 request.

---

## 7. Danh sách Incident Staff Web

### File chính

- UI: [`../apps/web/src/pages/staff/StaffIncidentListPage.jsx`](../apps/web/src/pages/staff/StaffIncidentListPage.jsx)
- Hook: [`../apps/web/src/hooks/useStaffIncidentList.js`](../apps/web/src/hooks/useStaffIncidentList.js)
- Scope validator: [`../apps/web/src/hooks/staffIncidentScope.js`](../apps/web/src/hooks/staffIncidentScope.js)

### API

```http
GET /api/management/incidents
```

Các query có thể gồm:

- `PageNumber`, `PageSize`.
- `AssignedStaffUserId`.
- `Status`.
- `Priority`.
- `Severity`.
- `AreaId`.
- `CategoryId`.
- `Search`.
- `IncludeMerged`.

### Tại sao có `hasStaffIncidentScopeMismatch`?

Frontend đã gửi `AssignedStaffUserId`, nhưng vẫn kiểm tra response. Nếu backend trả một dòng có `assignedStaffUserId` khác, frontend fail-closed và không hiển thị dữ liệu đó.

Đây là defense-in-depth, nhưng backend vẫn phải là lớp bảo mật cuối.

### `AbortController` dùng để làm gì?

Khi filter hoặc trang thay đổi, request cũ có thể vẫn chạy. Hook abort request cũ để response cũ không ghi đè lên dữ liệu mới.

---

## 8. Chi tiết Incident và flow xử lý Web

### 8.1 File tổng

- Page: [`../apps/web/src/pages/staff/StaffIncidentDetailPage.jsx`](../apps/web/src/pages/staff/StaffIncidentDetailPage.jsx)
- Hook detail: [`../apps/web/src/hooks/useStaffIncidentDetail.js`](../apps/web/src/hooks/useStaffIncidentDetail.js)
- Timeline: [`../apps/web/src/hooks/useStaffIncidentTimeline.js`](../apps/web/src/hooks/useStaffIncidentTimeline.js)
- UI/presentation helpers: [`../apps/web/src/pages/staff/incidentDetailPresentation.js`](../apps/web/src/pages/staff/incidentDetailPresentation.js)

### 8.2 API detail và timeline

```http
GET /api/management/incidents/{incidentId}
GET /api/management/incidents/{incidentId}/timeline?pageNumber=1&pageSize=20
```

`incidentId` là path parameter và được `encodeURIComponent` trước khi ghép URL.

### 8.3 Các panel xử lý

| Panel | File | Chức năng |
| --- | --- | --- |
| Processing | `StaffIncidentProcessingPanel.jsx` | Tổng quan bước hiện tại |
| Provider | `StaffIncidentProviderSection.jsx` | Chọn đơn vị hoặc tự xử lý |
| Progress | `StaffIncidentProgressSection.jsx` | Bắt đầu và lưu liên hệ |
| Evidence | `StaffIncidentEvidencePanel.jsx` | Upload/xóa minh chứng |
| Resolution | `StaffIncidentResolutionPanel.jsx` | Gửi kết quả và lịch sử |
| Reports | `StaffIncidentReportsPanel.jsx` | Các Report liên quan |
| Timeline | `StaffIncidentTimelinePanel.jsx` | Audit hoạt động |

### 8.4 Trạng thái Incident chính

```text
Assigned
→ InProgress
→ SubmittedForApproval
→ Approved/Resolved/Closed
```

Nhánh làm lại:

```text
SubmittedForApproval
→ Manager chọn NeedRework
→ Staff bổ sung
→ gửi Resolution mới
→ SubmittedForApproval
```

### 8.5 Hai cách bắt đầu xử lý

#### Phối hợp đơn vị

```text
Chọn Provider candidate
→ tạo Provider Assignment
→ đổi Provider reportStatus từ Reported sang InProgress
→ backend đồng bộ Incident sang InProgress
```

#### Staff tự xử lý

```text
Xác nhận tự xử lý
→ POST /api/management/incidents/{incidentId}/start-processing
→ Incident thành InProgress
```

### 8.6 UI guard quan trọng

`isIncidentAssignedToCurrentStaff()` so sánh:

```text
incident.assignedStaffUserId
với
currentUser.userId/currentUser.id
```

`canManageIncidentExecution()` chỉ true nếu:

- Incident thuộc Staff hiện tại.
- Status thuộc `Assigned`, `InProgress`, `NeedRework`.

File: [`../apps/web/src/pages/staff/staffIncidentProcessing.js`](../apps/web/src/pages/staff/staffIncidentProcessing.js).

---

## 9. Provider, liên hệ, minh chứng và Resolution Web

### 9.1 Provider candidates

```http
GET /api/management/incidents/{incidentId}/provider-candidates
```

Backend lọc candidate theo `areaId` và `categoryId` của Incident.

Frontend không tự lấy area/category từ Report đầu tiên.

### 9.2 Đọc assignment hiện tại

```http
GET /api/management/incidents/{incidentId}/provider-assignment
```

Nếu backend trả 204, shared API normalize thành `null`, nghĩa là chưa phân công.

### 9.3 Tạo assignment

```http
POST /api/management/incidents/{incidentId}/provider-assignment
Content-Type: application/json

{
  "coordinatorId": 123,
  "note": "Thông tin cần lưu ý"
}
```

Không gửi `staffUserId`; backend lấy actor từ JWT.

### 9.4 Bắt đầu xử lý với Provider

```http
PATCH /api/management/provider-assignments/{providerAssignmentId}/status

{
  "status": "InProgress",
  "note": "Staff bắt đầu xử lý"
}
```

Điều kiện frontend:

- Incident thuộc Staff hiện tại.
- Incident đang `Assigned`.
- Assignment tồn tại.
- Assignment đang `Reported`.

### 9.5 Lịch sử liên hệ

```http
GET  /api/management/provider-assignments/{id}/contact-logs
POST /api/management/provider-assignments/{id}/contact-logs
```

Payload POST:

```json
{
  "contactMethod": "Gọi điện",
  "contactResult": "Đã thống nhất lịch kiểm tra",
  "contactNote": "Ghi chú tùy chọn",
  "contactedAt": "2026-10-04T07:30:00.000Z"
}
```

### 9.6 Minh chứng nhánh Provider

```http
GET    /api/management/provider-assignments/{id}/completion-documents
POST   /api/management/provider-assignments/{id}/completion-documents
DELETE /api/management/provider-assignments/{id}/completion-documents
```

Upload dùng `multipart/form-data`:

- `Description`.
- Nhiều field `Files`.

Không tự đặt header boundary; Axios/platform tạo boundary cho FormData.

### 9.7 Minh chứng nhánh tự xử lý

```http
GET    /api/management/incidents/{incidentId}/completion-documents
POST   /api/management/incidents/{incidentId}/completion-documents
DELETE /api/management/incidents/{incidentId}/completion-documents
```

Hai kho minh chứng khác nhau vì nhánh tự xử lý không có `providerAssignmentId`.

### 9.8 Khi nào được xóa minh chứng?

UI chỉ cho xóa toàn bộ khi:

- Incident thuộc Staff hiện tại.
- Status chính xác là `NeedRework`.
- Người dùng xác nhận thao tác phá hủy.
- Frontend đọc lại trạng thái mới nhất trước khi gọi DELETE.

Backend vẫn phải kiểm tra lại.

### 9.9 Gửi Resolution

```http
GET  /api/management/incidents/{incidentId}/resolutions
POST /api/management/incidents/{incidentId}/resolutions
```

Payload:

```json
{
  "providerAssignmentId": 123,
  "resolutionSummary": "Đã xử lý xong",
  "actionTaken": "Kiểm tra, thay thế và vệ sinh hiện trường",
  "resultNote": "Ghi chú tùy chọn"
}
```

`providerAssignmentId` không có trong nhánh Staff tự xử lý.

Frontend không gửi lại `imageUrls` vì minh chứng đã nằm trong completion-documents. Gửi lại URL có nguy cơ tạo bản ghi trùng.

### 9.10 Khi nào được submit?

- Lần đầu: Incident `InProgress` và chưa có Resolution.
- Gửi lại: Incident `NeedRework`.
- Phải đúng Staff được giao.
- Không được gửi lần hai khi vẫn `InProgress` và đã có Resolution.

File logic: [`../apps/web/src/pages/staff/staffIncidentResolution.js`](../apps/web/src/pages/staff/staffIncidentResolution.js).

### 9.11 Vì sao trước mutation lại fetch lại dữ liệu?

Trong thời gian Staff mở trang, Manager có thể đổi trạng thái hoặc assignment. Frontend đọc lại Incident/assignment để tránh mutation dựa trên state cũ.

Đây là optimistic concurrency phía UI; backend vẫn phải thực hiện kiểm tra atomic.

---

## 10. Report, Conversation, Area Alert và Coordinator Web

### 10.1 Tra cứu Report

Files:

- [`../apps/web/src/pages/staff/ManagementFeedbackListPage.jsx`](../apps/web/src/pages/staff/ManagementFeedbackListPage.jsx)
- [`../apps/web/src/pages/staff/ManagementFeedbackDetailPage.jsx`](../apps/web/src/pages/staff/ManagementFeedbackDetailPage.jsx)

API:

```http
GET /api/management/feedbacks
GET /api/management/feedbacks/{feedbackId}
```

Staff chỉ tra cứu và trao đổi. AI metadata chỉ là tham khảo; Staff không có nút Verify/Reject.

### 10.2 Conversation queue

File: [`../apps/web/src/pages/staff/ConversationQueuePage.jsx`](../apps/web/src/pages/staff/ConversationQueuePage.jsx).

Luồng:

1. Tải các Feedback.
2. Tải message của từng Feedback để biết Feedback nào có hội thoại.
3. Hiển thị queue và số message.
4. Mở chi tiết để chat.

API:

```http
GET  /api/feedbacks/{feedbackId}/messages?includeInternal=true|false
POST /api/feedbacks/{feedbackId}/messages
```

Public message:

```json
{
  "messageText": "Nội dung",
  "isInternal": false
}
```

Internal note:

```json
{
  "messageText": "Nội dung nội bộ",
  "isInternal": true
}
```

### 10.3 Request information

File: [`../apps/web/src/pages/staff/RequestInfoWorkspacePage.jsx`](../apps/web/src/pages/staff/RequestInfoWorkspacePage.jsx).

Nó thực chất dùng message public để yêu cầu người dân bổ sung thông tin.

### 10.4 Area Alert

Files:

- [`../apps/web/src/pages/staff/AreaAlertManagementPage.jsx`](../apps/web/src/pages/staff/AreaAlertManagementPage.jsx)
- [`../apps/web/src/pages/staff/AreaAlertCreatePage.jsx`](../apps/web/src/pages/staff/AreaAlertCreatePage.jsx)

API chính:

```http
GET  /api/management/area-alerts
POST /api/management/area-alerts
```

Chi tiết Report cũng có thể tạo Area Alert từ Feedback.

### 10.5 Coordinator directory

Files:

- [`../apps/web/src/pages/staff/CoordinatorDirectoryPage.jsx`](../apps/web/src/pages/staff/CoordinatorDirectoryPage.jsx)
- [`../apps/web/src/pages/staff/CoordinatorDetailPage.jsx`](../apps/web/src/pages/staff/CoordinatorDetailPage.jsx)

API chính:

```http
GET /api/management/service-providers
GET /api/management/service-providers/{coordinatorId}
GET /api/management/service-providers/{coordinatorId}/coverages
```

Staff xem danh bạ để biết đơn vị, người liên hệ và phạm vi phục vụ.

### 10.6 Route cũ

Các route như queue/duplicates/provider-report cũ được redirect. File:

[`../apps/web/src/roles/system-staff/permissions.js`](../apps/web/src/roles/system-staff/permissions.js).

Khi bảo vệ, nói theo flow Incident mới, không mô tả duplicate decision hoặc Provider Report legacy là chức năng Staff hiện tại.

---

# PHẦN III — TOÀN BỘ MOBILE

## 11. Mobile khởi động như thế nào?

File gốc: [`../apps/mobile/app/_layout.tsx`](../apps/mobile/app/_layout.tsx).

### Thứ tự khởi tạo

1. Giữ native splash.
2. Gọi `initApi()` trước khi child fetch dữ liệu.
3. Load font Geist.
4. Mount Gesture Handler.
5. Mount SafeAreaProvider.
6. Mount KeyboardProvider.
7. Mount QueryClientProvider.
8. Mount ToastProvider.
9. Chờ Zustand hydrate user.
10. Chọn workspace theo role.

### Vì sao phải chờ `hasHydrated`?

User được persist trong AsyncStorage. Nếu router chạy trước khi storage đọc xong, app có thể thoáng redirect về login rồi lại nhảy vào app. Chờ hydration tránh flicker và redirect sai.

---

## 12. Mobile routing và bảo vệ workspace

File: [`../apps/mobile/src/features/auth/mobile-access.ts`](../apps/mobile/src/features/auth/mobile-access.ts).

Quy tắc:

```text
Không có user
→ /(auth)/login

Role không phải ServiceUser/SystemStaff
→ /unsupported-role

isVerified !== true
→ /(auth)/verify-phone

SystemStaff
→ /(staff)/staff

ServiceUser
→ /(resident)
```

`Stack.Protected` ngăn workspace trái role được mount. `useAuthGuard` xử lý redirect khi session hoặc route thay đổi.

Deep link không thể dùng để bỏ qua verification hoặc đi chéo từ Resident sang Staff.

---

## 13. Mobile authentication

### File quan trọng

| File | Vai trò |
| --- | --- |
| `app/(auth)/login.tsx` | Form login và Google OAuth |
| `auth.store.ts` | Zustand state/actions |
| `auth.service.ts` | Chuyển API response thành User, lưu token |
| `config/api.ts` | Kết nối shared API với AsyncStorage |
| `axiosClient.js` | Interceptor token/refresh |
| `firebase-phone.service.ts` | Firebase phone OTP |

### Login email/password

```text
LoginScreen.handleLogin
→ useAuthStore.login(email, password)
→ AuthService.login
→ authApi.login
→ POST /api/auth/login
→ buildUser
→ lưu access + refresh token
→ getMobileEntry(user)
→ route đúng role
```

### Google login

```text
Expo Google Auth Session
→ lấy Google ID token
→ POST /api/auth/google-login
→ backend tạo phiên UrbanMind
→ lưu access + refresh token
```

### Phone verification

```text
POST /api/auth/phone-verification/request-otp
→ backend kiểm tra hạn mức/cho phép gửi
→ Firebase gửi SMS OTP
→ user nhập OTP
→ Firebase trả ID token
→ POST /api/auth/phone-verification/verify
→ backend trả phiên đã verified
```

Backend được gọi trước Firebase send để tránh tự ý phát SMS có chi phí.

### Tại sao bắt buộc cả access và refresh token?

Nếu thiếu một token, session không hoàn chỉnh. Code xóa token và từ chối đăng nhập thay vì giữ một phiên nửa vời.

### Refresh token hoạt động thế nào?

1. API trả 401.
2. Nếu không phải auth request và chưa retry, gọi refresh.
3. Dùng một `refreshPromise` chung: nhiều 401 đồng thời chỉ tạo một refresh request.
4. Lưu access token mới và refresh token đã rotate.
5. Cập nhật role/verification của user.
6. Retry request cũ một lần.
7. Nếu refresh bị từ chối, xóa token, clear query cache và logout.

### Vì sao gọi là single-flight refresh?

Vì tại một thời điểm chỉ có một request refresh đang bay; các request khác chờ cùng Promise. Điều này tránh nhiều refresh request cùng dùng một refresh token đã bị rotate.

---

## 14. Zustand và React Query khác nhau thế nào?

### Zustand

Dùng cho client state:

- User đăng nhập.
- Auth loading/error.
- Form draft tạo phản ánh.
- Các state không phải bản sao trực tiếp của dữ liệu server.

### React Query

Dùng cho server state:

- Incident.
- Feedback.
- Message.
- Notification.
- SLA.
- Community feed.

React Query hỗ trợ:

- Cache.
- Loading/error.
- Retry.
- Stale time.
- Refetch.
- Invalidate sau mutation.
- Hủy request qua `signal`.

### Tại sao query key chứa userId?

Ví dụ:

```js
['staff', userId, 'incident', incidentId]
```

Nếu chỉ dùng `incidentId`, Staff B có thể nhìn thấy cache mà Staff A vừa tải sau khi đổi tài khoản. Thêm `userId` cô lập cache theo phiên.

---

## 15. Resident Mobile

### 15.1 Navigation

File: [`../apps/mobile/app/(resident)/_layout.tsx`](../apps/mobile/app/(resident)/_layout.tsx).

Bottom navigation:

- Trang chủ.
- Cộng đồng.
- Tạo phản ánh.
- Hộp thư.
- Tài khoản.

Một số màn ẩn bottom nav để dành chỗ cho form/chat, ví dụ create feedback, AI, chat, community detail.

### 15.2 Home

File: [`../apps/mobile/app/(resident)/index.tsx`](../apps/mobile/app/(resident)/index.tsx).

`useHomeData` tải song song:

- Feedback của người dùng.
- Public community incidents.

UI gồm hero, quick actions, nearby incidents, community preview và active tickets.

### 15.3 Tạo Feedback

File lớn nhất:

[`../apps/mobile/src/features/reporting/components/create-feedback-wizard-screen.tsx`](../apps/mobile/src/features/reporting/components/create-feedback-wizard-screen.tsx).

Luồng tổng quát:

1. Tải Area và Category.
2. Nhập tiêu đề/mô tả/category.
3. Chọn vị trí hoặc lấy GPS.
4. Có thể thêm ảnh.
5. Review.
6. Build payload.
7. Gọi `feedbackApi.create()`.
8. Invalidate list/community cache.
9. Pre-populate detail cache.
10. Điều hướng tới Feedback mới.

API wrapper: [`../apps/mobile/src/features/reporting/api/feedback-api.ts`](../apps/mobile/src/features/reporting/api/feedback-api.ts).

Create dùng multipart qua shared `ticketApi`.

Payload nghiệp vụ gồm:

- `categoryId`.
- `title`.
- `description`.
- `locationText`.
- `latitude`, `longitude`.
- `locationAccuracyMeters`.
- `geoSource`.
- `areaId`.
- attachments.

Evidence là tùy chọn. GPS metadata phải phản ánh đúng nguồn, không được giả vị trí chính xác nếu không có.

### 15.4 Feedback list/detail/review

Files:

- `tickets-screen.tsx`: toàn bộ Feedback của user.
- `ticket-detail-screen.tsx`: trạng thái, timeline, result, chat link.
- `ticket-review-screen.tsx`: đánh giá kết quả đã duyệt.

API:

```text
feedbackApi.listAll()
→ ticketApi.getAllTickets()

feedbackApi.getById(id)
→ ticketApi.getTicketById()

feedbackApi.getResolutions(id)
→ GET .../{feedbackId}/resolutions

feedbackApi.submitReview(...)
→ POST .../{feedbackId}/resolution-review
```

Resident chỉ được đánh giá khi kết quả đã public/approved và có Resolution.

### 15.5 Community

API wrapper: [`../apps/mobile/src/features/community/api/community-api.ts`](../apps/mobile/src/features/community/api/community-api.ts).

Các endpoint:

```http
GET  /api/public/incidents
GET  /api/public/incidents/{incidentId}
GET  /api/public/incidents/{incidentId}/resolution
GET  /api/public/incidents/{incidentId}/timeline
GET  /api/public/incidents/{incidentId}/comments
POST /api/user/incidents/{incidentId}/comments
POST/DELETE /api/user/incidents/{incidentId}/support
POST/DELETE /api/user/incidents/{incidentId}/subscribe
GET  /api/user/incidents/me
```

Community là Incident-centric; danh sách phản ánh cá nhân là Feedback-centric.

Support card dùng optimistic update: số support đổi ngay, nếu API lỗi thì rollback.

### 15.6 Resident chat và AI

API wrapper: [`../apps/mobile/src/features/messaging/api/messaging-api.ts`](../apps/mobile/src/features/messaging/api/messaging-api.ts).

Resident chat:

```http
GET  /api/feedbacks/{feedbackId}/messages?includeInternal=false
POST /api/feedbacks/{feedbackId}/messages
```

Resident luôn gửi `isInternal: false`.

AI:

```http
GET    /api/ai/conversations/me
GET    /api/ai/conversations/{conversationId}/messages
POST   /api/ai/chat
DELETE /api/ai/conversations/{conversationId}
POST   /api/ai/feedback-draft
```

AI draft chỉ hỗ trợ soạn nội dung; người dùng vẫn review form cuối trước khi tạo Feedback.

### 15.7 Notification

```http
GET   /api/notifications
PATCH /api/notifications/{notificationId}/read
PATCH /api/notifications/read-all
```

ID notification được validate là positive int32 để không thể chèn path vào URL.

### 15.8 Area Alert Resident

```http
GET    /api/user/area-alerts
GET    /api/user/area-subscriptions
POST   /api/user/area-subscriptions
DELETE /api/user/area-subscriptions/{areaId}
```

Resident có thể theo dõi/bỏ theo dõi khu vực để nhận alert.

### 15.9 Profile

Profile Resident được phép đọc/sửa qua `userApi`. Staff mobile không dùng endpoint sửa profile vì profile contract hiện dành cho ServiceUser.

---

## 16. Staff Mobile: route và màn hình

### Cấu trúc route

```text
app/(staff)/staff
├── (tabs)
│   ├── home
│   ├── incidents
│   ├── feedbacks
│   ├── conversations
│   └── account
├── incidents/[id]
├── incidents/[id]/execution
├── incidents/[id]/provider
├── incidents/[id]/resolution
├── feedbacks/[id]
├── feedbacks/[id]/chat
└── notifications
```

Tab layout: [`../apps/mobile/app/(staff)/staff/(tabs)/_layout.tsx`](../apps/mobile/app/(staff)/staff/(tabs)/_layout.tsx).

### Mỗi màn làm gì?

| Màn | Component |
| --- | --- |
| Tổng quan | `staff-home-screen.tsx` |
| List Incident/Report/Conversation | `staff-list-screen.tsx` |
| Detail Incident/Report | `staff-detail-screen.tsx` |
| Guided execution | `staff-execution-flow-screen.tsx` |
| Chat | `staff-chat-screen.tsx` |
| Notification | `staff-notifications-screen.tsx` |
| Account | `staff-account-screen.tsx` |

### Staff API wrapper

File: [`../apps/mobile/src/features/staff/staff-api.ts`](../apps/mobile/src/features/staff/staff-api.ts).

Nó cung cấp:

- `lookups()`.
- `feedbacks()`.
- `feedback()`.
- `incidents()`.
- `dashboard()`.
- `incident()`.
- `timeline()`.
- `messages()`.
- `sendMessage()`.

`staffKeys` định nghĩa query key có đủ user/record/page để cache không đụng nhau.

---

## 17. Dashboard, list và detail Staff Mobile

### 17.1 Dashboard

File: [`../apps/mobile/src/features/staff/components/staff-home-screen.tsx`](../apps/mobile/src/features/staff/components/staff-home-screen.tsx).

Luồng:

```text
useAuthStore → userId
→ useQuery(staffKeys.dashboard(userId))
→ staffApi.dashboard(userId)
→ staffApi.incidents(...assignedStaffUserId=userId)
→ GET /api/management/incidents
```

Sau đó tải SLA active Incident và sắp xếp attention list giống web.

### 17.2 List

Một component dùng ba mode:

- `incidents`.
- `feedbacks`.
- `conversations`.

Incident có filter status/priority/severity/area/category. Report và Conversation dùng danh sách Report.

Search được debounce 350 ms để không gọi API sau từng phím ngay lập tức.

### 17.3 Detail

Incident detail có tab:

- Tổng quan.
- Reports.
- Timeline.

Report detail có:

- Nội dung.
- Incident liên quan.
- Metadata.
- Attachment.
- AI summary/confidence.
- Link chat.

AI chỉ là tham khảo, không thay quyết định Manager.

---

## 18. Guided execution flow Staff Mobile

File trung tâm:

[`../apps/mobile/src/features/staff/components/staff-execution-flow-screen.tsx`](../apps/mobile/src/features/staff/components/staff-execution-flow-screen.tsx).

API wrapper:

[`../apps/mobile/src/features/staff/staff-execution-api.ts`](../apps/mobile/src/features/staff/staff-execution-api.ts).

Models/guards:

[`../apps/mobile/src/features/staff/staff-execution-models.ts`](../apps/mobile/src/features/staff/staff-execution-models.ts).

Flow models:

[`../apps/mobile/src/features/staff/staff-execution-flow-models.ts`](../apps/mobile/src/features/staff/staff-execution-flow-models.ts).

### 18.1 Các query khi mở flow

1. Incident.
2. Provider assignment.
3. Provider candidates nếu cần.
4. Contact logs nếu có assignment.
5. Evidence theo đúng nhánh.
6. Resolution history.
7. Draft từ AsyncStorage.

### 18.2 Draft được lưu thế nào?

Key:

```text
urbanmind:staff-execution:<userId>:<incidentId>
```

Draft gồm:

- Mode provider/direct.
- Active step.
- Coordinator đang chọn.
- Ghi chú assignment.
- Form liên hệ.
- Mô tả evidence.
- Form Resolution.
- Evidence skipped hay chưa.

Draft được debounce 350 ms trước khi ghi AsyncStorage.

File đã chọn từ camera/document picker không persist lâu dài; chỉ metadata form được giữ. Đây là tránh giữ URI tạm đã hết hạn.

### 18.3 Chống double-submit

`operation.current` là một ref boolean. Nếu đang có mutation, lần bấm tiếp theo bị bỏ qua.

State `busy` dùng để hiển thị loading/disable nút.

### 18.4 Kiểm tra session

Trước và sau request, `requireSession()` kiểm tra:

- User ID vẫn là user đang mở flow.
- Role vẫn là SystemStaff.
- User vẫn verified.

Nếu user đổi trong lúc request chạy, app không dùng response đó để cập nhật màn hình.

### 18.5 `freshState()` dùng để làm gì?

Trước mutation:

1. Đọc Incident mới nhất.
2. Kiểm tra ownership/status.
3. Đọc assignment mới nhất.
4. Ghi dữ liệu mới vào cache.

Điều này giảm lỗi do màn hình cũ.

### 18.6 Provider flow mobile

```text
Chọn mode provider
→ tải candidates
→ chọn coordinator
→ freshState
→ đọc lại candidates để kiểm tra lựa chọn còn hợp lệ
→ assign Incident Provider
→ nếu Incident còn Assigned, đổi assignment sang InProgress
→ refetch
→ chuyển bước Contact
```

### 18.7 Direct flow mobile

```text
Chọn mode direct
→ freshState
→ đảm bảo chưa có assignment
→ POST start-processing
→ refetch
→ chuyển bước Evidence
```

### 18.8 Contact

Input:

- Phương thức.
- Kết quả.
- Ghi chú.
- Thời gian dạng `dd/MM/yyyy HH:mm`.

Frontend parse local time thành ISO trước khi gửi.

### 18.9 Evidence

Nguồn file:

- Camera.
- Image library.
- Document picker.

Hỗ trợ image và PDF. FormData validate toàn bộ batch trước khi append.

File URL nhận từ backend chỉ được mở/render nếu là HTTP(S).

### 18.10 Resolution

Trước submit:

1. Validate summary/action.
2. Không cho gửi nếu còn asset chưa upload.
3. `freshState()`.
4. Đọc Resolution history mới nhất.
5. Tính submission mode.
6. Kiểm tra đúng evidence store.
7. POST Resolution.
8. Xóa draft.
9. Invalidate/refetch.

### 18.11 Vì sao response POST Resolution có thể rỗng?

Contract thành công có thể là HTTP 200 không body. Vì vậy client không dựa vào response mà refetch authoritative state.

---

## 19. Staff chat, notification, account và responsive mobile

### 19.1 Staff chat

File: [`../apps/mobile/src/features/staff/components/staff-chat-screen.tsx`](../apps/mobile/src/features/staff/components/staff-chat-screen.tsx).

Staff đọc:

```http
GET /api/feedbacks/{feedbackId}/messages?includeInternal=true
```

Hai loại draft được tách key:

```text
<userId>:<feedbackId>:public
<userId>:<feedbackId>:internal
```

Việc này tránh toggle switch làm một ghi chú nội bộ trở thành tin public.

### Optimistic message

1. Tạo message tạm `temp-*`.
2. Chèn vào cache ngay.
3. API thành công: thay bằng message thật.
4. API lỗi: rollback cache.
5. Draft input được giữ để retry.

### SignalR và fallback

File: [`../apps/mobile/src/features/messaging/realtime/use-ticket-messages-realtime.ts`](../apps/mobile/src/features/messaging/realtime/use-ticket-messages-realtime.ts).

```text
Kết nối /hubs/ticket-messages
→ JoinTicket(feedbackId)
→ nghe TicketMessageReceived
```

- Socket tốt: reconcile REST mỗi 30 giây.
- Socket lỗi: polling REST mỗi 2 giây.
- Màn mất focus/app background: dừng kết nối không cần thiết.

### 19.2 Notification

Staff notification chỉ điều hướng đến route nội bộ đã biết. Không mở tùy ý `targetUrl` từ server để tránh open redirect/deep-link injection.

Ưu tiên target:

1. `targetType + targetId`.
2. `incidentId`.
3. Legacy `relatedType + relatedId`.
4. Chỉ chấp nhận targetUrl khớp regex Staff nội bộ.

### 19.3 Account

Staff account chỉ hiển thị dữ liệu session và logout. Không có form sửa profile vì endpoint profile hiện dành cho ServiceUser.

### 19.4 Safe area và accessibility

Staff layout tính:

- Top/bottom system inset.
- Tab bar đã consume bottom inset chưa.
- Tablet max readable width.
- Font scale và line height.
- Tối thiểu 48dp hit target.

Bottom tab có 5 destination và giới hạn scale của fixed chrome để vẫn vừa ở font 200%; accessibility service vẫn đọc nhãn đầy đủ.

File: [`../apps/mobile/src/features/staff/staff-layout.ts`](../apps/mobile/src/features/staff/staff-layout.ts).

---

# PHẦN IV — API, LỖI, BẢO MẬT VÀ TEST

## 20. Bảng API Staff quan trọng

| Chức năng | Method | Endpoint |
| --- | --- | --- |
| List Incident | GET | `/api/management/incidents` |
| Incident detail | GET | `/api/management/incidents/{id}` |
| Timeline | GET | `/api/management/incidents/{id}/timeline` |
| Direct start | POST | `/api/management/incidents/{id}/start-processing` |
| SLA status | GET | `/api/slas/incident/{id}/status` |
| Provider candidates | GET | `/api/management/incidents/{id}/provider-candidates` |
| Current assignment | GET | `/api/management/incidents/{id}/provider-assignment` |
| Assign Provider | POST | `/api/management/incidents/{id}/provider-assignment` |
| Provider start/status | PATCH | `/api/management/provider-assignments/{assignmentId}/status` |
| Contact logs | GET/POST | `/api/management/provider-assignments/{assignmentId}/contact-logs` |
| Provider evidence | GET/POST/DELETE | `/api/management/provider-assignments/{assignmentId}/completion-documents` |
| Direct evidence | GET/POST/DELETE | `/api/management/incidents/{id}/completion-documents` |
| Resolutions | GET/POST | `/api/management/incidents/{id}/resolutions` |
| Report list | GET | `/api/management/feedbacks` |
| Report detail | GET | `/api/management/feedbacks/{feedbackId}` |
| Messages | GET/POST | `/api/feedbacks/{feedbackId}/messages` |
| Notifications | GET | `/api/notifications` |
| Mark read | PATCH | `/api/notifications/{id}/read` |
| Mark all read | PATCH | `/api/notifications/read-all` |

---

## 21. Error handling và bảo mật

### 21.1 HTTP error thường gặp

| Status | Ý nghĩa trong flow Staff |
| --- | --- |
| 400 | Payload không hợp lệ |
| 401 | Access token hết hạn/không hợp lệ |
| 403 | Sai role hoặc không còn ownership |
| 404 | Không tìm thấy resource; một số GET assignment/SLA dùng như “chưa có” |
| 409 | Dữ liệu/trạng thái vừa thay đổi, transition conflict |
| 429 | Rate limited |
| 5xx | Backend lỗi |

### 21.2 Retry

Staff mobile không retry lỗi 4xx vì gửi lại cùng request không thể tự sửa validation/auth/conflict. Lỗi network/5xx chỉ retry giới hạn.

### 21.3 URL/file safety

- ID được encode trước khi ghép path.
- Notification ID phải là positive int32.
- Attachment/evidence URL chỉ chấp nhận HTTP(S).
- Notification target chỉ chấp nhận route nội bộ biết trước.
- Filename upload không được có CR/LF.

### 21.4 Token

Mobile hiện lưu token trong AsyncStorage thông qua adapter của shared API. Đây là điểm có thể cải thiện: production nên cân nhắc `expo-secure-store`/Android Keystore/iOS Keychain cho token nhạy cảm.

Zustand persist user nhưng blank trường `token`; token thật được quản lý riêng bởi shared API storage.

### 21.5 Logging

Axios redact key có chữ token/password/secret trước khi log request data. Dù vậy production nên giảm console logging để tránh metadata nhạy cảm và noise.

---

## 22. Kiểm thử hiện tại

Các lệnh đã chạy trên source hiện tại:

```bash
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile test:staff
pnpm --dir apps/mobile test:resident
pnpm test
```

Kết quả:

- TypeScript mobile: pass.
- Staff mobile: 54/54 pass.
- Resident mobile: 20/20 pass.
- Shared/web selected unit tests: 50/50 pass.

### Test kiểm tra những gì?

- Role/deep-link không vượt workspace.
- Staff API không lộ Manager actions.
- Scope Incident theo current Staff.
- Provider/direct execution contract.
- Evidence FormData.
- NeedRework guards.
- Resolution rules.
- Chat internal/public và SignalR fallback.
- Safe area, font scale, tab geometry.
- Resident data không dùng fake/sample.
- Feedback/community tách đúng domain.

### Unit test không chứng minh điều gì?

Unit test pass không đảm bảo backend production, mạng, Firebase, mọi firmware/OEM đều hoạt động. Nó chứng minh các hàm và contract frontend đang đáp ứng các case đã viết.

---

# PHẦN V — BỘ CÂU HỎI VÀ TRẢ LỜI MẪU

## 23. Câu hỏi bảo vệ

### Nhóm A — Kiến trúc chung

#### Câu 1: Dự án dùng kiến trúc gì?

**Trả lời:**

> Đây là monorepo gồm web React/Vite, mobile Expo/React Native và các package dùng chung. Shared API gom Axios client, endpoint wrapper và refresh token; shared types gom role/status để giảm khác biệt giữa web và mobile.

**Code:** `package.json`, `pnpm-workspace.yaml`, `packages/shared-api`.

#### Câu 2: Tại sao tạo shared API thay vì gọi Axios trực tiếp ở mọi component?

**Trả lời:**

> Để tái sử dụng contract giữa web/mobile, gắn token thống nhất, xử lý refresh 401 một chỗ, normalize payload/response và giảm lỗi URL khác nhau.

**Code:** `packages/shared-api/src/axiosClient.js`.

#### Câu 3: Feedback khác Incident thế nào?

**Trả lời:**

> Feedback là phản ánh của một người dân; Incident là sự vụ nghiệp vụ có thể gom nhiều Feedback. Staff được phân công và xử lý Incident, còn chat gắn với từng Feedback.

#### Câu 4: Vì sao không dùng `reports[0]` làm đại diện?

**Trả lời:**

> Thứ tự reports không phải contract nghiệp vụ. Chọn phần tử đầu có thể giao Provider hoặc tạo Resolution dựa trên Report sai. Execution API phải dùng `incidentId`.

---

### Nhóm B — Dashboard Staff Web

#### Câu 5: `assignedStaffUserId` lấy từ đâu?

**Trả lời:**

> Nó được đọc từ authenticated `user` trong AuthContext bằng `user.userId ?? user.id`. User ban đầu được tạo từ response đăng nhập/backend.

**Code:** `StaffIncidentDashboardPage.jsx`.

#### Câu 6: Nó được gửi lên API thế nào?

**Trả lời:**

> Page truyền ID vào `useStaffIncidentDashboard`, hook truyền vào helper, helper gọi `incidentManagementApi.getIncidents`. Shared API đổi camelCase thành query `AssignedStaffUserId` và gửi GET `/api/management/incidents`.

#### Câu 7: Nếu thiếu ID thì sao?

**Trả lời:**

> Hook fail-closed thành `SCOPE_UNAVAILABLE` và không gọi API. Helper cũng throw nếu bị gọi trực tiếp thiếu ID. Nó không lấy toàn bộ Incident.

#### Câu 8: Tại sao không chỉ lấy trang đầu để tính KPI?

**Trả lời:**

> Vì KPI phải phản ánh toàn bộ Incident được giao. API phân trang nên trang đầu không đủ dữ liệu; frontend tải tất cả trang trước khi đếm.

#### Câu 9: Tại sao gọi các trang theo batch 4?

**Trả lời:**

> Để nhanh hơn gọi tuần tự nhưng tránh burst/rate limit và tải quá nhiều request đồng thời lên backend.

#### Câu 10: Vì sao phải deduplicate?

**Trả lời:**

> Dữ liệu có thể đổi thứ tự giữa lúc tải nhiều trang, khiến một Incident xuất hiện hai lần. Map theo `incidentId` giữ một bản, ưu tiên bản cập nhật mới hơn.

#### Câu 11: SLA Dashboard lấy từ đâu?

**Trả lời:**

> `slaApi.getIncidentSlaStatus(incidentId)` gọi GET `/api/slas/incident/{incidentId}/status`. Dashboard tải cho Incident active theo batch.

#### Câu 12: Vì sao đây có thể là N+1?

**Trả lời:**

> Sau một hoặc nhiều request lấy Incident, frontend gọi thêm một request SLA cho mỗi Incident. Có batch giới hạn tải nhưng vẫn nhiều request. Có thể tối ưu bằng API dashboard aggregation.

---

### Nhóm C — Incident execution

#### Câu 13: Staff bắt đầu Incident theo những cách nào?

**Trả lời:**

> Có hai nhánh: phối hợp Provider hoặc tự xử lý. Provider flow tạo assignment rồi PATCH assignment từ `Reported` sang `InProgress`; direct flow POST endpoint `start-processing` của Incident.

#### Câu 14: Provider candidate được chọn theo gì?

**Trả lời:**

> Backend lọc bằng area và category của Incident. Frontend chỉ hiển thị candidates backend trả về và kiểm tra lại candidate trước mutation.

#### Câu 15: Tại sao assignment body không có Staff ID?

**Trả lời:**

> Actor phải được backend lấy từ JWT. Nếu tin Staff ID trong body, client có thể giả mạo người thực hiện.

#### Câu 16: 204 ở current assignment nghĩa là gì?

**Trả lời:**

> Incident chưa có Provider assignment. Shared API normalize thành `null`, không coi là crash/error.

#### Câu 17: Provider status và Incident status có giống nhau không?

**Trả lời:**

> Là hai trạng thái khác domain. Provider assignment có `Reported/InProgress/...`; Incident có `Assigned/InProgress/...`. Backend đồng bộ Incident khi bắt đầu provider flow theo contract.

#### Câu 18: Contact log lưu gì?

**Trả lời:**

> Phương thức, kết quả, ghi chú và thời gian liên hệ. Nó gắn với `providerAssignmentId`, tạo audit quá trình phối hợp.

#### Câu 19: Upload file dùng gì?

**Trả lời:**

> Dùng FormData/multipart với `Description` và nhiều `Files`. Không dùng JSON vì JSON không truyền binary file trực tiếp hiệu quả.

#### Câu 20: Vì sao có hai endpoint evidence?

**Trả lời:**

> Provider flow có assignment nên evidence gắn `providerAssignmentId`; direct flow không có assignment nên evidence gắn thẳng `incidentId`.

#### Câu 21: Khi nào được xóa evidence?

**Trả lời:**

> Chỉ khi Incident đang `NeedRework`, thuộc đúng Staff và người dùng xác nhận. Frontend đọc lại state trước DELETE; backend kiểm tra cuối.

#### Câu 22: Khi nào được gửi Resolution đầu tiên?

**Trả lời:**

> Incident phải thuộc Staff, đang `InProgress` và chưa có Resolution.

#### Câu 23: Khi nào được gửi lại?

**Trả lời:**

> Khi status là `NeedRework`. Client tạo Resolution mới, không sửa/xóa lịch sử cũ.

#### Câu 24: Tại sao không gửi `imageUrls` cùng Resolution?

**Trả lời:**

> File đã upload trong completion-documents. Gửi lại URL có thể làm backend tạo evidence trùng và Manager thấy bản sao.

#### Câu 25: Vì sao POST Resolution không dùng response?

**Trả lời:**

> Contract thành công có thể trả 200 không body. Client refetch Incident/Resolution/timeline làm authoritative state.

#### Câu 26: Race condition ở đây là gì?

**Trả lời:**

> Staff mở màn hình ở trạng thái Assigned nhưng Manager có thể đổi assignment/status trước khi Staff bấm. Vì vậy client fetch state mới trước mutation và backend kiểm tra atomically.

---

### Nhóm D — Report và chat

#### Câu 27: Staff có được Verify Report không?

**Trả lời:**

> Không. Staff chỉ xem, trao đổi và xem lịch sử. Verify/Reject và duplicate decision thuộc Manager.

#### Câu 28: Public message và internal note khác nhau thế nào?

**Trả lời:**

> Cùng endpoint message nhưng payload `isInternal` khác nhau. Public message người dân đọc được; internal note chỉ nhân sự nội bộ đọc.

#### Câu 29: Vì sao Staff GET messages dùng `includeInternal=true`?

**Trả lời:**

> Staff cần thấy cả hội thoại công khai và ghi chú nội bộ. Resident dùng `false` để tuyệt đối không nhận internal note.

#### Câu 30: Optimistic chat là gì?

**Trả lời:**

> Message tạm được chèn vào cache trước khi API xong để UI phản hồi ngay. Thành công thì thay bằng message thật; lỗi thì rollback và giữ draft.

#### Câu 31: Tại sao tách draft public/internal?

**Trả lời:**

> Để khi đổi switch audience, nội dung ghi chú nội bộ không vô tình trở thành tin gửi người dân.

#### Câu 32: SignalR lỗi thì sao?

**Trả lời:**

> Chat vẫn hoạt động bằng REST polling mỗi 2 giây. Khi SignalR kết nối, event realtime cập nhật cache và REST reconcile mỗi 30 giây.

---

### Nhóm E — Mobile architecture/auth

#### Câu 33: Expo Router hoạt động thế nào?

**Trả lời:**

> File trong thư mục `app` tạo route. Route file chủ yếu export component thật trong `src/features`, giúp tách navigation khỏi nghiệp vụ.

#### Câu 34: Vì sao dùng Zustand và React Query cùng lúc?

**Trả lời:**

> Zustand cho client state/session/draft; React Query cho server state cần cache, retry, invalidation và refetch.

#### Câu 35: Tại sao chờ Zustand hydrate?

**Trả lời:**

> User được đọc bất đồng bộ từ AsyncStorage. Chờ hydrate tránh redirect nhầm về login và flicker khi app mở.

#### Câu 36: Mobile chặn sai role thế nào?

**Trả lời:**

> `getMobileEntry`, `getMobileRedirect` và `Stack.Protected` kiểm tra role cùng `isVerified === true`. Deep link cũng phải qua guard.

#### Câu 37: Refresh token single-flight giải quyết gì?

**Trả lời:**

> Nhiều API có thể cùng 401. Một Promise refresh chung tránh gọi refresh nhiều lần bằng token đã rotate và tránh race session.

#### Câu 38: Khi refresh trả user ID khác thì sao?

**Trả lời:**

> Coi là session mismatch, xóa token, clear cache và logout để không trộn dữ liệu hai tài khoản.

#### Câu 39: Vì sao query key có user ID?

**Trả lời:**

> Để cache của tài khoản trước không bị dùng lại cho tài khoản sau.

#### Câu 40: Hạn chế bảo mật token mobile hiện tại?

**Trả lời:**

> Token đang dùng AsyncStorage. Có thể nâng cấp sang SecureStore/Keystore/Keychain cho production. Tuy nhiên app đã tách token khỏi user state persist và xóa cả token/cache khi session lỗi.

---

### Nhóm F — Resident Mobile

#### Câu 41: Flow tạo Feedback gồm gì?

**Trả lời:**

> Nhập nội dung/category, chọn vị trí/GPS, thêm evidence tùy chọn, review, build multipart payload, create, invalidate cache và mở detail mới.

#### Câu 42: Tại sao cần `locationAccuracyMeters` và `geoSource`?

**Trả lời:**

> Để backend biết độ chính xác và nguồn tọa độ; frontend không được trình bày tọa độ thủ công như GPS chính xác.

#### Câu 43: Community dùng Feedback hay Incident?

**Trả lời:**

> Community dùng Incident vì cộng đồng theo dõi một sự vụ chung. “Phản ánh của tôi” dùng Feedback vì đó là submission riêng của từng người.

#### Câu 44: Support khác subscribe thế nào?

**Trả lời:**

> Support là đồng tình với sự vụ; subscribe là theo dõi để nhận cập nhật.

#### Câu 45: Khi nào Resident được review kết quả?

**Trả lời:**

> Khi status kết quả đã được public/approved, có Resolution và chưa có review hiện tại.

#### Câu 46: AI có tự submit Feedback không?

**Trả lời:**

> Không. AI hỗ trợ tạo draft; người dùng vẫn review form và thực hiện create chính thức.

---

### Nhóm G — Bảo mật, lỗi và test

#### Câu 47: Frontend guard có phải security không?

**Trả lời:**

> Không phải security boundary. Nó chỉ hỗ trợ UX và defense-in-depth. Backend phải xác thực bằng JWT.

#### Câu 48: Vì sao không retry 403/409?

**Trả lời:**

> Gửi lại cùng request không tự sửa quyền hoặc conflict trạng thái, chỉ tăng tải/rate limit. Người dùng cần refetch và thực hiện theo state mới.

#### Câu 49: Vì sao dùng AbortController?

**Trả lời:**

> Hủy request cũ khi component unmount/filter đổi để response cũ không ghi đè state mới và giảm request thừa.

#### Câu 50: Test pass có nghĩa là không còn bug?

**Trả lời:**

> Không. Nó chỉ chứng minh các case đã viết pass trên môi trường test. Vẫn cần integration test với backend thật, thiết bị thật và kiểm tra network/OEM.

#### Câu 51: Điểm nào bạn muốn cải tiến?

**Trả lời mẫu:**

> Em muốn thêm backend dashboard aggregation để giảm N+1 SLA, chuyển token mobile sang secure storage, gom logic normalize/status web-mobile vào shared package và tách các page web quá lớn thành hook/component nhỏ hơn.

---

# PHẦN VI — BÀI NÓI VÀ CHECKLIST

## 24. Bài nói 90 giây

> Phần em phụ trách gồm workspace System Staff trên web và ứng dụng mobile. Kiến trúc dự án là monorepo, trong đó web React/Vite và mobile Expo/React Native dùng chung API client và type.
>
> Nghiệp vụ quan trọng nhất là phân biệt Feedback và Incident. Feedback là phản ánh của từng người dân, còn Incident là sự vụ có thể gom nhiều Feedback. Staff được phân công và xử lý trên Incident; chat vẫn theo từng Feedback.
>
> Flow xử lý Incident có hai nhánh. Nếu phối hợp đơn vị, Staff chọn Provider candidate do backend lọc theo khu vực và danh mục, tạo assignment, ghi nhận liên hệ, tải minh chứng và gửi Resolution. Nếu tự xử lý, Staff dùng endpoint start-processing của Incident rồi tải minh chứng trực tiếp vào Incident. Khi Manager yêu cầu NeedRework, Staff tạo một Resolution mới và giữ lịch sử cũ.
>
> Mobile dùng Expo Router để tách workspace theo role, Zustand cho session/draft, React Query cho server state và SignalR cho chat realtime với polling fallback. Trước mutation nhạy cảm, client đọc lại Incident và assignment, kiểm tra session/ownership rồi refetch cache sau thành công. Frontend có UI guard nhưng backend vẫn là lớp phân quyền cuối cùng.

## 25. Bài nói về phần khó nhất

> Phần khó nhất là giữ flow xử lý nhất quán khi dữ liệu có thể thay đổi từ Manager hoặc thiết bị khác. Em giải quyết bằng cách scope cache theo user và Incident, lưu draft riêng theo user/Incident, đọc lại state mới nhất trước mutation, validate ID trong response, khóa double-submit và refetch authoritative state sau mutation. Backend vẫn kiểm tra transaction và authorization cuối cùng.

## 26. Checklist trước khi đi bảo vệ

- [ ] Nói được Feedback khác Incident.
- [ ] Nói được hai nhánh Provider/direct.
- [ ] Nói được status flow.
- [ ] Nói được UI → hook → shared API → endpoint.
- [ ] Nói được `assignedStaffUserId` lấy từ AuthContext.
- [ ] Nói được vì sao frontend tải tất cả trang Dashboard.
- [ ] Nói được Zustand khác React Query.
- [ ] Nói được refresh token single-flight.
- [ ] Nói được public/internal chat.
- [ ] Nói được frontend guard không thay backend security.
- [ ] Nói được ít nhất ba hạn chế/cải tiến.
- [ ] Không mô tả route legacy như chức năng hiện tại.

---

## 27. Những điểm tài liệu cũ không còn đúng

1. Một tài liệu mobile cũ ghi SLA theo Feedback. Source hiện gọi:

   ```http
   GET /api/slas/incident/{incidentId}/status
   ```

2. Smoke report web cũ còn nói `/staff/queue` và duplicate flow. Source hiện redirect các route đó.

3. Tài liệu cũ ghi 44 Staff tests; source hiện chạy 54 Staff tests.

4. Khi trả lời bảo vệ, ưu tiên source hiện tại và `swagger.json`.

---

## 28. Từ điển nhanh

| Thuật ngữ | Nghĩa dễ hiểu |
| --- | --- |
| Component | Khối giao diện React |
| Hook | Hàm React đóng gói state/effect/logic |
| Service/API wrapper | Hàm đóng gói request backend |
| Endpoint | Địa chỉ API |
| Query parameter | Dữ liệu sau `?` trên URL |
| Path parameter | Biến nằm trong đường dẫn như `{incidentId}` |
| Payload/body | Dữ liệu gửi trong request body |
| Mutation | Request làm thay đổi server |
| Query | Request đọc dữ liệu |
| Cache | Bản dữ liệu đã tải giữ tạm ở client |
| Invalidate | Đánh dấu cache cũ để tải lại |
| Refetch | Gọi lại API đọc dữ liệu |
| Optimistic update | Cập nhật UI trước khi API hoàn tất |
| Rollback | Hoàn tác optimistic update khi lỗi |
| Hydration | Khôi phục state từ storage |
| Debounce | Chờ người dùng dừng nhập rồi mới xử lý |
| Race condition | Nhiều thao tác bất đồng bộ làm state sai thứ tự |
| Fail-closed | Thiếu dữ liệu quyền thì từ chối thay vì mở rộng quyền |
| Ownership | Bản ghi có thuộc user hiện tại không |
| Authorization | User có quyền thực hiện hành động không |
| Authentication | Xác định user là ai |
| SLA | Chỉ tiêu/thời hạn phản hồi và xử lý |
| FormData | Dạng dữ liệu multipart để upload file |
| SignalR | Kết nối realtime với backend .NET |

---

## 29. Cách tự lần một chức năng khi bị hỏi bất ngờ

Ví dụ hội đồng hỏi “Nút gửi kết quả gọi API ở đâu?”:

1. Tìm text nút hoặc handler trong component.
2. Tìm hàm handler `submit...`.
3. Xem handler gọi service nào.
4. Mở service/API wrapper.
5. Xem method và endpoint.
6. Xem payload normalize.
7. Xem guard trước request và refetch sau request.

Lệnh tìm nhanh:

```bash
rg "submitResolution" apps packages
rg "provider-assignment" apps packages
rg "completion-documents" apps packages
rg "getIncidentSlaStatus" apps packages
```

Mẫu trả lời:

> Nút nằm ở component A. Handler B validate form và đọc lại state. Nó gọi service C. Service C gọi shared API D. Shared API gửi METHOD tới endpoint E với payload F. Thành công thì invalidate/refetch G; lỗi thì giữ draft và hiển thị thông báo.

---

## 30. Kết luận cần nhớ

Nếu chỉ còn 5 phút để ôn, nhớ 8 ý này:

1. Feedback là phản ánh; Incident là công việc.
2. Staff chỉ thao tác Incident thuộc mình.
3. Có provider flow và direct flow.
4. Resolution lần đầu ở `InProgress`, gửi lại ở `NeedRework`.
5. Frontend guard không thay backend authorization.
6. Mobile dùng Zustand cho client state, React Query cho server state.
7. Chat có public/internal, SignalR và polling fallback.
8. Trước mutation: đọc state mới; sau mutation: refetch authoritative state.
