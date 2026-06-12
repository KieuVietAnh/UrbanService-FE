# UrbanMind Web - Refactor Notes

This file documents the current app folder conventions after the shared-package refactor.

- `src/` — application source
  - `components/` — UI components (per-page and layout)
  - `pages/` — route pages
  - `services/api/` — thin re-exports which forward to `@urbanmind/shared-api`
  - `contexts/`, `hooks/`, `routes/`, `assets/` — app-specific code

Refactor done:
- App now uses `@urbanmind/shared-api` for shared API logic and `@urbanmind/shared-types` for types/constants.
- Local `store/mockStore.js` removed; mock data accessed via `@urbanmind/shared-api` toolsApi.

Next actions (optional):
- Extract more reusable components into `packages/shared-ui` and replace usages across `apps/web`.
- Consolidate mobile app (`apps/mobile`) to use the same shared packages where applicable.
