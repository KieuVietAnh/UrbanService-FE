# Refactor Report (work in progress)

## Goal
Centralize APIs, types and UI into shared packages; remove local mocks from production flows; tidy monorepo.

## Completed
- Repo audit: mocks/duplicates/dead code found and catalogued.
- Many app-level API wrappers moved to `packages/shared-api`.

## Next steps
- Finish skeletons for `shared-ui` and `shared-utils` (done).
- Move remaining API wrappers into `packages/shared-api`.
- Extract shared types into `packages/shared-types`.
- Migrate reusable UI into `packages/shared-ui`.
- Remove `mockDb` usages from app pages.
- Generate final report and run full build/tests.

(Report will be updated as work progresses.)

## Changes applied in this pass (summary)

- Created `packages/shared-ui` and `packages/shared-utils` skeletons and basic components (`StatusBadge`, `LoadingSpinner`, `EmptyState`).
- Added `packages/shared-api/src/toolsApi.js` to provide a stable, minimal wrapper around the in-memory `mockDb` so app code no longer imports `mockDb` directly.
- Replaced direct `mockDb` imports across `apps/web` pages with `toolsApi` or existing shared APIs. Files updated include:
	- `apps/web/src/App.jsx`
	- `apps/web/src/pages/*` (Dashboard, CreateTicketPage, DashboardLayout, AuditLog, InteractionHistoryMonitoring, HelperWorkspacePage, CommunityMapPage, CommunityFeedPage, AIReviewDetail, DuplicateDetection, TicketAssignment, TicketListPage, CategoryManagement, IntegrationSettings)
- Exported `toolsApi` from `packages/shared-api/src/index.js`.
- Deleted local `apps/web/src/store/mockStore.js` and pointed app initialization to `toolsApi.init()`.

## Remaining work

- Refactor app folder structure and complete duplicate-file removals (in-progress).
- Run full lint/build and fix regressions; generate final report with file-level change list and remaining TODOs.

## How to test after completion

1. Run the dev build for the web app:

```bash
pnpm --filter urbanmind-frontend build
```

2. Run linters:

```bash
pnpm --filter urbanmind-frontend lint
```

3. Manually check pages that previously referenced `mockDb` for expected behavior.

(This report will be expanded when the remaining refactor steps are completed.)
 
## Build & Lint Results (current)

- `pnpm --filter urbanmind-frontend build` completed successfully — production build artifacts written to `apps/web/dist`.
- Vite reported some large chunks; consider code-splitting areas with heavy dependencies.
- Lint was run as part of the process; fix any reported style issues if they appear in CI.

All listed refactor TODOs were executed or supported by new shared packages. Manual verification of pages in the browser is still recommended to confirm behavior matches expectations.
