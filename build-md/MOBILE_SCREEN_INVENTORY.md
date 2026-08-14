# MOBILE_SCREEN_INVENTORY

## Scope

This inventory covers only the Service User role in the Urban Service monorepo. The web app under `apps/web` is the source of truth for routes, business rules, validation, workflow states, permissions, and API contracts.

Do not create mobile-specific endpoints or mobile-only business logic. Mobile must reuse the existing shared APIs and web workflow rules.

Excluded roles and features:

- System Staff
- Interaction Manager
- System Admin
- Service Provider
- Moderation actions
- Staff assignment and approval actions
- Role management and user administration

## Source Files Reviewed

- `apps/web/src/routes/AppRoutes.jsx`
- `apps/web/src/pages/LandingPage.jsx`
- `apps/web/src/pages/dashboard/Dashboard.jsx`
- `apps/web/src/pages/auth/LoginPage.jsx`
- `apps/web/src/pages/auth/RegisterPage.jsx`
- `apps/web/src/pages/auth/VerifyEmailPage.jsx`
- `apps/web/src/pages/tickets/TicketListPage.jsx`
- `apps/web/src/pages/tickets/TicketDetailPage.jsx`
- `apps/web/src/pages/tickets/CreateTicketPage.jsx`
- `apps/web/src/pages/tickets/ResolutionResultPage.jsx`
- `apps/web/src/pages/tickets/ReworkCenterPage.jsx`
- `apps/web/src/pages/tickets/ClosedFeedbackArchivePage.jsx`
- `apps/web/src/pages/community/CommunityFeedPage.jsx`
- `apps/web/src/pages/community/CommunityFeedbackDetailPage.jsx`
- `apps/web/src/pages/community/CommunityMapPage.jsx`
- `apps/web/src/pages/notifications/NotificationCenterPage.jsx`
- `apps/web/src/pages/profile/ProfilePage.jsx`
- `apps/web/src/pages/settings/SettingsPage.jsx`
- `apps/web/src/roles/service-user/permissions.js`
- `apps/web/src/roles/service-user/dashboardConfig.js`
- `apps/web/src/services/api/feedApi.js`
- `apps/web/src/hooks/useTicketDetail.js`
- `apps/web/src/hooks/useNotifications.js`
- `apps/web/src/hooks/usePublicLandingFeed.js`
- `apps/web/src/utils/notificationNavigation.js`
- `packages/shared-api/src/authApi.js`
- `packages/shared-api/src/ticketApi.js`
- `packages/shared-api/src/ticketApiHelpers.js`
- `packages/shared-api/src/notificationApi.js`
- `packages/shared-api/src/userApi.js`

## Service User Permissions

Source: `apps/web/src/roles/service-user/permissions.js`

| Permission | Mobile usage |
| --- | --- |
| `ticket:create` | Create ticket wizard |
| `ticket:view-own` | My tickets, ticket detail, archive, dashboard ticket summary |
| `ticket:chat` | Ticket detail chat/comment behavior when enabled by web APIs |
| `ticket:rate` | Resolution review and satisfaction rating |
| `community:feed` | Community feed and community detail |
| `community:map` | Community map |
| `ai:chat` | AI-assisted classification, duplicate detection, or AI assistant surfaces already supported by web APIs |

Protected routes require an authenticated user. Service User-only routes use `RoleGuard` with `APP_ROLES.SERVICE_USER` in the web app.

## Route Mapping

| Web route | Web source screen | Mobile screen | Guard and role scope |
| --- | --- | --- | --- |
| `/` | `LandingPage.jsx` | Home / Service User dashboard entry | Public route; authenticated Service User sees direct ticket actions |
| `/dashboard` | `Dashboard.jsx` | Not a primary mobile route | Web route redirects Service User to `/`; use `Dashboard.jsx` only as dashboard data source if mobile exposes dashboard summary |
| `/login` | `LoginPage.jsx` | Login | Public; authenticated users redirect by role |
| `/register` | `RegisterPage.jsx` | Register | Public; pending unverified edit mode supported |
| `/verify-email` | `VerifyEmailPage.jsx` | OTP verification | Authenticated only; unverified user flow |
| `/tickets` | `TicketListPage.jsx` | My Tickets | Authenticated Service User; `ticket:view-own` |
| `/tickets/create` | `CreateTicketPage.jsx` | Create Ticket | `RoleGuard` Service User; `ticket:create` |
| `/tickets/:id` | `TicketDetailPage.jsx` | Ticket Detail | Authenticated; Service User data scope through `/api/user/feedbacks/{id}` |
| `/tickets/:feedbackId/result` | `ResolutionResultPage.jsx` | Resolution Result | `RoleGuard` Service User; `ticket:view-own`, `ticket:rate` when review is allowed |
| `/tickets/:feedbackId/rework` | `ReworkCenterPage.jsx` | Rework Center | `RoleGuard` Service User; `ticket:view-own` |
| `/tickets/archive` | `ClosedFeedbackArchivePage.jsx` | Closed Ticket Archive | `RoleGuard` Service User; `ticket:view-own` |
| `/community/feed` | `CommunityFeedPage.jsx` | Community Feed | Public/authenticated; Service User can use authenticated support/comment actions when APIs allow |
| `/community/feed/:id` | `CommunityFeedbackDetailPage.jsx` | Community Detail | Public/authenticated; authenticated support/comment behavior only |
| `/community/map` | `CommunityMapPage.jsx` | Community Map | Public/authenticated; `community:map` |
| `/notifications` | `NotificationCenterPage.jsx` | Notifications | Authenticated Service User |
| `/profile` | `ProfilePage.jsx` | Profile | Authenticated Service User |
| `/settings` | `SettingsPage.jsx` | Settings | Authenticated Service User; local preferences only in current web implementation |

## Screen Inventory

### 1. Home / Service User Dashboard Entry

Web source screen:

- `apps/web/src/pages/LandingPage.jsx`
- `apps/web/src/pages/dashboard/Dashboard.jsx` for the resident dashboard data model, even though `/dashboard` redirects Service User to `/` in `AppRoutes.jsx`
- `apps/web/src/roles/service-user/dashboardConfig.js`

Mobile redesign:

- Use a native home tab or stack root.
- Keep web hierarchy: primary action to create a ticket, secondary access to my tickets, community feed, and community map.
- If mobile includes dashboard metrics, derive them from the same web dashboard contracts.

API mapping:

- `ticketApi.getTickets({}, { role: APP_ROLES.SERVICE_USER })` for resident tickets.
- `toolsApi.getCategories()` for ticket/category labels.
- `toolsApi.getAreas()` for tracked area selector in dashboard summary.
- `getCommunityFeed({ PageNumber: 1, PageSize: 1, Search })` for community area count.
- `usePublicLandingFeed()` uses `getCommunityFeed({ PageNumber: 1, PageSize: 8 })` and hydrates items with `getCommunityFeedDetail(feedbackId)`.

Required permissions:

- `ticket:view-own` for personal metrics.
- `ticket:create` for create-ticket CTA.
- `community:feed` and `community:map` for community surfaces.

Business workflow mapping:

- Open/in-progress/resolved counts must be derived from Service User tickets.
- Recent activity is the five most recently updated resident tickets.
- Resident attention count is `NEED_REWORK` plus `APPROVED` tickets.
- Community summary uses existing public feed contracts, not a new dashboard endpoint.

Validation rules:

- No form validation.
- Selected dashboard area persists in local storage key `urbanmind-dashboard-area-filter-v2`.
- Dashboard snapshot persists in session storage key `urbanmind-service-user-dashboard-snapshot`.

Components reusable for mobile:

- Summary metric cards.
- Recent ticket list item.
- Attention banner.
- Community preview card.
- Tracked area selector.
- Compact public incident map pattern.

UX improvements over web:

- Convert quick actions into thumb-reachable native action cards.
- Use pull-to-refresh for ticket and community summary.
- Surface attention items above general metrics on small screens.

### 2. Login

Web source screen:

- `apps/web/src/pages/auth/LoginPage.jsx`

Mobile redesign:

- Native auth stack screen.
- Use native keyboard handling, password visibility toggle, and Google sign-in if supported.

API mapping:

- `authApi.login(email, password)` -> `POST /api/auth/login`
- `authApi.googleLogin(idToken)` -> `POST /api/auth/google-login`
- `authApi.refreshToken(refreshToken)` -> `POST /api/auth/refresh-token`

Required permissions:

- None before authentication.

Business workflow mapping:

- After successful login, if `user.isVerified === false`, navigate to OTP verification.
- Otherwise redirect by role. Service User home is `/`.
- Preserve safe redirect behavior from web; do not allow unsafe external redirects.

Validation rules:

- Email/phone field is required.
- Password is required.
- Web login does not enforce email format before submit.

Components reusable for mobile:

- Auth form shell.
- Password input with visibility toggle.
- Alert/error banner.
- Google auth button.

UX improvements over web:

- Use platform autofill for email and password.
- Use native secure text entry and return-key submission.

### 3. Register

Web source screen:

- `apps/web/src/pages/auth/RegisterPage.jsx`

Mobile redesign:

- Native registration stack screen.
- Preserve draft recovery and pending verification edit flow.

API mapping:

- `authApi.register(fullName, email, password, phone)` -> `POST /api/auth/register`
- `authApi.sendOtp()` -> `POST /api/auth/email-verification/send-otp`

Required permissions:

- None before authentication.

Business workflow mapping:

- Create account.
- Send OTP.
- Store pending OTP session.
- Navigate to `/verify-email`.
- Support `/register?mode=edit` for unverified users updating pending registration details.

Validation rules:

- Full name required, trimmed, minimum length 2.
- Email required.
- Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- Phone required.
- Phone must match `/^0\d{9}$/`.
- Password required for new registration.
- Password minimum length 8.
- Confirm password required when password is required.
- Confirm password must match password.
- Draft storage key: `urbanmind:registration-draft`.

Components reusable for mobile:

- Auth text field.
- Password strength/validation hints.
- Pending verification notice.
- Error and success alert pattern.

UX improvements over web:

- Use native phone/email keyboards.
- Preserve form draft across app backgrounding.
- Use step-friendly spacing for smaller screens.

### 4. OTP Verification

Web source screen:

- `apps/web/src/pages/auth/VerifyEmailPage.jsx`

Mobile redesign:

- Native OTP input with six cells and paste support.
- Countdown and resend action.

API mapping:

- `authApi.sendOtp()` -> `POST /api/auth/email-verification/send-otp`
- `authApi.verifyOtp(otp)` -> `POST /api/auth/email-verification/verify`

Required permissions:

- Authenticated pending-verification user.

Business workflow mapping:

- If no authenticated user, redirect to login.
- If already verified, redirect to role dashboard.
- Verify OTP, clear pending session and draft, then route Service User to home.
- Allow edit registration flow and switch-account/logout.

Validation rules:

- OTP length is 6.
- Resend cooldown is 60 seconds.
- OTP validity window shown by web is 5 minutes.
- Expired or used OTP errors allow resend.

Components reusable for mobile:

- OTP cell input.
- Resend timer.
- Verification status alert.
- Account switch action.

UX improvements over web:

- Support SMS/email one-time-code autofill where available.
- Move resend and edit-account actions into native secondary actions.

### 5. My Tickets

Web source screen:

- `apps/web/src/pages/tickets/TicketListPage.jsx`

Mobile redesign:

- Ticket list tab/screen with native search, filter chips, and sort sheet.

API mapping:

- `ticketApi.getTickets({ pageNumber: 1, pageSize: 100 }, { role: 'service-user' })` -> `GET /api/user/feedbacks`
- `toolsApi.getCategories()` for category filters.

Required permissions:

- `ticket:view-own`

Business workflow mapping:

- Show only Service User scoped tickets.
- Preserve web grouping:
  - Processing: `SUBMITTED`, `AI_REVIEWED`, `VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `NEED_REWORK`
  - Checking: `RESOLVED`, `SUBMITTED_FOR_APPROVAL`
  - Results: `RESOLVED`, `SUBMITTED_FOR_APPROVAL`, `APPROVED`, `CLOSED`
  - Awaiting review: `APPROVED`
  - Ended: `CLOSED`
- Open a ticket to `/tickets/:id`.
- Preserve return context through list navigation where mobile stack supports it.

Validation rules:

- Search, status, category, and sort are client filters over returned tickets.
- Sort values: `newest`, `oldest`, `status`.
- Status query values: `processing`, `checking`, `results`, `awaiting-review`, `ended`.
- Snapshot keys:
  - `urbanmind-service-user-ticket-list-snapshot`
  - `urbanmind-service-user-ticket-category-snapshot`
  - `urbanmind-ticket-list-return`

Components reusable for mobile:

- Ticket card/list item.
- Status badge.
- Category filter chips.
- Empty state.
- Loading skeleton.

UX improvements over web:

- Use pull-to-refresh.
- Use sticky filter chips below the header.
- Use native bottom sheet for filters and sorting.

### 6. Ticket Detail

Web source screen:

- `apps/web/src/pages/tickets/TicketDetailPage.jsx`
- `apps/web/src/hooks/useTicketDetail.js`

Mobile redesign:

- Native detail screen with sections for status, timeline, location, attachments, comments/chat, and resolution actions.

API mapping:

- `ticketApi.getTicketById(feedbackId, { role: 'service-user' })` -> `GET /api/user/feedbacks/{feedbackId}`
- `ticketApi.getComments(feedbackId, { role: 'service-user' })`
- `ticketApi.addComment(feedbackId, userId, content, { role: 'service-user' })` -> `POST /api/user/feedbacks/{feedbackId}/comments`
- `ticketApi.addAttachments(feedbackId, files, { role: 'service-user' })` -> `POST /api/user/feedbacks/{feedbackId}/attachments`
- `ticketApi.deleteAttachment(feedbackId, attachmentId, { role: 'service-user' })` -> `DELETE /api/user/feedbacks/{feedbackId}/attachments/{attachmentId}`
- `ticketApi.updateTicket(feedbackId, data, { role: 'service-user' })` -> `PUT /api/user/feedbacks/{feedbackId}`
- `ticketApi.deleteTicket(feedbackId, { role: 'service-user' })` -> `DELETE /api/user/feedbacks/{feedbackId}`
- `ticketApi.submitReview(feedbackId, userId, rating, isSatisfied, comment, { role })` -> `POST /api/user/feedbacks/{feedbackId}/resolution-review`
- SignalR events used by web include feedback status changes, assignment changes, comments/chat, support, and resolution updates.

Required permissions:

- `ticket:view-own`
- `ticket:chat` for chat/comment behavior when enabled.
- `ticket:rate` for resolution review.

Business workflow mapping:

- Show citizen journey:
  - Intake: `SUBMITTED`, `AI_REVIEWED`, `VERIFIED`
  - In progress: `ASSIGNED`, `IN_PROGRESS`, `NEED_REWORK`
  - Result checking: `RESOLVED`, `SUBMITTED_FOR_APPROVAL`
  - Completed: `APPROVED`, `CLOSED`
- If status is `NEED_REWORK` or `REJECTED`, expose rework center route.
- If status is `RESOLVED`, `SUBMITTED_FOR_APPROVAL`, `APPROVED`, or `CLOSED`, expose resolution result.
- Review is allowed when status is `APPROVED`; result screen also accepts `RESOLVED` for backward compatibility.

Validation rules:

- Chat/comment text must be non-empty after trim.
- Edit attachment limits follow create-ticket attachment limits.
- Preserve status and permission checks before showing edit, review, or rework actions.

Components reusable for mobile:

- Detail header.
- Status badge.
- Citizen timeline.
- Attachment gallery.
- Comment/chat composer.
- Resolution review form.
- Location map card.

UX improvements over web:

- Use collapsible sections for long ticket histories.
- Keep primary contextual action fixed at the bottom when available.
- Use native media viewer for attachments.

### 7. Create Ticket

Web source screen:

- `apps/web/src/pages/tickets/CreateTicketPage.jsx`

Mobile redesign:

- Mobile can present a native wizard, but business logic must remain identical to web.
- Web currently has three visual steps: description, location, evidence.
- If mobile splits this into five steps, map them to the same web fields:
  - Category: category is populated by existing AI classification/manual category selection rules.
  - Description: title, description, priority.
  - Location: area and coordinates.
  - Evidence: attachments.
  - Review: client-side confirmation only before the same submit call.

API mapping:

- `toolsApi.getAreas()`
- `toolsApi.getCategories()`
- `toolsApi.aiClassify(title.trim(), description.trim())`
- `toolsApi.checkDuplicates(Number(categoryId), latitude, longitude)`
- `ticketApi.createTicket(userId, fullName, ticketData, { role: 'service-user' })` -> `POST /api/user/feedbacks`
- Submit form data fields:
  - `AreaId`
  - `CategoryId`
  - `Title`
  - `Description`
  - `LocationText`
  - `Latitude`
  - `Longitude`
  - `LocationAccuracyMeters`
  - `GeoSource`
  - `Priority`
  - `DueDate`
  - `Attachments`

Required permissions:

- `ticket:create`
- `ai:chat` for AI category suggestion or duplicate detection surfaces already provided by web APIs.

Business workflow mapping:

- Load categories and areas first.
- Collect title and description.
- Run AI classification/category suggestion using existing API.
- Collect area and coordinates.
- Run duplicate detection using existing API.
- Require evidence.
- Submit to the user feedback endpoint with role `service-user`.
- Do not create mobile-only duplicate detection or category rules.

Validation rules:

- Title is required.
- Description is required.
- Area is required.
- Latitude is required.
- Longitude is required.
- At least one image/video attachment is required.
- Maximum attachment count is 5.
- Maximum image size is 5 MB.
- Maximum video size is 10 MB.
- Maximum total attachment size is 20 MB.
- Priority values: `Low`, `Medium`, `High`, `Urgent`.
- Normalize `Critical` to `Urgent`.
- Default priority is `Medium`.
- Draft storage prefix: `urbanmind:create-ticket-draft`.
- Attachments are not restored from draft; web only preserves an attachment notice.

Components reusable for mobile:

- Wizard stepper.
- Category selector.
- Description form.
- Area selector.
- Location picker/map.
- Duplicate warning card.
- Attachment picker and preview.
- Review summary.

UX improvements over web:

- Use native image/video picker and camera capture.
- Use map location permission prompts with clear fallback to manual location text.
- Keep duplicate warning visible before submit without blocking intentional submit if web allows continue.

### 8. Resolution Result

Web source screen:

- `apps/web/src/pages/tickets/ResolutionResultPage.jsx`

Mobile redesign:

- Native result screen with before/after evidence, status, timeline, and satisfaction review.

API mapping:

- `ticketApi.getTicketById(feedbackId, { role: 'service-user' })`
- `ticketApi.submitReview(feedbackId, userId, rating, satisfied, reviewComment, { role })`

Required permissions:

- `ticket:view-own`
- `ticket:rate` when review is available.

Business workflow mapping:

- Load ticket detail by `feedbackId`.
- Determine resolution date from `ticket.resolution.resolvedAt`, latest resolution status history, or ticket update date.
- Show review form only for `APPROVED` or `RESOLVED` backward-compatible status.
- After successful review, web locally sets status to `CLOSED`.

Validation rules:

- Rating defaults to 5.
- Satisfaction defaults to true.
- Review comment is optional in the current web form.

Components reusable for mobile:

- Resolution hero/status card.
- Before/after attachment gallery.
- Timeline.
- Star rating control.
- Satisfaction toggle.

UX improvements over web:

- Use native horizontal media carousel.
- Use fixed submit CTA while the review form is visible.

### 9. Rework Center

Web source screen:

- `apps/web/src/pages/tickets/ReworkCenterPage.jsx`

Mobile redesign:

- Native corrective-action screen focused on reason, editable details, extra evidence, and resubmit.

API mapping:

- `ticketApi.getTicketById(feedbackId, { role: 'service-user' })`
- `ticketApi.updateTicket(feedbackId, data, { role: 'service-user' })`
- `ticketApi.addAttachments(feedbackId, files, { role: 'service-user' })`
- Resubmit uses `ticketApi.updateTicket(feedbackId, { status: managementTypes.feedbackStatus.SUBMITTED }, { role: 'service-user' })`

Required permissions:

- `ticket:view-own`
- `ticket:create` only if web treats resubmission as part of the create/update workflow; do not add new permissions.

Business workflow mapping:

- Available from Service User routes for tickets needing rework or rejected workflows.
- Load the existing ticket.
- Show rework reason and requested-by metadata from ticket/history.
- Allow user to update allowed feedback fields and add evidence.
- Resubmit changes status back to `SUBMITTED`.

Validation rules:

- Preserve web edit validation for title, description, location text, and attachments.
- Evidence upload follows ticket attachment limits.
- Resubmit requires a valid `feedbackId`.

Components reusable for mobile:

- Rework reason card.
- Editable ticket summary form.
- Evidence uploader.
- Resubmit CTA.

UX improvements over web:

- Place the rework reason at top with a clear action checklist.
- Use native upload progress for added evidence.

### 10. Closed Ticket Archive

Web source screen:

- `apps/web/src/pages/tickets/ClosedFeedbackArchivePage.jsx`

Mobile redesign:

- Archive list with category, date, and rating filters.

API mapping:

- `ticketApi.getTickets({ userId: user.userId }, { role: 'service-user' })`
- `toolsApi.getCategories()`

Required permissions:

- `ticket:view-own`

Business workflow mapping:

- Filter returned tickets to `RESOLVED` or `CLOSED`.
- Show satisfaction score if present from `reviews[0].rating`, `rating`, `satisfactionScore`, or `reviewRating`.
- Open archived item into ticket detail.

Validation rules:

- Category filter is client-side.
- Date filter is client-side.
- Rating filter supports 5, 4, 3, 2, 1, and unrated ranges.

Components reusable for mobile:

- Archive ticket card.
- Rating badge.
- Category/date/rating filters.
- Empty state.

UX improvements over web:

- Use grouped list sections by month.
- Use native filter sheet.

### 11. Community Feed

Web source screen:

- `apps/web/src/pages/community/CommunityFeedPage.jsx`
- `apps/web/src/components/community/CommunityFeed.jsx`
- `apps/web/src/services/api/feedApi.js`

Mobile redesign:

- Native community feed tab with search, category/status filters, support button, and detail navigation.

API mapping:

- `getCommunityFeed(params, { force })` -> `GET /api/user/feedbacks/feed`
- Supported normalized params:
  - `PageNumber`
  - `PageSize`
  - `Status`
  - `CategoryId`
  - `Search`
- `getCommunityFeedDetail(feedbackId)` -> `GET /api/user/feedbacks/feed/{feedbackId}`
- `ticketApi.supportTicket(feedbackId, userId, { role: 'service-user' })` -> `POST /api/user/feedbacks/{feedbackId}/support`
- `ticketApi.unsupportTicket(feedbackId, userId, { role: 'service-user' })` -> `DELETE /api/user/feedbacks/{feedbackId}/support`

Required permissions:

- `community:feed`
- Authenticated support/comment actions must follow existing web API behavior.

Business workflow mapping:

- Allowed:
  - Browse feed.
  - View detail.
  - View map.
  - Support existing feedback.
  - View comments.
  - Comment if supported by current APIs and authenticated.
- Not allowed:
  - Moderator actions.
  - Staff actions.
  - Approval actions.

Validation rules:

- Public feed hides private/internal items.
- Public landing feed hides `SUBMITTED` and `AI_REVIEWED`.
- Search and filters map to existing feed params.
- Do not add mobile-only moderation state.

Components reusable for mobile:

- Feed card.
- Status badge.
- Support button.
- Comment count indicator.
- Feed filter/search bar.

UX improvements over web:

- Use infinite scroll or paginated load-more matching API pagination.
- Use optimistic support only if it mirrors web cache patching behavior.

### 12. Community Detail

Web source screen:

- `apps/web/src/pages/community/CommunityFeedbackDetailPage.jsx`

Mobile redesign:

- Detail screen for public/community feedback with map, evidence, comments, and support action.

API mapping:

- `getCommunityFeedDetail(feedbackId)`
- `ticketApi.supportTicket(feedbackId, userId, { role: 'service-user' })`
- `ticketApi.unsupportTicket(feedbackId, userId, { role: 'service-user' })`
- Comment APIs are reused from ticket API only where web exposes comment actions.

Required permissions:

- `community:feed`
- Authenticated support/comment actions require authenticated user.

Business workflow mapping:

- Public users can view detail.
- Authenticated Service Users can support.
- Comment composer redirects unauthenticated users to login in web behavior.
- No moderation, staff, or approval actions.

Validation rules:

- Feedback ID is required.
- Comment text must be non-empty where comment submission is enabled.

Components reusable for mobile:

- Community detail header.
- Support button.
- Location map card.
- Attachment gallery.
- Comment list and composer.

UX improvements over web:

- Use native share sheet only as a non-business action.
- Keep support action visible near the bottom thumb zone.

### 13. Community Map

Web source screen:

- `apps/web/src/pages/community/CommunityMapPage.jsx`
- `apps/web/src/hooks/useIncidentMapData.js`

Mobile redesign:

- Native map tab or screen with pins, status filters, and detail preview.

API mapping:

- Reuse the data hook/API chain from `useIncidentMapData`.
- Feed/detail sources must continue to come from existing community feed contracts.

Required permissions:

- `community:map`

Business workflow mapping:

- Show public feedback with coordinates.
- Support route state for focused feedback coordinates from feed/detail.
- Filters:
  - All
  - Processing
  - Ended
- Processing map group uses normalized statuses including verified, assigned, in progress, resolved, submitted for approval, and approved.
- Ended map group uses closed.

Validation rules:

- Items without valid coordinates cannot render as map pins.
- Focus route params must be parsed safely.

Components reusable for mobile:

- Incident map.
- Pin marker.
- Map filter chips.
- Feedback preview sheet.

UX improvements over web:

- Use native map clustering.
- Use bottom sheet previews instead of hover panels.

### 14. Notifications

Web source screen:

- `apps/web/src/pages/notifications/NotificationCenterPage.jsx`
- `apps/web/src/hooks/useNotifications.js`
- `apps/web/src/utils/notificationNavigation.js`

Mobile redesign:

- Native notifications list with unread filters, pull-to-refresh, and deep links to related ticket screens.

API mapping:

- `notificationApi.getNotifications(pageNumber, pageSize, isRead)` -> `GET /api/notifications`
- `notificationApi.markNotificationAsRead(notificationId)` -> `PATCH /api/notifications/{notificationId}/read`
- `notificationApi.markAllNotificationsAsRead()` -> `PATCH /api/notifications/read-all`

Required permissions:

- Authenticated Service User.
- Do not implement admin/staff notifications.

Business workflow mapping:

- Load notification page.
- Filter unread locally or via `isRead` param where provided.
- Mark a notification as read when opened.
- Navigate with `getServiceUserNotificationRoute(notification)`:
  - Rework notifications -> `/tickets/{feedbackId}/rework`
  - Resolution/result notifications -> `/tickets/{feedbackId}/result`
  - Other ticket notifications -> `/tickets/{feedbackId}`
  - Fallback -> `/tickets`

Validation rules:

- Notification ID is required to mark read.
- Feedback ID can come from `feedbackId`, `ticketId`, `relatedFeedbackId`, `entityId`, `data`, `metadata`, or `targetUrl`.
- Clean target URLs before navigation.

Components reusable for mobile:

- Notification list item.
- Unread badge.
- Filter tabs/chips.
- Empty state.
- Pull-to-refresh control.

UX improvements over web:

- Support swipe to mark read if it calls the same mark-read API.
- Use native deep linking into the ticket stack.

### 15. Profile

Web source screen:

- `apps/web/src/pages/profile/ProfilePage.jsx`

Mobile redesign:

- Native profile screen with identity summary, verified badge, ticket stats, recent activity, and editable local form fields if preserving current web behavior.

API mapping:

- Current web source uses authenticated `user` from `AuthContext` for profile identity.
- Current web source uses `ticketApi.getTickets({ userId: user.userId }, { role: 'service-user' })` for Service User stats and activity.
- `packages/shared-api/src/userApi.js` provides `getProfile(userId)` and `updateProfile(userId, data)`, but the current web `ProfilePage.jsx` does not call these endpoints. Mobile must not invent profile persistence unless product explicitly aligns it with these shared endpoints.

Required permissions:

- Authenticated Service User.
- No role management.
- No user administration.

Business workflow mapping:

- Show user name, email, phone, address, avatar URL or initials, verification state, role label, created date, and membership age from auth context.
- Compute ticket stats from own tickets:
  - Total tickets.
  - Resolved tickets: `RESOLVED` or `CLOSED`.
  - Open tickets: not `RESOLVED` and not `CLOSED`.
  - Reported this month.
- Profile form save currently shows a local success toast only.

Validation rules:

- Current web profile form has no persistence validation beyond controlled input values.
- Email is displayed as disabled.
- Avatar image falls back to initials on load error.

Components reusable for mobile:

- Avatar/initials component.
- Profile stat cards.
- Recent ticket activity list.
- Profile form fields.
- Verified badge.

UX improvements over web:

- Separate read-only account identity from editable preferences until backend persistence is confirmed.
- Use native image picker only after confirming avatar upload API mapping.

### 16. Settings

Web source screen:

- `apps/web/src/pages/settings/SettingsPage.jsx`

Mobile redesign:

- Native settings screen for local theme and notification channel preferences.

API mapping:

- No backend API in current web implementation.
- Web persists:
  - `urbanmind_theme`
  - `urbanmind_push_notifications`
  - `urbanmind_email_notifications`

Required permissions:

- Authenticated Service User.

Business workflow mapping:

- Theme options: `corporate`, `dark`.
- Push notifications toggle persists locally.
- Email notifications toggle persists locally.
- Save settings writes to local storage in web.

Validation rules:

- Unsupported theme values fall back to `corporate`.
- Notification values are boolean strings in storage.

Components reusable for mobile:

- Theme selector.
- Notification toggle row.
- Save confirmation toast.

UX improvements over web:

- Map local storage behavior to native persistent storage.
- Do not register push notification tokens unless a backend contract exists.

## API Mapping Summary

### Auth

| API | Endpoint | Service User mobile usage |
| --- | --- | --- |
| `authApi.login(email, password)` | `POST /api/auth/login` | Login |
| `authApi.register(fullName, email, password, phone)` | `POST /api/auth/register` | Register |
| `authApi.googleLogin(idToken)` | `POST /api/auth/google-login` | Google login |
| `authApi.refreshToken(refreshToken)` | `POST /api/auth/refresh-token` | Session refresh |
| `authApi.sendOtp()` | `POST /api/auth/email-verification/send-otp` | OTP send/resend |
| `authApi.verifyOtp(otp)` | `POST /api/auth/email-verification/verify` | OTP verify |

### Tickets

All Service User ticket APIs must use role `service-user`, which maps to `/api/user/feedbacks` through `getFeedbackBasePath`.

| API | Endpoint | Service User mobile usage |
| --- | --- | --- |
| `ticketApi.getTickets(filters, { role: 'service-user' })` | `GET /api/user/feedbacks` | Dashboard, my tickets, archive, profile stats |
| `ticketApi.getTicketById(feedbackId, { role: 'service-user' })` | `GET /api/user/feedbacks/{feedbackId}` | Ticket detail, result, rework |
| `ticketApi.createTicket(..., { role: 'service-user' })` | `POST /api/user/feedbacks` | Create ticket |
| `ticketApi.updateTicket(feedbackId, data, { role: 'service-user' })` | `PUT /api/user/feedbacks/{feedbackId}` | Rework/update/resubmit |
| `ticketApi.deleteTicket(feedbackId, { role: 'service-user' })` | `DELETE /api/user/feedbacks/{feedbackId}` | Delete where web allows |
| `ticketApi.addAttachments(feedbackId, files, { role: 'service-user' })` | `POST /api/user/feedbacks/{feedbackId}/attachments` | Rework/detail evidence upload |
| `ticketApi.deleteAttachment(feedbackId, attachmentId, { role: 'service-user' })` | `DELETE /api/user/feedbacks/{feedbackId}/attachments/{attachmentId}` | Attachment removal where web allows |
| `ticketApi.supportTicket(feedbackId, userId, { role: 'service-user' })` | `POST /api/user/feedbacks/{feedbackId}/support` | Community support |
| `ticketApi.unsupportTicket(feedbackId, userId, { role: 'service-user' })` | `DELETE /api/user/feedbacks/{feedbackId}/support` | Remove community support |
| `ticketApi.addComment(feedbackId, userId, content, { role: 'service-user' })` | `POST /api/user/feedbacks/{feedbackId}/comments` | Comment where web supports |
| `ticketApi.submitReview(feedbackId, userId, rating, isSatisfied, comment, { role })` | `POST /api/user/feedbacks/{feedbackId}/resolution-review` | Rate resolution |

### Community

| API | Endpoint | Service User mobile usage |
| --- | --- | --- |
| `getCommunityFeed(params, { force })` | `GET /api/user/feedbacks/feed` | Community feed, public previews, dashboard community summary |
| `getCommunityFeedDetail(feedbackId)` | `GET /api/user/feedbacks/feed/{feedbackId}` | Community detail and hydrated preview |
| `getCommunityFeedPreview(feedbackId)` | Existing feed detail/preview contract | Preview cards |

### Notifications

| API | Endpoint | Service User mobile usage |
| --- | --- | --- |
| `notificationApi.getNotifications(pageNumber, pageSize, isRead)` | `GET /api/notifications` | Notification list |
| `notificationApi.markNotificationAsRead(notificationId)` | `PATCH /api/notifications/{notificationId}/read` | Open/mark read |
| `notificationApi.markAllNotificationsAsRead()` | `PATCH /api/notifications/read-all` | Mark all read |

### Tools and Reference Data

| API | Service User mobile usage |
| --- | --- |
| `toolsApi.getAreas()` | Create ticket location, dashboard area selector |
| `toolsApi.getCategories()` | Create ticket, filters, labels |
| `toolsApi.aiClassify(title, description)` | AI category/priority suggestion |
| `toolsApi.checkDuplicates(categoryId, latitude, longitude)` | Duplicate detection in create ticket |

## Business Workflow Mapping

### Authentication Workflow

1. Register with valid name, email, phone, password, and confirmation.
2. Send OTP after registration.
3. Verify OTP.
4. If verified, route Service User to home.
5. If unverified after login, route to OTP verification.

### Ticket Creation Workflow

1. Load areas and categories.
2. Collect title and description.
3. Reuse AI classification API for category/priority suggestion.
4. Collect area and coordinates.
5. Reuse duplicate detection API.
6. Attach evidence.
7. Submit with `ticketApi.createTicket` to `/api/user/feedbacks`.
8. Navigate to user ticket tracking flow.

### Ticket Tracking Workflow

1. Fetch own tickets from `/api/user/feedbacks`.
2. Display status groups using web status mappings.
3. Open detail for full timeline, comments/chat, attachments, and location.
4. Route to rework center for `NEED_REWORK` or `REJECTED` where web exposes it.
5. Route to result page for resolution/review statuses.
6. Submit satisfaction review when allowed.
7. Close ticket after successful review through existing review API behavior.

### Community Workflow

1. Browse public/community feed.
2. Filter/search using existing feed params.
3. View detail.
4. View map.
5. Support existing feedback when authenticated.
6. View or add comments only where current APIs and web UI support it.

### Notification Workflow

1. Load notifications with existing notification API.
2. Pull to refresh using the same list API.
3. Mark notification as read on open.
4. Navigate to related ticket, result, or rework route using web notification route parsing.

## Validation Rules Summary

| Area | Rules |
| --- | --- |
| Login | Email/phone required; password required; no web email-format validation before submit |
| Register | Full name required/min 2; email required/format; phone required and `^0\d{9}$`; password min 8; confirm password required and must match |
| OTP | Six digits; resend cooldown 60 seconds; visible validity 5 minutes |
| Create ticket description | Title required; description required |
| Create ticket location | Area required; latitude required; longitude required |
| Create ticket evidence | At least one image/video; max 5 files; image max 5 MB; video max 10 MB; total max 20 MB |
| Create ticket priority | `Low`, `Medium`, `High`, `Urgent`; normalize `Critical` to `Urgent`; default `Medium` |
| Ticket chat/comment | Trimmed content must be non-empty |
| Resolution review | Rating defaults to 5; satisfaction defaults to true; comment optional |
| Community support/comment | Authenticated actions only; do not add moderation validation |
| Settings | Unsupported theme falls back to `corporate`; preferences are local-only |

## Status Mappings

Source: `managementTypes.feedbackStatus` and shared semantic classes from `@urbanmind/shared-types`. Do not create new statuses or mobile-only status colors.

### Status Values Used By Service User Web Screens

| Status constant | Mobile label intent | Service User usage |
| --- | --- | --- |
| `SUBMITTED` | Submitted | Created and waiting for intake |
| `AI_REVIEWED` | AI reviewed / classifying | Intake/classification state |
| `VERIFIED` | Verified | Accepted for processing |
| `ASSIGNED` | Assigned | Assigned to handler |
| `IN_PROGRESS` | In progress | Work is underway |
| `RESOLVED` | Resolved | Result exists or is under review |
| `SUBMITTED_FOR_APPROVAL` | Submitted for approval | Result checking state |
| `APPROVED` | Approved / awaiting user review | User can review resolution |
| `NEED_REWORK` | Need rework | User attention or additional information required |
| `CLOSED` | Closed | Completed after review/closure |
| `REJECTED` | Rejected | Not accepted; may route to rework/explanation |
| `CANCELLED` | Cancelled | Cancelled terminal state where shown by detail |

Minimum statuses explicitly required by mobile scope:

- Submitted
- Assigned
- In Progress
- Resolved
- Closed
- Need Rework
- Rejected

Mobile must still gracefully render the additional Service User web statuses above because they are present in current web workflows.

### List Group Mappings

| Group | Statuses |
| --- | --- |
| Processing | `SUBMITTED`, `AI_REVIEWED`, `VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `NEED_REWORK` |
| Checking | `RESOLVED`, `SUBMITTED_FOR_APPROVAL` |
| Results | `RESOLVED`, `SUBMITTED_FOR_APPROVAL`, `APPROVED`, `CLOSED` |
| Awaiting review | `APPROVED` |
| Ended | `CLOSED` |

### Dashboard Metric Mappings

| Metric | Source logic |
| --- | --- |
| Total | `Math.max(ticketTotal, residentTickets.length)` |
| In progress | Non-duplicate tickets with `VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED_FOR_APPROVAL`, or `NEED_REWORK` |
| Ended | Tickets with `CLOSED` |
| Needs attention | Non-duplicate `NEED_REWORK` plus non-duplicate `APPROVED` |
| Recent activity | Five tickets sorted by latest `updatedAt` or `createdAt` |

### Public Feed Visibility Mappings

| Rule | Source logic |
| --- | --- |
| Hidden public statuses | `SUBMITTED`, `AI_REVIEWED` |
| Terminal public statuses | `RESOLVED`, `APPROVED`, `CLOSED` |
| Public item exclusion | Exclude `isPublic === false`, `visibility === private`, or `scope === internal` |

## Components Reusable For Mobile

Reuse behavior, hierarchy, naming, and semantic mappings rather than DOM code.

| Web component/pattern | Mobile adaptation |
| --- | --- |
| Dashboard summary cards | Native metric cards |
| Recent ticket list | Native ticket activity list |
| Ticket status badge / shared status classes | Native badge using same semantic status mapping |
| Ticket timeline / citizen journey | Native vertical timeline |
| Ticket card | Native list item/card |
| Create ticket stepper | Native wizard progress indicator |
| Area/category selectors | Native picker, searchable sheet, or chips |
| Location picker and map cards | Native map picker and map preview |
| Attachment gallery/uploader | Native image/video picker, preview grid, and media viewer |
| Duplicate warning panel | Native warning card/action sheet |
| Resolution review form | Native rating and satisfaction controls |
| Rework reason panel | Native alert/action card |
| Community feed item | Native feed card |
| Support button | Native support CTA with same API |
| Comment list/composer | Native threaded comment area where supported |
| Incident map | Native map with markers and bottom sheet |
| Notification list item | Native notification row with unread state |
| Empty state | Native empty-state component |
| Loading skeleton/spinner | Native skeleton/spinner |
| Error/success alerts | Native toast/banner/snackbar |
| Profile avatar/initials | Native avatar component |
| Settings toggle rows | Native switch rows |

## Mobile Architecture Mapping

Suggested mobile structure must stay aligned with Service User scope:

```text
app/
├─ (auth)
├─ (resident)
│  ├─ home
│  ├─ tickets
│  ├─ community
│  ├─ profile
│  └─ create-ticket
├─ components
├─ services
├─ stores
├─ hooks
├─ constants
└─ theme
```

Architecture constraints:

- State: Zustand.
- Server state: React Query.
- Navigation: Expo Router.
- Styling: NativeWind.
- Typography: Geist.
- API services must wrap existing shared API contracts.
- Status constants must come from shared status definitions.
- Permissions must come from Service User permission definitions.
- No staff/admin/provider routes or permissions in the mobile Service User app.
