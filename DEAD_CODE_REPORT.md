# Dead Code Report

## Scope

This report covers the React Native application under `apps/mobile/app` and `apps/mobile/src`.

The audit used:

- Expo Router files under `app/` as runtime entry points.
- Static import and identifier searches across TypeScript, TSX, JavaScript, and JSX files.
- Barrel-only exports were not counted as real consumers.
- ESLint's `@typescript-eslint/no-unused-vars` results were used for unused imports, parameters, and local declarations.
- Platform-specific files and Expo Router routes were treated conservatively because Metro resolution and deep links are not fully represented by static reference counts.

No source files were deleted or modified as part of this audit.

## Executive summary

| Category | High-confidence findings | Main concern |
| --- | ---: | --- |
| Components and screens | 17 modules or isolated exports | Old component experiments and superseded messaging/reporting implementations |
| Hooks | 6 hooks | Hooks are only referenced by dead legacy chains or their own barrels |
| Types | 6 directly unused or transitively unused type groups | Types remain exported after their consumers were superseded |
| Utilities and APIs | 6 modules, plus 3 ambiguous extension twins | Duplicate compatibility files and abandoned helpers |
| Local unused symbols | 40+ ESLint warnings | Unused imports, parameters, query state, and constants inside active files |

## Unused components

### High confidence: isolated shared components

These symbols have no consumer outside their defining file and barrel export.

| File | Export | Evidence | Recommendation |
| --- | --- | --- | --- |
| `src/components/shared/action-sheet.tsx` | `ActionSheet` | Only referenced in its own file and `components/shared/index.ts` | Remove after confirming no planned modal migration depends on it. Update the shared barrel at the same time. |
| `src/components/shared/app-loading.tsx` | `AppLoading` | No route or component imports it | Remove or adopt it as the single loading-state component. |
| `src/components/shared/app-modal.tsx` | `AppModal` | No external references | Remove if native Router modals are the chosen pattern. |
| `src/components/layouts/app-screen.tsx` | `AppScreen` | No external references | Either adopt it across screens or remove it; retaining an unused layout abstraction adds architectural ambiguity. |
| `src/components/ui/CommunicationHub.tsx` | `CommunicationHub` | No external references; `FloatingChatMenu` is used directly instead | Remove the wrapper or migrate consumers to it deliberately. |
| `src/components/ui/AppInput.regression.tsx` | `AppInputRegressionHarness` | Not referenced by tests or routes | Move into a real test/story harness or remove it. |
| `src/components/shared/app-skeleton.tsx` | `SkeletonLine` | The module is active, but this export has no consumer | Remove only the unused export, not the shared skeleton module. |

### High confidence: superseded reporting components

| File | Evidence | Recommendation |
| --- | --- | --- |
| `src/features/reporting/components/ticket-card.tsx` | The active `tickets-screen.tsx` declares and renders its own local `TicketCard`; it does not import this module | Choose one implementation, migrate the screen if necessary, then remove the duplicate module. |
| `src/features/reporting/components/ticket-attachment-grid.tsx` | No consumer outside its own file/barrel | Confirm the active ticket detail attachment UI is authoritative, then remove. |
| `src/features/reporting/components/ticket-timeline.tsx` | No consumer outside its own file/barrel; ticket detail uses `TimelineStep` directly | Remove or refactor ticket detail to use it before removal. |
| `src/features/reporting/components/ticket-status-badge.tsx` | Compatibility re-export only; consumers import the shared UI badge | Remove the wrapper and its reporting barrel export. |

### High confidence: legacy messaging chain

The following modules form an internally connected chain but have no route or active component entry point:

```text
legacy-inbox-screen
  -> conversation-list
      -> conversation-item
  -> use-conversations

conversation-chat-screen
  -> conversation-message-bubble
  -> conversation-composer
  -> use-messages
      -> use-message-queue
      -> socket
```

Files:

- `src/features/messaging/components/legacy-inbox-screen.tsx`
- `src/features/messaging/components/conversation-list.tsx`
- `src/features/messaging/components/conversation-item.tsx`
- `src/features/messaging/components/conversation-chat-screen.tsx`
- `src/features/messaging/components/conversation-message-bubble.tsx`
- `src/features/messaging/components/conversation-composer.tsx`

The active inbox routes use `InboxHubScreen` and `InboxConversationScreen`, while feedback chat uses `FeedbackChatSection`, `FeedbackMessageBubble`, and `MessageComposer`.

Recommendation: remove the legacy chain as one migration unit after confirming it is not a paused alternative implementation. Removing individual files first would leave transitively broken modules and barrel exports.

### Medium confidence: duplicated web map implementation

`src/features/community/components/community-map.web.tsx` has no runtime consumer. The actual web route is implemented independently in `app/(resident)/community/map.web.tsx`, while the native route imports `CommunityMapNative`.

Recommendation: compare both web implementations visually and functionally. Keep one authoritative implementation and have the route re-export it before deleting the duplicate.

## Unused hooks

| Hook | File | Evidence | Recommendation |
| --- | --- | --- | --- |
| `useAsyncStorage` | `src/hooks/useAsyncStorage.ts` | No consumer outside its own definition/barrel | Remove the hook if direct `AsyncStorageService` usage is intentional. Keep the service, which is active. |
| `useAuth` | `src/features/auth/useAuth.ts` | No external consumer; application code uses `useAuthStore` | Remove the wrapper or standardize consumers on it. |
| `useCreateFeedbackStore` | `src/features/reporting/hooks/use-create-feedback-store.ts` | No consumer; the active wizard uses local React state | Remove after confirming draft persistence will not be moved back to Zustand. |
| `useConversations` | `src/features/messaging/hooks/use-conversations.ts` | Used only by `legacy-inbox-screen.tsx` | Remove with the legacy inbox chain. |
| `useMessages` / `useSendMessage` | `src/features/messaging/hooks/use-messages.ts` | Used only by the unreferenced `conversation-chat-screen.tsx` | Remove with the legacy conversation chain. |
| `useMessageQueue` | `src/features/messaging/hooks/use-message-queue.ts` | Used only by `useMessages` | Remove with the legacy conversation chain. |

## Unused types

### Directly unused

| Type | File | Evidence | Recommendation |
| --- | --- | --- | --- |
| `PaginatedResponse` | `src/types/shared.types.ts` | No use outside its declaration | Remove or use as the shared API pagination contract. |
| `ApiError` | `src/types/shared.types.ts` | No use outside its declaration | Replace repeated ad-hoc error shapes with it, or remove it. |
| `ConversationType` | `src/features/messaging/types/messaging.types.ts` | No use outside its declaration | Remove unless it is part of a documented public contract. |
| `MessageType` | `src/features/messaging/types/messaging.types.ts` | No use outside its declaration | Remove unless future message rendering depends on it. |

### Transitively unused

- `CreateFeedbackDraft` and `CreateFeedbackActions` are used only by the unused `useCreateFeedbackStore` hook.
- `Conversation` and the legacy `Message` type are consumed only by the legacy messaging hooks/components listed above.
- `Message` and `SendMessagePayload` declared by `src/features/messaging/api/message-api.ts` belong to an API module with no consumer.

Recommendation: remove these types in the same change as their owning dead hooks or APIs. Avoid deleting them independently while their modules still compile against them.

## Unused utilities and APIs

### High confidence

| File | Evidence | Recommendation |
| --- | --- | --- |
| `src/constants/routes.ts` | `ROUTES` appears only in its declaration | Remove it or replace hard-coded route strings with it consistently. |
| `src/constants/shadows.ts` | No imports; active components use `src/theme/shadows.ts` | Remove the obsolete duplicate after verifying values are represented in the theme system. |
| `src/mocks/feedbackMock.ts` | No imports or identifier references | Move under a test fixture directory if still useful; otherwise remove. |
| `src/features/messaging/api/message-api.ts` | `messageApi` has no consumer outside its declaration/barrel | Remove with the legacy messaging implementation or integrate it into the active chat flow. |
| `src/features/messaging/api/socket.ts` | `getSocketClient` is used only by the unused `useMessages` chain | Remove with the legacy messaging implementation. |
| `src/features/reporting/types/feedback-categories.ts` | `FEEDBACK_CATEGORIES` has no consumer outside its declaration/barrel | Remove or make it the source of truth for the report wizard categories. |

### Ambiguous duplicate-extension files

The following pairs share the same extensionless module path:

- `src/constants/theme.js` and `src/constants/theme.ts`
- `src/screens/splash/SplashScreen.js` and `src/screens/splash/SplashScreen.tsx`
- `src/components/brand/BrandLogo.js` and `src/components/brand/BrandLogo.tsx`

TypeScript normally resolves the typed file, while Metro's resolution order can differ by configuration. Static analysis therefore cannot safely identify which twin is dead at runtime.

Recommendation: inspect Metro resolution, compare the twin contents, then retain one canonical TypeScript implementation. Treat this as medium-to-high removal risk until a production bundle confirms the selected files.

## Unused symbols inside active files

ESLint reports unused imports, parameters, or local values in active modules. Important examples include:

- `axiosClient`, `tabBarHeight`, and `toast` in `app/(resident)/_layout.tsx`.
- `router` and `markers` in `app/(resident)/community/map.web.tsx`.
- `View` in `app-modal.tsx`; `colors` and `className` in `app-skeleton.tsx`; `Animated` in `app-step-bar.tsx`.
- Several unused React hooks imported by `bottom-sheet.tsx`.
- `Clipboard` and `isFocused` in `otp-input.tsx`.
- `SNAP_INTERVAL` and `scrollY` in `community-map.native.tsx`.
- Unused loading/error query state in multiple messaging screens.
- `FloatingChatMenu` imports in notification and ticket-detail screens.
- `getCategoryName`, `onNext`, `canProceed`, `categoryName`, and `priority` in the reporting wizard.

Recommendation: address these as a separate low-risk cleanup after adding focused tests. Unused callback parameters may reveal incomplete behavior, so review them instead of deleting mechanically.

## Structural observations

- Empty `api`, `components`, `hooks`, and `types` barrels under `ai`, `maps`, `profile`, and parts of `auth`, `community`, and `notifications` are scaffolding rather than executable dead code. They add navigation noise but may be retained if those domains are actively planned.
- `src/api/index.ts` and `src/features/index.ts` currently act as public aggregation surfaces but have no direct consumers. They should not be classified as dead solely for that reason; they may define intended architecture boundaries.
- Expo Router route files were not marked dead even when no in-app navigation reference was found. Routes may remain reachable through deep links or external notifications.

## Recommended cleanup sequence

1. Add or confirm smoke coverage for inbox, chat, ticket detail, report creation, and community maps.
2. Remove isolated, high-confidence shared components and update their barrels in one change.
3. Remove the legacy inbox/conversation chain as a single atomic change.
4. Remove the unused reporting component duplicates after comparing them with the inline active implementations.
5. Consolidate `.js`/`.tsx` and `.js`/`.ts` twins only after checking Metro production resolution.
6. Remove transitively unused hooks and types together with their owning modules.
7. Address ESLint unused-symbol warnings in active files separately from architectural deletion work.
8. Re-run TypeScript, ESLint, Expo production export, circular-dependency checks, and route smoke tests after each cleanup group.

## Risk assessment

| Change group | Risk | Reason |
| --- | --- | --- |
| Remove isolated components with zero consumers | Low | No non-barrel references were found |
| Remove unused exports such as `SkeletonLine` | Low | Owning active module remains intact |
| Remove reporting duplicates | Low to medium | Active screens contain replacement implementations, but UI parity should be checked |
| Remove legacy messaging chain | Medium | Static evidence is strong, but chat behavior and planned fallback paths should be confirmed |
| Remove unused types with their dead owners | Low | Compile-time-only impact and clear transitive ownership |
| Consolidate duplicate extension files | Medium to high | Metro and TypeScript may resolve different twins |
| Remove apparently orphaned Expo routes | High | Deep links and notification routing are not visible to static reference searches |

## Conclusion

The safest immediate cleanup targets are the isolated shared components, unused reporting wrappers, unused root hook/type utilities, and the obsolete constants/mock files. The legacy messaging chain is also a strong candidate but should be removed atomically after a chat-flow smoke test. Duplicate extension files require the most caution because runtime resolution may differ from TypeScript resolution.
