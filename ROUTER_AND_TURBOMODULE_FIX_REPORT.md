# Router and TurboModule Fix Report

## Summary
- Fixed Expo Router route export issues by replacing alias-style route re-exports with explicit redirect components.
- Removed debug probe code that triggered `react-native-reanimated` TurboModule initialization at app startup.
- Verified route export audit across `apps/mobile/app` shows no missing default exports or route re-export patterns.
- Verified Expo startup on a clean port (`8083`) with Metro bundler running.

## Files Changed

- `apps/mobile/app/_layout.tsx`
  - Removed debug probe import and call that triggered `installTurboModule()` inspection during startup.

- `apps/mobile/app/(auth)/verify-email.tsx`
  - Replaced re-export alias with an explicit `Redirect` component to `/(auth)/otp`.

- `apps/mobile/app/(resident)/create-feedback.tsx`
  - Replaced re-export alias with an explicit `Redirect` component to `/(resident)/create-feedback-wizard`.

- `apps/mobile/app/(resident)/create.tsx`
  - Replaced re-export alias with an explicit `Redirect` component to `/(resident)/create-feedback-wizard`.

- `apps/mobile/app/(resident)/home.tsx`
  - Replaced re-export alias with an explicit `Redirect` component to `/(resident)`.

- `apps/mobile/src/components/ui/AppButton.tsx`
  - Removed debug probe injection before importing `react-native-reanimated`.

- `apps/mobile/src/debug/reanimatedProbe.ts`
  - Stopped runtime invocation of `ReanimatedTurboModule.installTurboModule()` and left only passive inspection.

## Root Cause

### Missing Default Exports
- Some route files were implemented as alias modules that imported a component from another route file and then re-exported it as `export default ComponentName;`.
- Expo Router expects route files to export a default React component directly, or to return a `Slot`/`Stack`/`Redirect` from the route file itself.
- Alias exports can confuse route resolution and lead to errors such as "Route `./xxx.tsx` is missing the required default export.".

### TurboModule Error
- The mobile app contained custom debug code that actively probed Reanimated internals and called `installTurboModule()` on the native module proxy.
- `react-native-reanimated` itself also contains an internal `installTurboModule()` call during module initialization; our debug probe increased the likelihood of surfacing the host-function argument mismatch.
- The reported HostFunction error likely stems from runtime initialization of Reanimated in this Expo/React Native environment.

## Package Audit
- `expo`: `~54.0.36`
- `expo-router`: `~6.0.24`
- `react-native`: `0.81.5`
- `react-native-reanimated`: `4.1.7`
- `react-native-gesture-handler`: `~2.28.0`
- `nativewind`: `4.1.23`

These versions are broadly aligned with Expo SDK 54, but `react-native-reanimated@4.1.7` is an older patch release and may be sensitive to runtime bridge behavior in RN `0.81.5`.

## Boot Verification
- `expo start --clear --port 8083` launched successfully.
- Metro bundler began waiting on `exp://...:8083` and `http://localhost:8083`.
- No route export warnings were observed during startup.

## Remaining Notes
- The current fix removes app-level probes and route alias exports.
- If the TurboModule error still appears on a physical device or emulator, the next recommended step is to align `react-native-reanimated` with the installed React Native/Expo SDK versions, e.g. upgrading Reanimated to a version officially compatible with RN `0.81.5`.
