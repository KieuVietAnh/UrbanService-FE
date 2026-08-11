# Mobile Implementation Audit (Urban Service Monorepo)

> **Auditor Role:** Senior Mobile Architect / Senior React Native Auditor / Senior Expo Router Auditor  
> **Target Package:** `apps/mobile`  
> **Source of Truth:** Web Application (`apps/web`) & `MOBILE_SCREEN_INVENTORY.md`  
> **Scope:** Service User Role ONLY (`APP_ROLES.SERVICE_USER`)  

---

## Executive Summary

| Area | Status | Key Findings |
| --- | --- | --- |
| **Screen Coverage** | `PARTIAL` | 12 core screens implemented; 3 dedicated screens missing (`Rework Center`, `Resolution Result`, `Closed Ticket Archive`); 2 legacy/extra screens present (`(staff)/index.tsx`, `community-legacy.tsx`). |
| **Navigation** | `PARTIAL` | Expo Router stack & tabs with `useAuthGuard` role enforcement. Alias route redundancies (`create.tsx` vs `create-feedback.tsx`, `home.tsx` vs `index.tsx`). |
| **APIs** | `PARTIAL` | Correctly reuses `@urbanmind/shared-api` for Auth, Tickets, Notifications, Users, Tools. `messageApi.ts` invents non-standard endpoints (`/messages`), and `communityApi.ts` bypasses `axiosClient` with raw `fetch`. |
| **Shared Types** | `PASS` | Reuses `@urbanmind/shared-types` directly (`managementTypes`, `getStatusIntent`, `getStatusLabel`, `getPriorityIntent`, `APP_ROLES`). Local `status.ts` deleted. |
| **Design System** | `PASS` | All 11 core UI components (`AppButton`, `AppInput`, `PasswordInput`, `AppBadge`, `AppCard`, `AppHeader`, `AppSkeleton`, `AppEmptyState`, `AppErrorState`, `Toast`, `BottomSheet`) fully implemented using `semantics` design tokens. |
| **Features** | `PARTIAL` | 12 features completed. Dedicated Rework Center wizard & Dedicated Closed Ticket Archive screens remain to be built as standalone routes. |
| **Production Readiness**| `PARTIAL` | TypeScript compiles with 0 errors. Dead code in `App.js`, unused `feedbackMock.ts`, and leftover `(staff)` route directory need cleanup. |

---

## 1. Screen Coverage Audit

### Implemented Screens (12/15)
1. **Home / Dashboard Entry:** `app/(resident)/index.tsx` (and `home.tsx` alias) — Hero, Quick Actions Bento, Nearby Incidents, Recent Activity, Impact Strip.
2. **Login:** `app/(auth)/login.tsx` — Email/Phone login, password toggle, validation matching web.
3. **Register:** `app/(auth)/register.tsx` — Full Name, Phone (`^0\d{9}$`), Email regex, Password (min 8 chars), Confirm Password, Terms checkbox.
4. **OTP Email Verification:** `app/(auth)/verify-email.tsx` & `app/(auth)/otp.tsx` — 6-digit OTP input, resend timer (60s), email payload.
5. **My Tickets:** `app/(resident)/tickets/index.tsx` — Search, status filter chips, ticket card list, pull-to-refresh.
6. **Ticket Detail:** `app/(resident)/tickets/[id].tsx` — Status badge, timeline, location, description, attachments gallery, discussion sheet, review CTA.
7. **Create Ticket Wizard:** `app/(resident)/create-feedback.tsx` & `create-feedback-wizard.tsx` — 5-step wizard (Category, Description, Location, Evidence, Review), draft recovery, AI classification, duplicate detection, location GPS, image/video uploads.
8. **Resolution Review:** `app/(resident)/tickets/[id]/review.tsx` — 1-5 Star rating, satisfaction toggle, comment textarea, `submitReview` API.
9. **Community Feed:** `app/(resident)/community/index.tsx` — Search, category/status filter chips, support toggle, detail navigation.
10. **Community Detail:** `app/(resident)/community/[id].tsx` — Feedback details, map preview pin, attachments gallery, support toggle button.
11. **Community Map:** `app/(resident)/community/map.tsx` & `map.web.tsx` — Interactive map pins, status filters, bottom sheet feedback preview.
12. **Notifications:** `app/(resident)/notifications.tsx` — Unread filter chips, mark all as read, date grouping, deep linking into ticket details.
13. **Profile:** `app/(resident)/profile.tsx` — User info, avatar initials, ticket activity stats, edit profile modal (`userApi.updateProfile`), logout.

### Missing Screens (3)
1. **Dedicated Rework Center Screen (`/tickets/:feedbackId/rework`):** Web source `ReworkCenterPage.jsx`. Currently, tickets needing rework display a `NEED_REWORK` badge on Ticket Detail, but lack a dedicated corrective action form route.
2. **Dedicated Resolution Result Screen (`/tickets/:feedbackId/result`):** Web source `ResolutionResultPage.jsx`. Currently handled via inline modal / review route `tickets/[id]/review.tsx`.
3. **Dedicated Closed Ticket Archive Screen (`/tickets/archive`):** Web source `ClosedFeedbackArchivePage.jsx`. Currently filtered within `tickets/index.tsx` under "Đã đóng" tab.

### Extra / Orphaned Screens (2)
1. **`app/(staff)/index.tsx`:** Leftover Staff route. Mobile app scope is strictly for `SERVICE_USER`.
2. **`app/(resident)/community-legacy.tsx`:** Orphaned legacy screen not connected to bottom tab navigation.

---

## 2. Route Audit

```text
apps/mobile/app/
├── _layout.tsx                 # Root layout with RootNavigation & useAuthGuard
├── index.tsx                   # Entry dispatcher
├── unsupported-role.tsx        # Unsupported role block screen for non-Service User roles
├── (auth)/
│   ├── _layout.tsx             # Auth stack layout
│   ├── login.tsx               # /login
│   ├── register.tsx            # /register
│   ├── verify-email.tsx        # /verify-email
│   ├── otp.tsx                 # /otp (delegates to verify-email)
│   └── onboarding.tsx          # /onboarding
└── (resident)/
    ├── _layout.tsx             # Tab bar layout (Home, Tickets, Create, Community, Profile)
    ├── index.tsx               # /(resident)
    ├── home.tsx                # /(resident)/home (alias)
    ├── create-feedback.tsx     # /(resident)/create-feedback
    ├── create-feedback-wizard.tsx # /(resident)/create-feedback-wizard
    ├── create.tsx              # /(resident)/create (alias)
    ├── notifications.tsx       # /(resident)/notifications
    ├── profile.tsx            # /(resident)/profile
    ├── community/
    │   ├── index.tsx           # /(resident)/community
    │   ├── map.tsx             # /(resident)/community/map
    │   ├── map.web.tsx         # Expo Web fallback
    │   └── [id].tsx            # /(resident)/community/[id]
    └── tickets/
        ├── index.tsx           # /(resident)/tickets
        └── [id]/
            ├── index.tsx       # /(resident)/tickets/[id]
            └── review.tsx      # /(resident)/tickets/[id]/review
```

### Route Findings
- **Deep Linking:** Configured in `app.json` (`scheme: "urbanmind"`).
- **Route Aliases:** `home.tsx` -> `index.tsx`, `create.tsx` -> `create-feedback.tsx`. Safe, but creates duplicate route definitions.
- **Orphan Routes:** `app/(resident)/community-legacy.tsx` is completely disconnected from Expo Router navigation.

---

## 3. Role Audit

- **Enforcement:** `src/features/auth/useAuthGuard.ts` strictly enforces `user.role === APP_ROLES.SERVICE_USER`.
- **Non-Service User Block:** If a `system-staff`, `system-admin`, or `service-provider` logs in, `useAuthGuard` immediately redirects to `app/unsupported-role.tsx`.
- **Leftover Artifacts:**
  - `app/(staff)/index.tsx` exists in the filesystem.
  - `src/components/staff/StaffStatCard.tsx` and `src/components/staff/StaffTaskCard.tsx` exist in the components folder.

---

## 4. API Audit

| Service / API | Source | Endpoint Mapping | Status |
| --- | --- | --- | --- |
| `authApi.login` | `@urbanmind/shared-api` | `POST /api/auth/login` | `CORRECT` |
| `authApi.register` | `@urbanmind/shared-api` | `POST /api/auth/register` | `CORRECT` |
| `authApi.sendOtp` | `@urbanmind/shared-api` | `POST /api/auth/email-verification/send-otp` | `CORRECT` |
| `authApi.verifyOtp` | `@urbanmind/shared-api` | `POST /api/auth/email-verification/verify` | `CORRECT` |
| `ticketApi.getTickets` | `@urbanmind/shared-api` | `GET /api/user/feedbacks` | `CORRECT` |
| `ticketApi.getTicketById` | `@urbanmind/shared-api` | `GET /api/user/feedbacks/{id}` | `CORRECT` |
| `ticketApi.createTicket` | `@urbanmind/shared-api` | `POST /api/user/feedbacks` (Multipart) | `CORRECT` |
| `ticketApi.submitReview` | `@urbanmind/shared-api` | `POST /api/user/feedbacks/{id}/resolution-review` | `CORRECT` |
| `notificationApi.getNotifications` | `@urbanmind/shared-api` | `GET /api/notifications` | `CORRECT` |
| `userApi.getProfile` / `updateProfile` | `@urbanmind/shared-api` | `GET/PUT /api/user/profile/{id}` | `CORRECT` |
| `toolsApi.getAreas` / `getCategories` | `@urbanmind/shared-api` | `GET /api/tools/areas`, `categories` | `CORRECT` |
| `toolsApi.aiClassify` / `checkDuplicates` | `@urbanmind/shared-api` | `POST /api/tools/ai-classify`, `check-duplicates` | `CORRECT` |
| `messageApi.ts` | Custom mobile file | `GET/POST /api/feedbacks/{id}/messages` | `INVENTED` — Non-standard endpoints. Should use `ticketApi.getComments` / `addComment`. |
| `communityApi.ts` | Custom mobile file | `GET /api/user/feedbacks/feed` | `NON-STANDARD` — Uses raw `fetch` instead of `axiosClient` interceptors. |

---

## 5. Shared Types Audit

- **Source of Truth Integration:** `@urbanmind/shared-types` is directly consumed for:
  - `managementTypes.feedbackStatus`
  - `getStatusIntent`, `getStatusLabel`
  - `getPriorityIntent`
  - `APP_ROLES`, `getRoleLabel`, `getInternalRole`
- **Cleanups Completed:** Local `src/constants/status.ts` was deleted.
- **Remaining Minor Exception:** `src/constants/feedbackCategories.ts` hardcodes category string IDs (`'lighting'`, `'sanitation'`) instead of strictly mapping to integer category IDs returned by `toolsApi.getCategories()`.

---

## 6. Design System Audit

All 11 core components in `src/components/ui/` are fully implemented with semantic tokens (`semantics`):

1. `AppButton` (`src/components/ui/AppButton.tsx`) — `IMPLEMENTED` (Variants, scale animation, loading state).
2. `AppInput` (`src/components/ui/AppInput.tsx`) — `IMPLEMENTED` (Icons, error state, floating labels).
3. `PasswordInput` (`src/components/ui/PasswordInput.tsx`) — `IMPLEMENTED` (Toggle visibility, secure text entry).
4. `AppBadge` (`src/components/ui/AppBadge.tsx`) — `IMPLEMENTED` (Status, priority, severity, variants, dot).
5. `AppCard` (`src/components/ui/AppCard.tsx`) — `IMPLEMENTED` (Press scale animation, shadows, borders).
6. `AppHeader` (`src/components/ui/AppHeader.tsx`) — `IMPLEMENTED` (Back button, title, right action slot).
7. `AppSkeleton` (`src/components/ui/AppSkeleton.tsx`) — `IMPLEMENTED` (Shimmer animation, SkeletonCard).
8. `AppEmptyState` (`src/components/ui/AppEmptyState.tsx`) — `IMPLEMENTED` (Icon, message, action button).
9. `AppErrorState` (`src/components/ui/AppErrorState.tsx`) — `IMPLEMENTED` (Error message, retry button).
10. `Toast` (`src/components/ui/Toast.tsx`) — `IMPLEMENTED` (ToastProvider, useToast, feedback semantics).
11. `BottomSheet` (`src/components/ui/BottomSheet.tsx`) — `IMPLEMENTED` (Reanimated gesture handler, spring animation).

---

## 7. Feature Audit

| Feature | Status | Details |
| --- | --- | --- |
| **Home Dashboard** | `COMPLETE` | Welcome hero, Quick actions bento, nearby incidents, recent activity, impact strip, pull-to-refresh. |
| **Notifications** | `COMPLETE` | Filter chips (All/Unread), mark all read, date grouping, ticket deep links, pull-to-refresh. |
| **Profile** | `COMPLETE` | Profile card, role badge, ticket stats, edit profile modal (`userApi.updateProfile`), logout. |
| **Tickets List** | `COMPLETE` | Search bar, status filter chips, ticket card list, pull-to-refresh. |
| **Ticket Detail** | `COMPLETE` | Status badge, description, location, attachments gallery (modal zoom), timeline, discussion sheet. |
| **Comments** | `COMPLETE` | BottomSheet discussion thread, `feedbackApi.getComments`, `feedbackApi.addComment`. |
| **Attachments** | `COMPLETE` | Image/video attachment preview gallery with full-screen zoom modal. |
| **Resolution Review** | `COMPLETE` | Star rating (1-5), satisfaction toggle, comment textarea, `submitReview` API integration. |
| **Create Ticket Wizard** | `COMPLETE` | 5-step wizard (Category, Description, Location, Evidence, Review), draft recovery, AI classify, duplicate check. |
| **Community Feed** | `COMPLETE` | Search, status/category filter chips, support toggle button, detail navigation. |
| **Community Detail** | `COMPLETE` | Incident details, location map pin preview, evidence gallery, support toggle button. |
| **Community Map** | `COMPLETE` | Interactive markers, status filters, bottom sheet incident preview (Native & Web fallbacks). |
| **Rework Center Screen** | `PARTIAL` | `NEED_REWORK` status badge displayed on detail; dedicated `/tickets/:id/rework` standalone screen missing. |
| **Closed Ticket Archive** | `PARTIAL` | Filterable within ticket list "Đã đóng" tab; dedicated `/tickets/archive` standalone screen missing. |

---

## 8. State Management Audit

- **Server State (React Query):** Query keys properly scoped (`['feedback', id]`, `['notifications', filter]`, `['userProfile', userId]`). Invalidation handles mutations cleanly (`queryClient.invalidateQueries`).
- **Client State (Zustand):**
  - `auth.store.ts` — `urbanmind-auth` persisted via `AsyncStorage`.
  - `createFeedback.store.ts` — Wizard draft state.
- **Findings:**
  - `src/hooks/useAsyncStorage.ts` is unused (AsyncStorage handled directly in `asyncStorage.ts`).

---

## 9. Mock / Temporary Code Audit

1. **`src/mocks/feedbackMock.ts`:** Unused mock file containing legacy status definitions (`pending`, `in_progress`, `completed`) and hardcoded fake data.
2. **`App.js`:** 77 lines of commented-out dead placeholder code.
3. **`apps/mobile/src/components/brand/BrandLogo.js`:** Duplicate JavaScript file alongside `BrandLogo.tsx`.
4. **`apps/mobile/src/constants/theme.js`:** Duplicate JavaScript file alongside `theme.ts`.

---

## 10. Production Readiness Audit

- **TypeScript Compilation (`npx tsc --noEmit --skipLibCheck`):** **0 errors (Exit Code 0)**.
- **`tsconfig.json` Configuration:** Contains `"ignoreDeprecations": "6.0"`, which causes CLI warnings on direct `tsc` runs.
- **Error Boundaries:** `AppErrorState` implemented across screens; root Error Boundary advisable for unhandled crashes.
- **CORS & Dev Server:** API Base URL dynamically configured to `https://api.urbanservice.me` with CORS proxy support for Expo Web dev testing (`http://localhost:8081`).

---

## Actionable Recommendations (Post-Audit)

1. **Delete Dead & Legacy Files:**
   - Remove `app/(staff)/index.tsx` and staff components (`StaffStatCard`, `StaffTaskCard`).
   - Remove `app/(resident)/community-legacy.tsx`.
   - Remove unused `src/mocks/feedbackMock.ts`.
   - Remove `App.js` dead comments and duplicate `.js` files (`BrandLogo.js`, `theme.js`).
2. **Refactor `messageApi.ts` & `communityApi.ts`:**
   - Replace invented `/api/feedbacks/{id}/messages` with standard `ticketApi.getComments` / `addComment`.
   - Refactor `communityApi.ts` to use `axiosClient` instead of raw `fetch`.
3. **Build Dedicated Rework & Archive Routes (Optional Enhancement):**
   - Add dedicated `/tickets/:id/rework` and `/tickets/archive` screens to achieve 100% parity with web routes.
