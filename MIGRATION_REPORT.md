# Mobile Architecture Migration Report

Validation date: 2026-08-15

## Scope

This report covers the React Native application in `apps/mobile`, including its Expo Router routes and source modules. Existing unrelated changes under `apps/web` are outside this report.

The migration reorganized source ownership and imports. It did not change reporting, community, messaging, notification, or authentication business rules. During final validation, native map implementations were placed behind platform-specific leaf modules so the existing native UI remains available while the Expo web bundle no longer imports native-only map packages.

## Validation summary

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pass | `pnpm exec tsc --noEmit --pretty false` exited 0 |
| ESLint | Pass with warnings | `pnpm run lint` exited 0 with 0 errors and 270 warnings |
| Expo Router / production bundle | Pass | `pnpm exec expo export --platform web` bundled 1,567 modules and generated `index.html` and route metadata |
| Broken internal imports | Pass | Static graph resolved all internal relative and `@/` imports; 0 unresolved imports |
| Circular dependencies | Pass | Tarjan strongly-connected-component scan found 0 circular source components |

The dependency scan covered 199 TypeScript/TSX/JavaScript/JSX modules under `app` and `src`, with 280 resolved internal dependency edges. It recognizes static imports, re-exports, literal dynamic imports, relative paths, the `@/` alias, directory indexes, and native/web suffixes. Package-internal dependency cycles and runtime-computed module names are outside its scope.

The Expo export initially exposed native-only map imports through universal barrels. Final validation corrected those architecture boundaries using `.native.tsx` and `.web.tsx` leaf components plus TypeScript `moduleSuffixes`. The final export passed and its temporary output was removed.

## 1. Files moved

Git currently represents the migration as deleted legacy paths plus new untracked feature paths rather than detected renames. The following are the logical moves.

### Reporting

| Previous location | Current location |
| --- | --- |
| `src/services/api/feedbackApi.ts` | `src/features/reporting/api/feedback-api.ts` |
| `src/features/feedback/createFeedback.store.ts` | `src/features/reporting/hooks/use-create-feedback-store.ts` |
| `src/constants/feedbackCategories.ts` | `src/features/reporting/types/feedback-categories.ts` |
| `src/components/tickets/TicketAttachmentGrid.tsx` | `src/features/reporting/components/ticket-attachment-grid.tsx` |
| `src/components/tickets/TicketCard.tsx` | `src/features/reporting/components/ticket-card.tsx` |
| `src/components/tickets/TicketStatusBadge.tsx` | Reporting compatibility export and shared `components/ui/TicketStatusBadge.tsx` |
| `src/components/tickets/TicketTimeline.tsx` | Reporting compatibility component and shared `components/ui/TimelineStep.tsx` |
| Report wizard route implementation | `src/features/reporting/components/create-feedback-wizard-screen.tsx` |
| Tickets list route implementation | `src/features/reporting/components/tickets-screen.tsx` |
| Ticket detail route implementation | `src/features/reporting/components/ticket-detail-screen.tsx` |
| Ticket review route implementation | `src/features/reporting/components/ticket-review-screen.tsx` |

Final validation also introduced platform leaf components for the report location picker and ticket location preview:

- `feedback-location-picker.native.tsx` / `feedback-location-picker.web.tsx`
- `ticket-location-map.native.tsx` / `ticket-location-map.web.tsx`
- `reporting-map.types.ts`

### Community

| Previous location | Current location |
| --- | --- |
| `src/components/community/CommunityFeedCard.tsx` | `src/features/community/components/community-feed-card.tsx` |
| `src/components/community/CommunityMap.native.tsx` | `src/features/community/components/community-map.native.tsx` |
| `src/components/community/CommunityMap.web.tsx` | `src/features/community/components/community-map.web.tsx` |
| `src/services/api/communityApi.ts` | `src/features/community/api/community-api.ts` |
| Community route implementation | `src/features/community` public surfaces and route delegates |

The native and web map files are intentionally not eagerly re-exported from the community component barrel. The route imports the extensionless platform module so Metro selects the correct implementation.

### Messaging, inbox, chat, and AI conversations

| Previous location | Current location |
| --- | --- |
| `src/services/api/messageApi.ts` | `src/features/messaging/api/message-api.ts` |
| `src/features/inbox/lib/socket.ts` | `src/features/messaging/api/socket.ts` |
| `src/features/inbox/hooks/useConversations.ts` | `src/features/messaging/hooks/use-conversations.ts` |
| `src/features/inbox/hooks/useMessageQueue.ts` | `src/features/messaging/hooks/use-message-queue.ts` |
| `src/features/inbox/hooks/useMessages.ts` | `src/features/messaging/hooks/use-messages.ts` |
| `src/features/inbox/types/inbox.types.ts` | `src/features/messaging/types/messaging.types.ts` |
| `src/features/inbox/components/ChatComposer.tsx` | `src/features/messaging/components/conversation-composer.tsx` |
| `src/features/inbox/components/ConversationItem.tsx` | `src/features/messaging/components/conversation-item.tsx` |
| `src/features/inbox/components/ConversationList.tsx` | `src/features/messaging/components/conversation-list.tsx` |
| `src/features/inbox/components/MessageBubble.tsx` | `src/features/messaging/components/conversation-message-bubble.tsx` |
| `src/features/inbox/screens/ChatScreen.tsx` | `src/features/messaging/components/conversation-chat-screen.tsx` |
| `src/features/inbox/screens/InboxScreen.tsx` | `src/features/messaging/components/legacy-inbox-screen.tsx` |
| `src/features/feedback/components/FeedbackChatSection.tsx` | `src/features/messaging/components/feedback-chat-section.tsx` |
| `src/features/feedback/components/MessageBubble.tsx` | `src/features/messaging/components/feedback-message-bubble.tsx` |
| `src/features/feedback/components/MessageComposer.tsx` | `src/features/messaging/components/message-composer.tsx` |
| AI conversation route implementations | `ai-conversations-screen.tsx` and `ai-conversation-screen.tsx` |
| Active inbox route implementations | `inbox-hub-screen.tsx` and `inbox-conversation-screen.tsx` |
| Ticket feedback chat route | `feedback-chat-screen.tsx` |
| Feedback selection route | `select-feedback-screen.tsx` |

Expo Router files remain at their original route paths and delegate to feature screens, preserving route URLs and parameter names.

### Notifications

| Previous location | Current location |
| --- | --- |
| `src/services/api/notificationApi.ts` | `src/features/notifications/api/notification-api.ts` |
| Notifications route implementation | `src/features/notifications/components/notifications-screen.tsx` |
| Notification contracts | `src/features/notifications/types/notification.types.ts` |

### Shared components and layouts

| Previous location | Current location |
| --- | --- |
| `components/ui/AppScreen.tsx` | `components/layouts/app-screen.tsx` |
| `components/ui/ActionSheet.tsx` | `components/shared/action-sheet.tsx` |
| `components/ui/AppEmptyState.tsx` | `components/shared/app-empty-state.tsx` |
| `components/ui/AppErrorState.tsx` | `components/shared/app-error-state.tsx` |
| `components/ui/AppLoading.tsx` | `components/shared/app-loading.tsx` |
| `components/ui/AppModal.tsx` | `components/shared/app-modal.tsx` |
| `components/ui/AppSkeleton.tsx` | `components/shared/app-skeleton.tsx` |
| `components/ui/AppStepBar.tsx` | `components/shared/app-step-bar.tsx` |
| `components/ui/AppTextArea.tsx` | `components/shared/app-text-area.tsx` |
| `components/ui/BottomSheet.tsx` | `components/shared/bottom-sheet.tsx` |
| `components/ui/OTPInput.tsx` | `components/shared/otp-input.tsx` |
| `components/ui/PasswordInput.tsx` | `components/shared/password-input.tsx` |
| `components/ui/Toast.tsx` | `components/shared/toast.tsx` |

Domain-independent primitives remain under `components/ui`, reusable composites are under `components/shared`, and screen wrappers are under `components/layouts`.

### Domain scaffolding and theme

Feature boundaries now exist for `auth`, `reporting`, `community`, `messaging`, `notifications`, `profile`, `maps`, and `ai`, each with `components`, `hooks`, `api`, and `types` public surfaces where applicable.

The theme system now exposes:

- `colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, and `shadows.ts`
- `buttonStyles.ts`, `cardStyles.ts`, `inputStyles.ts`, and `badgeStyles.ts`
- `semantics.ts` and the theme barrel

## 2. Imports updated

- Mobile imports use the `@/` source alias instead of deep `../../../` traversal.
- Domain consumers import reporting, community, messaging, and notification APIs from their feature ownership boundaries.
- Route files delegate to feature screens without moving or renaming Expo Router routes.
- Shared UI consumers import from `@/components/ui`, `@/components/shared`, or `@/components/layouts`.
- Theme consumers can import tokens and reusable style groups from `@/theme` modules.
- Root and local barrels were added for components, hooks, APIs, types, and features.
- Platform-only map implementations are imported through extensionless leaf modules; native map modules are not exported through universal barrels.
- TypeScript now declares `moduleSuffixes: [".native", ""]`, matching the native compile target while Metro continues choosing `.web` during web bundling.

Final compiler, bundle, and graph checks found no broken internal imports.

## 3. Architecture improvements

1. Domain ownership is explicit. Reporting, community, messaging, and notifications own their screens, API adapters, hooks, and contracts.
2. Expo Router is a navigation layer rather than the primary home of feature implementations. Existing route paths remain stable.
3. Shared UI has three clear layers: primitives, reusable composites, and layouts.
4. Cross-project source traversal is reduced through stable aliases and public barrels.
5. Styling primitives are centralized in a typed theme system, reducing repeated raw values and creating consistent semantic tokens.
6. Native-only dependencies sit behind platform-specific leaves, preventing universal barrels from leaking `react-native-maps` and `react-native-map-clustering` into web bundles.
7. Static dependency validation now shows an acyclic internal graph with fully resolved source imports.
8. Dead-code findings are documented separately in `DEAD_CODE_REPORT.md`; no candidate was deleted during this validation.

## 4. Remaining technical debt

### ESLint backlog

ESLint passes but reports 270 warnings. The dominant groups are:

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unused-vars`

High-density files include the native community map, reporting wizard, ticket detail, inbox hub, messaging hooks, and API adapters. These warnings do not block the build but weaken type safety and obscure genuinely stale code.

### Dead and duplicate code

`DEAD_CODE_REPORT.md` identifies:

- 17 unused or isolated component/screen modules or exports
- 6 unused hooks
- 6 directly or transitively unused type groups
- 6 unused utility/API modules
- 3 ambiguous duplicate-extension pairs

Important candidates include the legacy messaging chain, unused reporting wrappers, obsolete shadow constants, unused root hooks, and duplicate `.js`/`.ts(x)` implementations. They were intentionally retained.

### Oversized screens and components

Several components still combine data access, orchestration, and extensive UI/style definitions:

- `create-feedback-wizard-screen.tsx`
- `inbox-hub-screen.tsx`
- `community-map.native.tsx`
- `ticket-detail-screen.tsx`

Future work should extract view models and focused sections only after behavior coverage exists.

### Incomplete feature boundaries

`ai`, `maps`, and `profile` are currently scaffolds with mostly empty barrels. AI conversation code is intentionally owned by messaging today. These directories should either gain clear ownership or be collapsed to avoid misleading boundaries.

### Duplicate web map implementation

The community map currently has both a route-level `map.web.tsx` and a feature-level `community-map.web.tsx`. Select one authoritative web implementation after visual verification.

### Test coverage

The mobile package has no automated test script. Final validation covered static compilation, lint, import resolution, cycles, and a production web export, but did not exercise Android/iOS devices, authenticated navigation, realtime chat, location permissions, media selection, or API behavior.

### Package modernization

`expo-av` remains installed. This migration did not alter media behavior or dependencies; its usage and Expo SDK compatibility should be reviewed separately.

## 5. Risk assessment

| Area | Risk | Assessment |
| --- | --- | --- |
| TypeScript and imports | Low | Compiler and internal import graph pass with zero unresolved imports |
| Circular dependencies | Low | No circular source components found across 199 modules |
| Expo Router paths | Low | Route files and parameters remain in place; production web export passes |
| Native maps | Medium | Native components preserve map props/callbacks, but Android/iOS runtime smoke tests were not run |
| Web maps | Low to medium | Web now bundles successfully using inert map fallbacks; visual behavior should be reviewed |
| Messaging and realtime | Medium | Architecture compiles, but websocket lifecycle and active chat flows lack automated coverage |
| Reporting wizard | Medium | Large stateful screen compiles, but location, attachment, draft, and submission paths need device testing |
| ESLint debt | Medium | 270 warnings increase maintenance and regression risk despite zero lint errors |
| Dead-code removal | Medium to high | Static candidates are documented, but deep links, planned fallbacks, and Metro extension resolution require confirmation before deletion |
| Overall migration | Medium | Static and web-build validation are clean; native end-to-end validation remains the principal gap |

## Final mobile source tree

```text
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── onboarding.tsx
│   │   ├── otp.tsx
│   │   ├── register.tsx
│   │   └── verify-email.tsx
│   ├── (resident)/
│   │   ├── ai/
│   │   │   ├── [conversationId].tsx
│   │   │   └── index.tsx
│   │   ├── community/
│   │   │   ├── [id].tsx
│   │   │   ├── index.tsx
│   │   │   ├── map.tsx
│   │   │   └── map.web.tsx
│   │   ├── inbox/
│   │   │   └── [conversationId].tsx
│   │   ├── support/
│   │   │   └── select-feedback.tsx
│   │   ├── tickets/
│   │   │   ├── [id]/
│   │   │   │   ├── chat.tsx
│   │   │   │   └── review.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── _layout.tsx
│   │   ├── community-legacy.tsx
│   │   ├── create.tsx
│   │   ├── create-feedback.tsx
│   │   ├── create-feedback-wizard.tsx
│   │   ├── home.tsx
│   │   ├── inbox.tsx
│   │   ├── index.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx
│   ├── index.tsx
│   └── unsupported-role.tsx
├── src/
│   ├── api/
│   │   └── index.ts
│   ├── components/
│   │   ├── auth/
│   │   │   └── UrbanHeroBackground.tsx
│   │   ├── brand/
│   │   │   ├── BrandLogo.js
│   │   │   └── BrandLogo.tsx
│   │   ├── layouts/
│   │   │   ├── app-screen.tsx
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── action-sheet.tsx
│   │   │   ├── app-empty-state.tsx
│   │   │   ├── app-error-state.tsx
│   │   │   ├── app-loading.tsx
│   │   │   ├── app-modal.tsx
│   │   │   ├── app-skeleton.tsx
│   │   │   ├── app-step-bar.tsx
│   │   │   ├── app-text-area.tsx
│   │   │   ├── bottom-sheet.tsx
│   │   │   ├── index.ts
│   │   │   ├── otp-input.tsx
│   │   │   ├── password-input.tsx
│   │   │   └── toast.tsx
│   │   ├── ui/
│   │   │   ├── AppBadge.tsx
│   │   │   ├── AppButton.tsx
│   │   │   ├── AppCard.tsx
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppInput.regression.tsx
│   │   │   ├── AppInput.tsx
│   │   │   ├── CommunicationHub.tsx
│   │   │   ├── FloatingChatMenu.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── TicketStatusBadge.tsx
│   │   │   ├── TimelineStep.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── config/
│   │   └── api.ts
│   ├── constants/
│   │   ├── role.ts
│   │   ├── routes.ts
│   │   ├── shadows.ts
│   │   ├── theme.js
│   │   └── theme.ts
│   ├── features/
│   │   ├── ai/
│   │   │   ├── api/index.ts
│   │   │   ├── components/index.ts
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/index.ts
│   │   │   └── index.ts
│   │   ├── auth/
│   │   │   ├── api/index.ts
│   │   │   ├── components/index.ts
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/index.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.store.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useAuthGuard.ts
│   │   │   └── index.ts
│   │   ├── community/
│   │   │   ├── api/
│   │   │   │   ├── community-api.ts
│   │   │   │   └── index.ts
│   │   │   ├── components/
│   │   │   │   ├── community-feed-card.tsx
│   │   │   │   ├── community-map.native.tsx
│   │   │   │   ├── community-map.web.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/
│   │   │   │   ├── community.types.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── home/
│   │   │   ├── components/
│   │   │   │   ├── ActiveTickets.tsx
│   │   │   │   ├── ChatFab.tsx
│   │   │   │   ├── CommunityPreview.tsx
│   │   │   │   ├── FeaturedIncidents.tsx
│   │   │   │   ├── HeroCard.tsx
│   │   │   │   ├── HomeHeader.tsx
│   │   │   │   ├── NearbyIncidents.tsx
│   │   │   │   ├── nearby-incidents-map.native.tsx
│   │   │   │   ├── nearby-incidents-map.web.tsx
│   │   │   │   ├── QuickActionCard.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   ├── SectionHeader.tsx
│   │   │   │   └── index.ts
│   │   │   ├── constants/homeActions.ts
│   │   │   ├── hooks/useHomeData.ts
│   │   │   ├── homeStyles.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── maps/
│   │   │   ├── api/index.ts
│   │   │   ├── components/index.ts
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/index.ts
│   │   │   └── index.ts
│   │   ├── messaging/
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   │   ├── message-api.ts
│   │   │   │   └── socket.ts
│   │   │   ├── components/
│   │   │   │   ├── ai-conversation-screen.tsx
│   │   │   │   ├── ai-conversations-screen.tsx
│   │   │   │   ├── conversation-chat-screen.tsx
│   │   │   │   ├── conversation-composer.tsx
│   │   │   │   ├── conversation-item.tsx
│   │   │   │   ├── conversation-list.tsx
│   │   │   │   ├── conversation-message-bubble.tsx
│   │   │   │   ├── feedback-chat-screen.tsx
│   │   │   │   ├── feedback-chat-section.tsx
│   │   │   │   ├── feedback-message-bubble.tsx
│   │   │   │   ├── inbox-conversation-screen.tsx
│   │   │   │   ├── inbox-hub-screen.tsx
│   │   │   │   ├── legacy-inbox-screen.tsx
│   │   │   │   ├── message-composer.tsx
│   │   │   │   ├── select-feedback-screen.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── use-conversations.ts
│   │   │   │   ├── use-message-queue.ts
│   │   │   │   └── use-messages.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   └── messaging.types.ts
│   │   │   └── index.ts
│   │   ├── notifications/
│   │   │   ├── api/
│   │   │   │   ├── index.ts
│   │   │   │   └── notification-api.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   └── notifications-screen.tsx
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   └── notification.types.ts
│   │   │   └── index.ts
│   │   ├── profile/
│   │   │   ├── api/index.ts
│   │   │   ├── components/index.ts
│   │   │   ├── hooks/index.ts
│   │   │   ├── types/index.ts
│   │   │   └── index.ts
│   │   ├── reporting/
│   │   │   ├── api/
│   │   │   │   ├── feedback-api.ts
│   │   │   │   └── index.ts
│   │   │   ├── components/
│   │   │   │   ├── create-feedback-wizard-screen.tsx
│   │   │   │   ├── feedback-location-picker.native.tsx
│   │   │   │   ├── feedback-location-picker.web.tsx
│   │   │   │   ├── reporting-map.types.ts
│   │   │   │   ├── ticket-attachment-grid.tsx
│   │   │   │   ├── ticket-card.tsx
│   │   │   │   ├── ticket-detail-screen.tsx
│   │   │   │   ├── ticket-location-map.native.tsx
│   │   │   │   ├── ticket-location-map.web.tsx
│   │   │   │   ├── ticket-review-screen.tsx
│   │   │   │   ├── ticket-status-badge.tsx
│   │   │   │   ├── ticket-timeline.tsx
│   │   │   │   ├── tickets-screen.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   └── use-create-feedback-store.ts
│   │   │   ├── types/
│   │   │   │   ├── feedback-categories.ts
│   │   │   │   ├── reporting.types.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useAsyncStorage.ts
│   │   └── useQuery.ts
│   ├── mocks/
│   │   └── feedbackMock.ts
│   ├── screens/splash/
│   │   ├── SplashScreen.js
│   │   └── SplashScreen.tsx
│   ├── services/storage/
│   │   └── asyncStorage.ts
│   ├── theme/
│   │   ├── badgeStyles.ts
│   │   ├── buttonStyles.ts
│   │   ├── cardStyles.ts
│   │   ├── colors.ts
│   │   ├── index.ts
│   │   ├── inputStyles.ts
│   │   ├── radius.ts
│   │   ├── semantics.ts
│   │   ├── shadows.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   └── types/
│       ├── auth.types.ts
│       ├── expo-vector-icons.d.ts
│       ├── index.ts
│       ├── shared.types.ts
│       └── urbanmind-shared-types.d.ts
├── package.json
└── tsconfig.json
```

## Conclusion

The mobile architecture migration is statically valid: TypeScript passes, ESLint has no errors, Expo Router produces a production web export, all scanned internal imports resolve, and no circular source dependencies were found. The remaining risk is concentrated in runtime device flows and the documented lint/dead-code backlog, not in unresolved migration imports or route structure.
