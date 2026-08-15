# Phase 13 — Migration Baseline Freeze Report

Validation date: 2026-08-15  
Scope: `apps/mobile`  
Branch: `giaunh`

## Executive Summary

The mobile architecture migration baseline satisfies the Phase 13 static validation criteria. All mobile application source files are present and tracked, TypeScript and Expo production export pass, ESLint has zero errors, and the transient internal dependency scan found no unresolved imports or circular components.

No application source, route, feature boundary, public API, dead-code candidate, or `apps/web` file was changed during Phase 13. This report is the only file created by the phase.

## 1. Git State

### Pre-report snapshot

The initial `git status --untracked-files=all` snapshot contained 15 working-tree entries:

| Scope | Modified | Deleted | Added | Untracked | Total entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Repository | 8 | 5 | 0 | 2 | 15 |
| `apps/mobile` | 1 | 0 | 0 | 0 | 1 |
| `apps/web` | 6 | 5 | 0 | 0 | 11 |
| Other/root | 1 | 0 | 0 | 2 | 3 |

There were no staged changes.

### Final snapshot accounting

Creating this report adds one untracked mobile document. The expected final working-tree accounting is therefore:

| Scope | Modified | Deleted | Added | Untracked | Total entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Repository | 8 | 5 | 0 | 3 | 16 |
| `apps/mobile` | 1 | 0 | 0 | 1 | 2 |
| `apps/web` | 6 | 5 | 0 | 0 | 11 |
| Other/root | 1 | 0 | 0 | 2 | 3 |

### Mobile changes requiring an explicit staging decision

- Modified: `src/features/messaging/components/inbox-hub-screen.tsx`
  - This is an existing pre-Phase-13 inbox loading/overlay behavior change.
  - Phase 13 did not alter it.
  - It should be intentionally included in the checkpoint or committed separately; it must not be staged accidentally as an assumed architecture-only change.
- Untracked after this report: `BASELINE_FREEZE_REPORT.md`

### Migration documents requiring an explicit staging decision

- Repository root `MIGRATION_REPORT.md` is untracked.
- Repository root `DEAD_CODE_REPORT.md` is untracked.
- `apps/mobile/BASELINE_FREEZE_REPORT.md` is untracked when first created.

### Migration source tracking

- Actual source files under `apps/mobile/app` and `apps/mobile/src`: 201
- Git-tracked source files under those paths: 201
- Untracked source files: 0
- Tracked-but-missing source files: 0
- Barrel `index.ts` files under `apps/mobile/src`: 51
- Untracked barrel files: 0

The earlier migration condition where Git represented a logical move as a deleted old path plus an untracked replacement is no longer present. Representative legacy paths are absent, while their replacements exist and are tracked:

| Legacy path | Tracked replacement |
| --- | --- |
| `src/services/api/feedbackApi.ts` | `src/features/reporting/api/feedback-api.ts` |
| `src/services/api/communityApi.ts` | `src/features/community/api/community-api.ts` |
| `src/services/api/messageApi.ts` | `src/features/messaging/api/message-api.ts` |
| `src/services/api/notificationApi.ts` | `src/features/notifications/api/notification-api.ts` |
| `src/features/feedback/createFeedback.store.ts` | `src/features/reporting/hooks/use-create-feedback-store.ts` |
| `src/features/inbox/screens/InboxScreen.tsx` | `src/features/messaging/components/legacy-inbox-screen.tsx` |
| `src/components/community/CommunityFeedCard.tsx` | `src/features/community/components/community-feed-card.tsx` |
| `src/components/community/CommunityMap.native.tsx` | `src/features/community/components/community-map.native.tsx` |
| `src/components/community/CommunityMap.web.tsx` | `src/features/community/components/community-map.web.tsx` |

### Unrelated changes intentionally ignored

Phase 13 did not modify, stage, restore, or delete any of the following existing work:

- `.gitignore` — modified outside the Phase 13 report operation.
- `apps/web/src/main.jsx` — modified.
- `apps/web/vite.config.js` — modified.
- Tracked Playwright HTML, screenshots, traces, videos, and retry artifacts under `apps/web/tests/results` — a mixture of modified and deleted files.

## 2. Validation Results

| Validation | Result | Details |
| --- | --- | --- |
| TypeScript | PASS | `pnpm exec tsc --noEmit --pretty false` exited 0 |
| ESLint errors | 0 | `pnpm run lint` exited 0 |
| ESLint warnings | 270 | Existing warning baseline retained; no warnings fixed |
| Expo production export | PASS | Web bundle completed with 1,567 modules |
| Expo route metadata | PASS | Export generated `metadata.json` and `index.html` |
| Native-only map leakage | PASS | No `react-native-maps`/clustering web-bundle failure |
| Unresolved Expo modules | 0 | No Metro unresolved-module error |
| Broken internal imports | 0 | Transient scanner resolved relative imports, `@/`, re-exports, literal dynamic imports, indexes, and platform suffixes |
| Circular internal dependencies | 0 | No strongly connected component was found |
| Invalid barrel exports | 0 found | TypeScript, Expo export, and the import graph all resolved the tracked barrels |

### Dependency validation method

The repository does not currently contain a reusable dependency-validation script or configured package such as Madge or dependency-cruiser. No package was installed and no permanent tooling was added.

For this freeze, a transient in-memory Node scan covered:

- 199 executable/source modules (`.ts`, `.tsx`, `.js`, `.jsx`, excluding declarations)
- 280 resolved internal dependency edges
- static imports and re-exports
- literal `require()` and dynamic `import()` calls
- relative imports and `@/` aliases
- directory indexes and `.native`/`.web` platform candidates

This scan found zero broken internal imports and zero circular components. TypeScript and the Expo production bundle provide independent resolution checks. Runtime-computed module paths and cycles inside third-party packages are outside this scan.

### Expo export isolation

`apps/mobile/dist` already existed before validation, so Phase 13 did not overwrite or remove it. The production export was directed to a unique system temporary directory, completed successfully, and the exact temporary directory was removed afterward.

## 3. Migration Integrity

### Route structure preserved

`apps/mobile/app` remains the Expo Router layer. No route was moved or renamed during Phase 13.

The following migration routes remain thin delegates to feature implementations:

- AI list and detail → `@/features/messaging`
- Inbox list and conversation → `@/features/messaging`
- Notifications → `@/features/notifications`
- Report creation wizard → `@/features/reporting`
- Ticket list, detail, and review → `@/features/reporting`

### Feature files present

All expected feature boundaries exist:

- `auth`
- `reporting`
- `community`
- `messaging`
- `notifications`
- `home`
- `profile`
- `maps`
- `ai`

The shared component layers `components/ui`, `components/shared`, and `components/layouts` are present. The centralized `theme` boundary is present.

### Platform-specific modules preserved

The following platform pairs/files exist:

- `community-map.native.tsx` / `community-map.web.tsx`
- `nearby-incidents-map.native.tsx` / `nearby-incidents-map.web.tsx`
- `feedback-location-picker.native.tsx` / `feedback-location-picker.web.tsx`
- `ticket-location-map.native.tsx` / `ticket-location-map.web.tsx`
- Expo route `community/map.web.tsx`

Consumers use extensionless imports so Metro can select the correct platform file:

- `community-map`
- `nearby-incidents-map`
- `feedback-location-picker`
- `ticket-location-map`

No `index.ts` barrel under `apps/mobile/src` imports `react-native-maps`, `react-native-map-clustering`, a `.native` module, or `CommunityMapNative`. Native-only map packages therefore remain behind platform-specific leaves.

### Source-loss assessment

- All 201 discovered app/source files are tracked.
- No tracked app/source file is missing.
- Representative deleted legacy modules have tracked replacements.
- TypeScript, Metro, and the source graph resolve the replacements and barrels.

No accidental mobile source loss was detected.

## 4. Generated Artifacts

### Existing mobile artifacts

| Path | State | Ignore rule | Phase 13 action |
| --- | --- | --- | --- |
| `apps/mobile/dist/` | Existing, untracked | `dist/` | Preserved; not overwritten or deleted |
| `apps/mobile/.expo/` | Existing, untracked | `.expo/` | Preserved |
| `apps/mobile/expo-web.log` | Existing, untracked | `*.log` | Preserved |

No mobile `coverage/`, `test-results/`, `playwright-report/`, or `tests/results/` path was found.

### Temporary Phase 13 artifact

- A unique Expo output directory was created under the system temporary directory.
- The export produced `index.html`, `metadata.json`, assets, and web bundles.
- The exact temporary output was safely removed after successful validation.

### Out-of-scope generated artifacts

Tracked Playwright results under `apps/web/tests/results` have existing modified/deleted state. They were reported as likely generated artifacts but were not changed or removed because `apps/web` is explicitly out of scope and ownership is uncertain.

## 5. Comparison With Existing Reports

### `MIGRATION_REPORT.md`

Still confirmed:

- TypeScript passes.
- ESLint has 0 errors and 270 warnings.
- Expo web export passes.
- Route delegates remain in place.
- Feature boundaries and platform map leaves exist.
- Broken internal imports and circular components remain zero.

Discrepancy:

- The report states that Git “currently” represents migration moves as deleted legacy paths plus untracked feature paths. That statement is now stale: all 201 mobile app/source files are tracked, with zero missing or untracked source files. The report remains useful as historical move documentation.

### `DEAD_CODE_REPORT.md`

Targeted reference checks found no new active consumer that invalidates its principal high-confidence conclusions. Examples such as `ActionSheet`, `AppLoading`, `AppModal`, `AppScreen`, `CommunicationHub`, `AppInputRegressionHarness`, `SkeletonLine`, `useAsyncStorage`, `useCreateFeedbackStore`, and `FEEDBACK_CATEGORIES` remain referenced only by their definitions and/or barrels. The legacy messaging hooks remain confined to the documented legacy chain.

No dead-code recommendation was acted on. Runtime/deep-link caveats in that report remain applicable.

### Current uncommitted mobile behavior change

`src/features/messaging/components/inbox-hub-screen.tsx` contains an existing uncommitted spinner/initial-content overlay change made before Phase 13. This does not contradict the architecture report, but it means the working-tree checkpoint includes a behavioral fix in addition to migration documentation. It should be reviewed and staged intentionally.

## 6. Baseline Risks

The following risks remain intentionally unresolved:

- Native Android runtime has not been regression tested.
- Native iOS runtime has not been regression tested.
- Realtime messaging and websocket lifecycle have not been runtime tested.
- Inbox loading/overlay behavior has static validation only and still needs device verification.
- Reporting wizard submission, attachments, location permissions, and draft behavior have not been device tested.
- Native community, home-preview, report-picker, and ticket-detail maps have not been device tested.
- Authenticated navigation, deep links, and notification-driven routes have not been end-to-end tested.
- ESLint retains 270 warnings, primarily explicit `any` and unused symbols.
- The documented dead-code backlog remains intact.
- Duplicate `.js`/`.ts(x)` extension pairs remain intentionally unconsolidated.
- There is no repository-owned reusable circular/broken-import validation command.
- Existing generated Playwright artifacts under `apps/web` remain dirty and must be handled by their owner, outside the mobile checkpoint.
- The two root migration reports and this baseline report require an explicit staging decision.

## 7. Readiness Decision

All Phase 13 static success criteria are satisfied:

- TypeScript passes.
- ESLint has zero errors and the 270-warning baseline is recorded.
- Expo production web export passes and emits route metadata.
- Broken internal imports: 0.
- Circular internal dependencies: 0.
- Required migration files are present and tracked.
- Route delegates, barrels, feature boundaries, and platform leaves resolve.
- No accidental mobile source deletion was detected.
- `apps/web` existing work was not touched.
- This baseline freeze report was generated.

## READY FOR PHASE 14

Suggested commit message:

```text
chore(mobile): freeze architecture migration baseline
```

No commit or staging action was performed.
