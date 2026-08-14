# MOBILE_API_MAPPING

## Scope

This document audits APIs used by the Service User role for the mobile app. The source of truth is the existing web app and shared API package.

Analyzed sources:

- `packages/shared-api`
- `apps/web/src/services/api`
- `apps/web/src/pages` Service User screens
- `apps/web/src/hooks` used by Service User screens
- `apps/web/src/components` used by public/Service User screens

Swagger/OpenAPI note:

- No Swagger/OpenAPI file was found in this frontend monorepo by searching for `swagger`, `openapi`, `api-docs`, `OpenAPI`, or `Swagger`.
- Endpoint paths and DTO fields below are therefore mapped from existing shared API wrappers and web usage.
- Where wrappers mention Swagger field names, this document preserves those names exactly.
- Do not add endpoints beyond this list without a backend Swagger contract.

Excluded:

- System Staff APIs
- Interaction Manager APIs
- System Admin APIs
- Service Provider APIs
- Admin user management APIs
- Management feedback APIs
- Mock-only helper APIs that do not perform HTTP requests

## Endpoint Inventory

| Area | Method | Endpoint | Service User screens |
| --- | --- | --- | --- |
| Auth | `POST` | `/api/auth/login` | Login |
| Auth | `POST` | `/api/auth/register` | Register |
| Auth | `POST` | `/api/auth/google-login` | Login |
| Auth | `POST` | `/api/auth/refresh-token` | Auth session refresh |
| Auth | `POST` | `/api/auth/email-verification/send-otp` | Register, OTP |
| Auth | `POST` | `/api/auth/email-verification/verify` | OTP |
| Tickets | `GET` | `/api/user/feedbacks` | Dashboard, Ticket List, Archive, Profile, Map |
| Tickets | `GET` | `/api/user/feedbacks/{feedbackId}` | Ticket Detail, Resolution Result, Rework Center |
| Tickets | `POST` | `/api/user/feedbacks` | Create Ticket |
| Tickets | `PUT` | `/api/user/feedbacks/{feedbackId}` | Ticket Detail edit, Rework Center, resubmit |
| Tickets | `DELETE` | `/api/user/feedbacks/{feedbackId}` | Ticket Detail delete |
| Tickets | `POST` | `/api/user/feedbacks/{feedbackId}/attachments` | Ticket Detail edit, Rework Center |
| Tickets | `DELETE` | `/api/user/feedbacks/{feedbackId}/attachments/{attachmentId}` | Ticket Detail edit |
| Tickets | `POST` | `/api/user/feedbacks/{feedbackId}/support` | Community Feed, Community Detail |
| Tickets | `DELETE` | `/api/user/feedbacks/{feedbackId}/support` | Community Feed, Community Detail |
| Tickets | `POST` | `/api/user/feedbacks/{feedbackId}/comments` | Ticket Detail, Community Detail where comment API is enabled |
| Tickets | `POST` | `/api/user/feedbacks/{feedbackId}/resolution-review` | Ticket Detail, Resolution Result |
| Community | `GET` | `/api/user/feedbacks/feed` | Home preview, Dashboard community summary, Community Feed, Community Map |
| Community | `GET` | `/api/user/feedbacks/feed/{feedbackId}` | Community Detail, feed preview hydration, parent feedback preview |
| Reference | `GET` | `/api/areas` | Dashboard, Create Ticket, Ticket Detail edit |
| Reference | `GET` | `/api/categories` | Dashboard, Ticket List, Create Ticket, Ticket Detail edit, Archive |
| Notifications | `GET` | `/api/notifications` | Notifications |
| Notifications | `PATCH` | `/api/notifications/{notificationId}/read` | Notifications |
| Notifications | `PATCH` | `/api/notifications/read-all` | Notifications |
| AI | `GET` | `/api/ai/conversations/me` | Home/public AI copilot |
| AI | `GET` | `/api/ai/conversations/{conversationId}/messages` | Home/public AI copilot |
| AI | `POST` | `/api/ai/chat` | Home/public AI copilot |
| AI | `POST` | `/api/ai/feedback-draft` | Home/public AI copilot -> Create Ticket |

## Auth APIs

### `POST /api/auth/login`

Shared source:

- `packages/shared-api/src/authApi.js`
- `apps/web/src/services/api/authApi.js`
- `apps/web/src/pages/auth/LoginPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | Yes | Web label allows email/phone text, but request field is `email`. |
| `password` | string | Yes | Sent as plain password over HTTPS. |

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `token` / `accessToken` / `authToken` | string | Web accepts multiple token field names. |
| `refreshToken` | string | Optional; stored if present. |
| `user.userId` / `user.id` | string/number | Normalized to `userId`. |
| `user.email` | string | Stored in auth session. |
| `user.fullName` | string | Stored in auth session. |
| `user.role` | string | Normalized with `getInternalRole`. |
| `user.isVerified` | boolean/string | `true` or `'true'` becomes verified. |

Screen using it:

- Login

Validation requirements:

- Email/phone field is required.
- Password is required.
- Web does not enforce email format on login before submit.
- After success, unverified users route to OTP verification.

### `POST /api/auth/register`

Shared source:

- `packages/shared-api/src/authApi.js`
- `apps/web/src/services/api/authApi.js`
- `apps/web/src/pages/auth/RegisterPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fullName` | string | Yes | Trimmed and minimum length 2 in web validation. |
| `email` | string | Yes | Must match web email regex. |
| `password` | string | Yes | Minimum length 8 for new registration. |
| `phone` | string | Yes | Must match Vietnamese phone regex used by web. |

Response DTO used by web:

Same auth session shape as login:

- `token` / `accessToken` / `authToken`
- `refreshToken`
- `user.userId` / `user.id`
- `user.email`
- `user.fullName`
- `user.role`
- `user.isVerified`

Screen using it:

- Register

Validation requirements:

- Full name required, trimmed, min length 2.
- Email required.
- Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- Phone required.
- Phone must match `/^0\d{9}$/`.
- Password required for new registration.
- Password min length 8.
- Confirm password required and must match.
- Registration draft key: `urbanmind:registration-draft`.

### `POST /api/auth/google-login`

Shared source:

- `packages/shared-api/src/authApi.js`
- `apps/web/src/services/api/authApi.js`
- `apps/web/src/pages/auth/LoginPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `idToken` | string | Yes | Google identity token. |

Response DTO used by web:

Same auth session shape as login.

Screen using it:

- Login

Validation requirements:

- `idToken` must be present.
- Web stores returned session with the same token/user normalization as email login.

### `POST /api/auth/refresh-token`

Shared source:

- `packages/shared-api/src/authApi.js`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `refreshToken` | string | Yes | Stored token from login/register/google-login. |

Response DTO used by web:

Token refresh payload accepted by shared auth wrapper:

- `token` / `accessToken` / `authToken`
- `refreshToken`
- Optional user/session payload depending on backend response.

Screen using it:

- Auth session refresh infrastructure.

Validation requirements:

- Refresh token must exist before calling.

### `POST /api/auth/email-verification/send-otp`

Shared source:

- `packages/shared-api/src/authApi.js`
- `apps/web/src/services/api/authApi.js`
- `apps/web/src/pages/auth/RegisterPage.jsx`
- `apps/web/src/pages/auth/VerifyEmailPage.jsx`

Request DTO:

- No request body in shared API.

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `success` | boolean | App wrapper returns `{ success: true }` after shared call succeeds. |

Screens using it:

- Register
- OTP Verification

Validation requirements:

- User must have an authenticated pending-verification session.
- OTP resend cooldown in web is 60 seconds.

### `POST /api/auth/email-verification/verify`

Shared source:

- `packages/shared-api/src/authApi.js`
- `apps/web/src/services/api/authApi.js`
- `apps/web/src/pages/auth/VerifyEmailPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `otp` | string | Yes | Six-character OTP string. |

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `success` | boolean | App wrapper returns true on success. |
| `user` | object | Existing or returned user, normalized to verified. |
| `token` / `accessToken` / `authToken` | string | Optional replacement token. |
| `refreshToken` | string | Optional replacement refresh token. |

Screen using it:

- OTP Verification

Validation requirements:

- OTP length is 6.
- OTP validity shown by web is 5 minutes.
- On success, web sets `user.isVerified = true`.

## Ticket APIs

All Service User ticket endpoints must use role `service-user`. In `packages/shared-api/src/ticketApiHelpers.js`, that role maps to `/api/user/feedbacks`.

### `GET /api/user/feedbacks`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `packages/shared-api/src/ticketApiHelpers.js`

Request DTO:

Query params are pass-through filters from screens.

| Field | Type | Required | Screens | Notes |
| --- | --- | --- | --- | --- |
| `pageNumber` | number | No | Ticket List, Map | Used as pagination hint. |
| `pageSize` | number | No | Ticket List, Map | Ticket List uses 100; Map uses 100. |
| `userId` | string/number | No | Archive, Profile | Used to constrain own-ticket views. |
| Other filters | any | No | Dashboard | Dashboard calls with `{}` for Service User. |

Response DTO used by web:

Normalized by `normalizeTicketsResponse`.

| Field | Type | Notes |
| --- | --- | --- |
| `items` or array response | Feedback[] | Web accepts raw array, `items`, `data`, `content`, `results`, and normalizes to array. |
| `totalItems` | number | Used by dashboard if provided. |
| Feedback `feedbackId` / `id` | string/number | Primary identifier. |
| Feedback `title` | string | List/detail title. |
| Feedback `description` | string | Detail/feed content. |
| Feedback `status` | enum | Must use shared `managementTypes.feedbackStatus`. |
| Feedback `priority` | enum/string | Displayed in ticket cards/details. |
| Feedback `areaId`, `areaName` | number/string | Filters and labels. |
| Feedback `categoryId`, `categoryName` | number/string | Filters and labels. |
| Feedback `locationText` | string | Location display. |
| Feedback `latitude`, `longitude` | number | Map/detail usage. |
| Feedback `createdAt`, `updatedAt` | datetime | Sort/recent activity. |
| Feedback `attachments` | array | Detail/media. |
| Feedback `comments` | array | Comment display if included. |
| Feedback `statusHistories` | array | Timeline/history if included. |
| Feedback `reviews` / `rating` | array/number | Archive satisfaction. |

Screens using it:

- Dashboard / Service User summary
- Ticket List
- Closed Ticket Archive
- Profile ticket stats
- Community Map via `useIncidentMapData` for authenticated role context

Validation requirements:

- For Service User, always call with `{ role: 'service-user' }`.
- Ticket List web fetch uses `{ pageNumber: 1, pageSize: 100 }`.
- Profile web adds `{ userId: user.userId }` for Service User.
- Archive filters returned tickets to `RESOLVED` or `CLOSED`.

### `GET /api/user/feedbacks/{feedbackId}`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/hooks/useTicketDetail.js`

Request DTO:

| Field | Type | Required | Location | Notes |
| --- | --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path | Feedback identifier. |

Response DTO used by web:

Single Feedback object. Web accepts response as `data`, `item`, `result`, or root object.

Additional normalization:

| Field | Type | Notes |
| --- | --- | --- |
| `attachments[].attachmentId` | string/number | Normalized from `attachmentId`, `attachmentID`, `feedbackAttachmentId`, `fileId`, or `id`. |
| `attachments[].fileUrl` | string | Normalized from `fileUrl`, `url`, `path`, `attachmentUrl`, or `displayUrl`. |
| `statusHistories` | array | Used for timeline and history. |
| `resolution` | object | Used by Resolution Result. |
| `comments` | array | Used by comment normalization. |

Screens using it:

- Ticket Detail
- Resolution Result
- Rework Center
- Community Detail through `useTicketDetail(feedbackId, user, getCommunityFeedDetail)` when backed by community detail loader

Validation requirements:

- `feedbackId` is required.
- Service User calls must use `{ role: 'service-user' }`.
- Missing or invalid ticket returns detail error state.

### `POST /api/user/feedbacks`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/pages/tickets/CreateTicketPage.jsx`

Request DTO:

`multipart/form-data`

| Form field | Source field | Type | Required by web | Notes |
| --- | --- | --- | --- | --- |
| `AreaId` | `areaId` | number/string | Yes | Web validates selected area. |
| `CategoryId` | `categoryId` | number/string | Yes | Usually resolved from AI classification or category list fallback. |
| `Title` | `title` | string | Yes | Trimmed before submit. |
| `Description` | `description` | string | Yes | Trimmed before submit. |
| `LocationText` | `locationText` | string | No | Set from selected address or coordinates. |
| `Latitude` | `latitude` | number/string | Yes | Web validates not null. |
| `Longitude` | `longitude` | number/string | Yes | Web validates not null. |
| `LocationAccuracyMeters` | `locationAccuracyMeters` | number/string | No | Supported by shared wrapper, not populated by current create screen. |
| `GeoSource` | `geoSource` | string | No | Supported by shared wrapper, not populated by current create screen. |
| `Priority` | `priority` | string | Yes | Defaults to `Medium`. |
| `DueDate` | `dueDate` | string/date | No | Supported by shared wrapper, not populated by current create screen. |
| `Attachments` | `attachments[]` | File[] | Yes | One or more image/video files. |

Response DTO used by web:

- Web does not depend on a specific response shape after successful submit.
- Successful response triggers local draft removal and submitted state.

Screen using it:

- Create Ticket

Validation requirements:

- Title required.
- Description required.
- Area required.
- Latitude and longitude required.
- At least one attachment required.
- Maximum attachment count: 5.
- Maximum image size: 5 MB.
- Maximum video size: 10 MB.
- Maximum total attachment size: 20 MB.
- Priority values: `Low`, `Medium`, `High`, `Urgent`.
- Normalize `Critical` to `Urgent`.
- Default priority: `Medium`.
- Draft storage prefix: `urbanmind:create-ticket-draft`.
- Attachments are not restored from draft and must be reselected.

### `PUT /api/user/feedbacks/{feedbackId}`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx`
- `apps/web/src/pages/tickets/ReworkCenterPage.jsx`

Request DTO:

JSON object. Fields vary by edit/rework action.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | Contextual | Used by detail/rework edit. |
| `description` | string | Contextual | Used by detail/rework edit. |
| `locationText` | string | Contextual | Used by detail/rework edit. |
| `areaId` | number/string | Contextual | Used when updating area. |
| `categoryId` | number/string | Contextual | Used when updating category. |
| `priority` | string | Contextual | Existing priority values. |
| `latitude` | number | Contextual | Used when updating location. |
| `longitude` | number | Contextual | Used when updating location. |
| `status` | enum | Rework resubmit | Rework Center resubmits with `SUBMITTED`. |

Response DTO used by web:

- Updated Feedback object or wrapper accepted by web.
- Rework Center reads updated response then may refresh ticket detail.

Screens using it:

- Ticket Detail edit
- Rework Center

Validation requirements:

- `feedbackId` required.
- Service User role required.
- Rework resubmit uses `{ status: managementTypes.feedbackStatus.SUBMITTED }`.
- Preserve web edit-field validation and attachment limits where editing evidence.

### `DELETE /api/user/feedbacks/{feedbackId}`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx`

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path |

Response DTO used by web:

- Web does not depend on a specific response shape after successful delete.

Screen using it:

- Ticket Detail

Validation requirements:

- `feedbackId` required.
- Only show delete where web permissions/status rules allow it.
- Service User role required.

### `POST /api/user/feedbacks/{feedbackId}/attachments`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx`
- `apps/web/src/pages/tickets/ReworkCenterPage.jsx`

Request DTO:

`multipart/form-data`

| Form field | Type | Required | Notes |
| --- | --- | --- | --- |
| `Files` | File[] | Yes | Shared wrapper appends each file under `Files`. |

Response DTO used by web:

- Upload success response is not relied on directly.
- Web refreshes ticket detail after upload in Rework Center.

Screens using it:

- Ticket Detail edit
- Rework Center evidence upload

Validation requirements:

- `feedbackId` required.
- At least one file required.
- File limits must follow web attachment constraints: max 5 total, image max 5 MB, video max 10 MB, total max 20 MB.

### `DELETE /api/user/feedbacks/{feedbackId}/attachments/{attachmentId}`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx`

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path |
| `attachmentId` | string/number | Yes | Path |

Response DTO used by web:

- Web does not depend on a specific response shape after successful delete.

Screen using it:

- Ticket Detail edit

Validation requirements:

- `feedbackId` required.
- `attachmentId` required.
- `attachmentId` may be normalized from multiple backend field names.

### `POST /api/user/feedbacks/{feedbackId}/support`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- Community support components through Service User/community screens.

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path |

Response DTO used by web:

- Support response may include updated support count.
- SignalR `SupportAdded` event can also update `supportCount`.

Screens using it:

- Community Feed
- Community Detail

Validation requirements:

- Authenticated user required for support action.
- `feedbackId` required.
- Do not add moderation behavior.

### `DELETE /api/user/feedbacks/{feedbackId}/support`

Shared source:

- `packages/shared-api/src/ticketApi.js`

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path |

Response DTO used by web:

- Web updates support state/count through response, cache patching, or SignalR event.

Screens using it:

- Community Feed
- Community Detail

Validation requirements:

- Authenticated user required.
- `feedbackId` required.

### `POST /api/user/feedbacks/{feedbackId}/comments`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `packages/shared-api/src/managementFeedbackApi.js` for `normalizeCommentPayload`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `content` | string | Yes | Sent through `normalizeCommentPayload({ content })`. |

Path params:

| Field | Type | Required |
| --- | --- | --- |
| `feedbackId` | string/number | Yes |

Response DTO used by web:

- Comment object or wrapper accepted by comment UI.
- SignalR `CommentAdded` can increment comment count.

Screens using it:

- Ticket Detail
- Community Detail/comment drawer where current APIs support comments

Validation requirements:

- `feedbackId` required.
- Comment content must be non-empty after trimming.
- Authenticated user required for comment composer behavior.

### `POST /api/user/feedbacks/{feedbackId}/resolution-review`

Shared source:

- `packages/shared-api/src/ticketApi.js`
- `apps/web/src/hooks/useTicketDetail.js`
- `apps/web/src/pages/tickets/ResolutionResultPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `rating` | number | Yes | Web sends `Number(rating)`. |
| `isSatisfied` | boolean | Yes | Web sends `Boolean(isSatisfied)`. |
| `comment` | string | No | Trimmed string; empty string allowed. |

Path params:

| Field | Type | Required |
| --- | --- | --- |
| `feedbackId` | string/number | Yes |

Response DTO used by web:

- Web refreshes ticket detail after submit.
- Resolution Result locally sets status to `CLOSED` after success.

Screens using it:

- Ticket Detail
- Resolution Result

Validation requirements:

- `feedbackId` required.
- Rating defaults to 5.
- Satisfaction defaults to true.
- Review is shown for `APPROVED`; Resolution Result also allows `RESOLVED` for backward compatibility.

## Community Feed APIs

### `GET /api/user/feedbacks/feed`

Web source:

- `apps/web/src/services/api/feedApi.js`
- `apps/web/src/components/community/CommunityFeed.jsx`
- `apps/web/src/hooks/usePublicLandingFeed.js`
- `apps/web/src/hooks/useIncidentMapData.js`
- `apps/web/src/pages/dashboard/Dashboard.jsx`

Request DTO:

Query params after normalization:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `PageNumber` | number | No | Must be finite and > 0. Defaults to 1. |
| `PageSize` | number | No | Must be finite and > 0. Defaults to 10. Feed page size is 10; map and previews use larger values. |
| `Status` | string | No | `resolved` normalizes to `Resolved`. `latest`, `trending`, and `nearby` are not sent as statuses. |
| `CategoryId` | string/number | No | Sent when provided. |
| `Search` | string | No | Trimmed before send. |

Headers:

| Header | Required | Notes |
| --- | --- | --- |
| `Accept: application/json` | Yes | Feed wrapper expects JSON. |
| `Authorization: Bearer {token}` | No | Added if auth token exists. |

Response DTO used by web:

Normalized page object:

| Field | Type | Notes |
| --- | --- | --- |
| `items` | Feedback[] | Accepted from `items`, `data`, `content`, `feedbacks`, `results`, or raw array. |
| `pageNumber` | number | Accepted from `pageNumber` or `page`. |
| `pageSize` | number | Accepted from `pageSize` or `size`. |
| `totalItems` | number | Accepted from `totalItems`, `totalCount`, `count`, or item length. |
| `totalPages` | number | Accepted from `totalPages`, `pageCount`, or calculated. |

Screens using it:

- Home public recent feedbacks
- Dashboard community summary
- Community Feed
- Community Map

Validation requirements:

- Response must be JSON.
- Public feed filters out `isPublic === false`.
- Public feed filters out `visibility === private` or `scope === internal`.
- Public feed filters out `SUBMITTED` and `AI_REVIEWED`.
- Community feed page size is 10.
- Feed request times out after 15 seconds in web wrapper.

### `GET /api/user/feedbacks/feed/{feedbackId}`

Web source:

- `apps/web/src/services/api/feedApi.js`
- `apps/web/src/pages/community/CommunityFeedbackDetailPage.jsx`
- `apps/web/src/hooks/usePublicLandingFeed.js`
- `apps/web/src/components/community/CommunityFeed.jsx`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx` for parent feedback detail preview

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `feedbackId` | string/number | Yes | Path |

Headers:

| Header | Required | Notes |
| --- | --- | --- |
| `Accept: application/json` | Yes | Detail wrapper expects JSON. |
| `Authorization: Bearer {token}` | No | Added if token exists. |

Response DTO used by web:

Feedback detail object, unwrapped from `data` if present.

Preview fields extracted by web:

| Field | Type | Notes |
| --- | --- | --- |
| `attachments` | array | Defaults to `[]`. |
| `description` | string | Defaults to empty string. |
| `imageUrl` | string | Optional. |
| `coverImageUrl` | string | Optional. |
| `thumbnailUrl` | string | Optional. |
| `mediaUrl` | string | Optional. |
| `attachmentUrl` | string | Optional. |

Screens using it:

- Community Detail
- Community Feed preview hydration
- Home public recent feedbacks
- Ticket Detail parent/community preview

Validation requirements:

- `feedbackId` required.
- Response must be JSON.
- 401 maps to unauthorized message.
- 403 maps to forbidden message.

## Reference Data APIs

### `GET /api/areas`

Shared source:

- `packages/shared-api/src/toolsApi.js`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Any params | object | No | Pass-through params from caller. Current Service User screens call without params. |

Response DTO used by web:

Normalized collection. Web accepts raw array, `items`, `data`, `content`, or `results`.

Common fields read by Service User screens:

| Field | Type | Notes |
| --- | --- | --- |
| `areaId` / `id` | string/number | Area identifier. |
| `areaName` / `name` / `displayName` | string | Area display name. |
| Boundary/location fields | object/string | Used by map/location picker where available. |

Screens using it:

- Dashboard tracked area selector
- Create Ticket location step
- Ticket Detail edit metadata

Validation requirements:

- Create Ticket requires selected `areaId`.
- If request fails, shared wrapper returns `[]`.

### `GET /api/categories`

Shared source:

- `packages/shared-api/src/toolsApi.js`

Request DTO:

Query params:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `includeInactive` | boolean | No | Shared wrapper sends `false` by default. |

Response DTO used by web:

Normalized collection. Web accepts raw array, `items`, `data`, `content`, or `results`.

Common fields read by Service User screens:

| Field | Type | Notes |
| --- | --- | --- |
| `categoryId` / `id` | string/number | Category identifier. |
| `categoryName` / `name` / `displayName` | string | Category display name. |
| `code` | string | Used for label matching where present. |

Screens using it:

- Dashboard categories
- Ticket List category filter
- Create Ticket category/AI suggestion mapping
- Ticket Detail edit metadata
- Closed Ticket Archive category filter

Validation requirements:

- Create Ticket must resolve a `categoryId` before moving past description step.
- If AI classification does not provide a category, web falls back to first available category.
- If no category can be resolved, web blocks progress with classification error.

## Notification APIs

### `GET /api/notifications`

Shared source:

- `packages/shared-api/src/notificationApi.js`
- `apps/web/src/hooks/useNotifications.js`
- `apps/web/src/pages/notifications/NotificationCenterPage.jsx`

Request DTO:

Query params:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `pageNumber` | number | No | Defaults to 1. |
| `pageSize` | number | No | Defaults to 10 in shared API; `useNotifications` uses 50 by default. |
| `isRead` | boolean | No | Sent only when boolean. |

Response DTO used by web:

Normalized notification page:

| Field | Type | Notes |
| --- | --- | --- |
| `items` | Notification[] | Raw array is also accepted. |
| `pageNumber` | number | Defaults to 1. |
| `pageSize` | number | Defaults to 10. |
| `totalItems` | number | Defaults to item length. |
| `totalPages` | number | Defaults to 1. |
| `hasPreviousPage` | boolean | Defaults false. |
| `hasNextPage` | boolean | Defaults false. |

Notification fields used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `notificationId` | string/number | Used for mark-read actions. |
| `title` | string | Display and category detection. |
| `message` | string | Display, search, category detection. |
| `type` | string | Category detection. |
| `isRead` | boolean | Unread state. |
| `createdAt` | datetime | Sorting/grouping. |
| `feedbackId` / `ticketId` / `relatedFeedbackId` / `entityId` | string/number | Related ticket routing. |
| `data.feedbackId`, `data.ticketId` | string/number | Related ticket routing. |
| `metadata.feedbackId` | string/number | Related ticket routing. |
| `targetUrl` | string | Fallback route parsing. |

Screen using it:

- Notifications

Validation requirements:

- Authenticated user required.
- Web caches notifications for 60 seconds.
- Notification center refresh uses `{ pageNumber: 1, pageSize: 50 }`.
- Client filters category, unread-only, and search locally.

### `PATCH /api/notifications/{notificationId}/read`

Shared source:

- `packages/shared-api/src/notificationApi.js`
- `apps/web/src/hooks/useNotifications.js`

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `notificationId` | string/number | Yes | Path |

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `success` | boolean | Shared wrapper returns `{ success: true }` after API succeeds. |

Screen using it:

- Notifications

Validation requirements:

- `notificationId` required.
- `useNotifications.markAsRead` returns early if no user or no notification ID.
- Web optimistically marks notification as read and refetches on failure.

### `PATCH /api/notifications/read-all`

Shared source:

- `packages/shared-api/src/notificationApi.js`
- `apps/web/src/hooks/useNotifications.js`

Request DTO:

- No request body in shared API.

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `success` | boolean | Shared wrapper returns `{ success: true }` after API succeeds. |

Screen using it:

- Notifications

Validation requirements:

- Authenticated user required.
- Web returns early if unread count is already 0.
- Web optimistically marks all as read and rolls back on failure.

## AI APIs Used By Service User/Public Surfaces

These endpoints are used by `apps/web/src/components/public/CitizenAiCopilot.jsx`, which appears in public/Service User-accessible surfaces. Keep mobile usage behind the same `ai:chat` permission/feature scope.

### `GET /api/ai/conversations/me`

Shared source:

- `packages/shared-api/src/toolsApi.js`
- `apps/web/src/components/public/CitizenAiCopilot.jsx`

Request DTO:

- No request body.

Response DTO used by web:

Normalized collection. Web accepts raw array, `items`, `data`, `content`, or `results`.

Conversation fields used:

| Field | Type | Notes |
| --- | --- | --- |
| `conversationId` / `id` | string/number | Conversation identifier. |
| `lastMessage` | string | Preview text. |
| `messageCount` | number | Fallback preview. |

Screen using it:

- Home/public AI copilot

Validation requirements:

- If loading fails, web shows empty previous-conversations state.

### `GET /api/ai/conversations/{conversationId}/messages`

Shared source:

- `packages/shared-api/src/toolsApi.js`
- `apps/web/src/components/public/CitizenAiCopilot.jsx`

Request DTO:

| Field | Type | Required | Location |
| --- | --- | --- | --- |
| `conversationId` | string/number | Yes | Path |

Response DTO used by web:

Normalized collection of messages.

Message fields used:

| Field | Type | Notes |
| --- | --- | --- |
| `messageId` / `id` | string/number | Message identifier. |
| `senderType` / `sender` | string | Lowercase contains `user` -> user message; otherwise AI. |
| `message` / `messageText` / `reply` / `content` | string | Message text. |
| `data.message` / `data.messageText` / `data.reply` | string | Alternative message text. |
| `createdAt` | datetime | Used for fallback ID and ordering/display. |

Screen using it:

- Home/public AI copilot

Validation requirements:

- `conversationId` required.
- Web filters out normalized messages with empty text.

### `POST /api/ai/chat`

Shared source:

- `packages/shared-api/src/toolsApi.js`
- `apps/web/src/components/public/CitizenAiCopilot.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `conversationId` | string/number/null | No | `null` starts or continues no active conversation. |
| `message` | string | Yes | Trimmed user input. |
| `feedbackId` | string/number | No | Included only when starting chat from `/tickets/{feedbackId}` context. |

Response DTO used by web:

| Field | Type | Notes |
| --- | --- | --- |
| `message` / `messageText` / `reply` / `content` | string | AI reply text. |
| `data.message` / `data.messageText` / `data.reply` | string | Alternative reply text. |
| `conversationId` / `conversationID` / `id` | string/number | New/active conversation ID. |
| `data.conversationId` / `result.conversationId` / `conversation.id` | string/number | Alternative conversation ID paths. |
| `createdAt` | datetime | Fallback metadata. |

Screen using it:

- Home/public AI copilot

Validation requirements:

- Do not send when input is empty after trim.
- Do not send while a reply is already loading.
- If API fails, web shows fallback error message and reloads conversations.

### `POST /api/ai/feedback-draft`

Shared source:

- `packages/shared-api/src/toolsApi.js`
- `apps/web/src/components/public/CitizenAiCopilot.jsx`
- `apps/web/src/pages/tickets/CreateTicketPage.jsx`

Request DTO:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `reflection` | string | Yes | Text from reflection field or chat input, trimmed. |
| `location` | string | No | Trimmed location text. |
| `latitude` | number/null | No | Empty string becomes `null`. |
| `longitude` | number/null | No | Empty string becomes `null`. |
| `imageUrls` | string[] | No | Current web sends empty array. |
| `base64Images` | string[] | No | Selected images converted to base64. |

Response DTO used by web:

Create Ticket normalizes response as `payload.data ?? payload.draft ?? payload`.

Fields consumed by Create Ticket:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Prefills title. |
| `summary` | string | Fallback for title/description. |
| `description` | string | Prefills description. |
| `location` | string | Prefills location text. |
| `latitude` | number/string | Prefills latitude if finite. |
| `longitude` | number/string | Prefills longitude if finite. |
| `urgencyLevel` | string | Normalized to priority. |
| `imageUrls` | string[] | Stored as AI image URLs. |
| `missingFields` | string[] | Displayed as missing AI draft fields. |
| `suggestedCategory` | string | Matched against loaded categories. |
| `confirmationMessage` | string | Draft notice. |

Screens using it:

- Home/public AI copilot
- Create Ticket receives AI draft through navigation state

Validation requirements:

- Reflection/chat text is required.
- Web blocks draft creation while `creatingDraft` is true.
- Latitude/longitude must be numeric to prefill Create Ticket.
- Priority maps through Create Ticket priority normalization.

## APIs Present But Not Used As Service User HTTP Endpoints

### Profile endpoints

Shared source:

- `packages/shared-api/src/userApi.js`

Existing endpoints:

- `GET /api/user/profile/{userId}`
- `PUT /api/user/profile/{userId}`

Current Service User web usage:

- `apps/web/src/pages/profile/ProfilePage.jsx` does not call `userApi.getProfile` or `userApi.updateProfile`.
- Profile identity comes from `AuthContext`.
- Profile ticket stats come from `ticketApi.getTickets({ userId: user.userId }, { role: 'service-user' })`.
- Profile form save currently shows a local success toast only.

Mobile rule:

- Do not implement profile persistence unless product/backend confirms using these existing shared endpoints.
- Do not use admin user endpoints for Service User profile.

### Settings endpoints

Current Service User web usage:

- `apps/web/src/pages/settings/SettingsPage.jsx` uses no backend API.
- Settings persist locally:
  - `urbanmind_theme`
  - `urbanmind_push_notifications`
  - `urbanmind_email_notifications`

Mobile rule:

- Store equivalent preferences locally.
- Do not register push tokens or email preference APIs unless a backend Swagger contract exists.

### Logout endpoint

Shared source:

- `packages/shared-api/src/authApi.js`

Current behavior:

- `authApi.logout()` resolves locally with `{ success: true }`.
- Web clears local token/user storage.
- Backend logout endpoint does not exist in the shared wrapper.

Mobile rule:

- Clear local auth/session state.
- Do not invent a backend logout endpoint.

### Mock-only tools

The following `toolsApi` functions are mock/local adapter helpers in `packages/shared-api/src/toolsApi.js` and are not HTTP endpoints for mobile integration:

- `getOperators`
- `getTickets`
- `getComments`
- `getNotifications`
- `getIntegrations`
- `getSlaConfig`
- `getAuditLogs`
- `getUsers`
- `aiClassify`
- `checkDuplicates`
- `addAudit`
- `updatePosts`
- `updateIntegrations`
- `updateTickets`
- `updateNotifications`
- `updateComments`
- `updateCategories`

Important:

- `CreateTicketPage.jsx` currently calls `toolsApi.aiClassify(title, description)` and `toolsApi.checkDuplicates(categoryId, lat, lng)`.
- In the inspected shared API wrapper, those two functions use the mock DB adapter and do not call HTTP endpoints.
- Mobile must not invent HTTP endpoints for AI classification or duplicate detection unless Swagger/backend provides them.

## Screen To Endpoint Matrix

| Screen | Existing endpoints used |
| --- | --- |
| Login | `POST /api/auth/login`, `POST /api/auth/google-login` |
| Register | `POST /api/auth/register`, `POST /api/auth/email-verification/send-otp` |
| OTP Verification | `POST /api/auth/email-verification/send-otp`, `POST /api/auth/email-verification/verify` |
| Home / Landing | `GET /api/user/feedbacks/feed`, `GET /api/user/feedbacks/feed/{feedbackId}`, AI copilot endpoints |
| Dashboard source | `GET /api/user/feedbacks`, `GET /api/categories`, `GET /api/areas`, `GET /api/user/feedbacks/feed` |
| Ticket List | `GET /api/user/feedbacks`, `GET /api/categories` |
| Ticket Detail | `GET /api/user/feedbacks/{feedbackId}`, `PUT /api/user/feedbacks/{feedbackId}`, `DELETE /api/user/feedbacks/{feedbackId}`, attachment endpoints, comments, resolution review, `GET /api/categories`, `GET /api/areas` |
| Create Ticket | `GET /api/areas`, `GET /api/categories`, `POST /api/user/feedbacks`; web also calls mock-only `aiClassify` and `checkDuplicates` |
| Resolution Result | `GET /api/user/feedbacks/{feedbackId}`, `POST /api/user/feedbacks/{feedbackId}/resolution-review` |
| Rework Center | `GET /api/user/feedbacks/{feedbackId}`, `PUT /api/user/feedbacks/{feedbackId}`, `POST /api/user/feedbacks/{feedbackId}/attachments` |
| Closed Ticket Archive | `GET /api/user/feedbacks`, `GET /api/categories` |
| Community Feed | `GET /api/user/feedbacks/feed`, `GET /api/user/feedbacks/feed/{feedbackId}`, support endpoints |
| Community Detail | `GET /api/user/feedbacks/feed/{feedbackId}`, support endpoints, comments where enabled |
| Community Map | `GET /api/user/feedbacks/feed`, authenticated context may also call `GET /api/user/feedbacks` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/{notificationId}/read`, `PATCH /api/notifications/read-all` |
| Profile | `GET /api/user/feedbacks`; profile fields from local auth context |
| Settings | No backend endpoint; local storage only |

## Integration Rules For Mobile

- Use shared Service User endpoint base `/api/user/feedbacks`; do not call `/api/management/feedbacks` for Service User.
- Do not implement staff/provider/manager/admin endpoints in the mobile Service User app.
- Preserve web validation exactly for auth, OTP, ticket creation, attachments, comments, and reviews.
- Preserve shared status constants from `managementTypes.feedbackStatus`.
- Preserve public community feed visibility filtering.
- Preserve notification routing rules from `getServiceUserNotificationRoute`.
- Treat AI classification and duplicate detection as unavailable HTTP contracts until Swagger/backend exposes real endpoints.
- Treat profile update and settings sync as unavailable in current Service User web source unless backend Swagger confirms otherwise.
