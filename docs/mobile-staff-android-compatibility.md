# Staff mobile — Android compatibility evidence

Audit date: 2026-09-01. Scope: Staff screens, safe-area/layout helpers, existing functional flow, and local Android tooling. This is a bounded compatibility check, not a claim that every Android version, OEM, display scale, keyboard or accessibility configuration is supported without further device testing.

## Evidence levels

1. **Pure layout/unit tests** exercise the application's Android inset ownership, responsive content width and font-scale tab geometry without a device.
2. **Expo web fixture smoke** executes Staff UI and API interactions in Chromium. Viewport changes, CSS text enlargement and reduced available height are synthetic browser stress tests, not native Android fontScale, cutout, keyboard or navigation-bar evidence.
3. **Android export** proves the JavaScript/native bundle can be produced; it does not prove an APK builds or runs.
4. **Local APK/emulator** requires separate Gradle/build/install/runtime evidence. Results must be recorded from actual commands and screenshots, not inferred from web tests.

All automated Staff business data below is isolated fixture data. No real Staff account, backend mutation, EAS cloud build or production evidence upload is used by the web tests.

## Local tooling audit

| Item | Observed evidence |
| --- | --- |
| Java | Microsoft OpenJDK 17.0.20+8 LTS, with `JAVA_HOME` pointing to its JDK. |
| Gradle | Wrapper 8.14.3; that distribution has a local cache directory. A cached directory alone does not prove every dependency is cached. |
| Android Gradle plugin | Installed React Native version catalog declares AGP 8.11.0. |
| Android SDK levels | Installed React Native catalog: minSdk 24, compileSdk 36, targetSdk 36, build tools 36.0.0; NDK 27.1.12297006. |
| SDK location | Android `local.properties` points to `C:\Users\richdesu\AppData\Local\Android\Sdk`. Approved host read-only checks confirmed the SDK is present. Earlier sandbox probes produced false negatives / EPERM and must not be cited as a missing SDK. |
| adb | The dedicated Pixel 5 emulator is available as `emulator-5560`; package and screenshot checks target that serial explicitly and refuse an attached physical phone. |
| Emulator | Pixel 5, Android 16 / API 36 x86_64, 1080 × 2340 pixels at density 440. Gesture and three-button navigation overlays were each activated and observed during the native run. |
| Current native device check | The isolated final `staffValidation` APK installed and launched. Fixture-backed Staff login, dashboard, chat list/detail, Gboard open, selected Incident execution, gesture/three-button bars, Android font scale 2 and a 720 × 1280 window were captured from the running app. |
| Current APK | `apps/mobile/android/app/build/outputs/apk/staffValidation/app-staffValidation.apk`, 50,823,243 bytes, SHA-256 `9c07b0405b338e6edcf235bdb010122320d2703d9c5f060a0d6cb83d5c6993ea`. This is a test-only validation artifact, not a production release. |

Local configuration sources: `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, `android/gradle.properties`, `android/app/build.gradle`, `android/local.properties`, `apps/mobile/app.json`, and `node_modules/react-native/gradle/libs.versions.toml`. The Android directory may be ignored by Git; use `rg --files --hidden --no-ignore apps/mobile/android` when inspecting it.

The Expo configuration requests portrait orientation, edge-to-edge Android rendering and keyboard resize. The earlier generated Android manifest used `adjustPan`; the current source manifest declares `adjustResize` and `screenOrientation="portrait"`. The merged validation manifest confirms both settings, along with the test-only flag, distinct package and local-fixture cleartext allowance. Landscape web stress is therefore not a promise of enabled native rotation. Safe-area values come from the running native window rather than fixed Android-version heuristics.

## Automated layout regression

Command from the repository root:

```text
pnpm --dir apps/mobile test:staff
```

Current result: **38/38 pass** across the Staff functional/layout suite and the per-Report SLA suite. The combined Mobile + Shared Incident API + web helper run is **63/63 pass**.

- Android bottom inset 0 / 24 / 48: detail content consumes it; tab content does not consume it a second time. Explicit ownership overrides are covered.
- A visible native header owns the top system inset; headerless content adds the measured top inset.
- Left/right cutouts are preserved. Tablet content is centered and capped at a readable width of 760 logical units. iOS automatic adjustment is not double-padded.
- Five destinations fit ordinary widths 320 / 360 / 390. Fixed tab chrome caps label scaling at 1.4×, permits two lines and keeps all five destinations at least 48 units wide for viewports of 240 units or more. Only a physically narrower viewport falls back to horizontal navigation scrolling; content text outside fixed chrome continues to follow the full system font scale.
- Tab height includes the measured bottom inset exactly once. Transient zero, negative, NaN and infinite platform measurements do not create non-finite layout values.
- Profile metadata explicitly identifies browser evidence and distinguishes nominal frame height from the reduced available content viewport.

These tests exercise `staff-layout.ts`; they do not prove a real screen reader's focus behavior or hardware touch accuracy.

## Browser matrix

The refreshed **390 × 844 baseline passed**: 107 screen/scroll-state captures, 270 intercepted API requests, 107 document/control geometry checks, no runtime errors, no unmocked API traffic and no recorded geometry problems. All four overview contact sheets were visually inspected, including start processing, per-Report SLA, `NeedRework` resubmission, the explicit SVG Back control, Provider and resolution states. The primary ZIP contains 118 verified entries: 107 captures, four overview contact sheets and gallery/metadata.

Run the primary all-screen regression and gallery:

```text
node apps/mobile/tests/staff-smoke.mjs
```

Run the additional profiles serially:

```text
node apps/mobile/tests/staff-compatibility.mjs
```

An individual profile can be rerun, for example:

```text
node apps/mobile/tests/staff-compatibility.mjs tiny
```

Metro must already be serving the app at `http://localhost:8082` (or set `MOBILE_SMOKE_URL`). The harness intercepts every `/api/**` request, fails on unmocked API traffic or runtime errors, preserves all existing functional assertions, and checks horizontal document/control geometry at each capture point. It also checks each rendered text line in the fixed bottom navigation against the tab, clipping ancestors and viewport, so a hidden second label line is a failure. Intentionally scrollable horizontal tabs/filter strips are exempt from horizontal offscreen-item failures, not from vertical label clipping, and remain exercised by interactions.

| Profile | Browser viewport | What is tested / not tested |
| --- | --- | --- |
| baseline | 390 × 844 | Full functional flow and every screen/state capture. |
| small | 360 × 800 | Narrow phone layout and the same complete functional flow. |
| tiny | 320 × 640 | Very narrow/short layout, wrapping and scrolling. |
| large-text | 360 × 800, CSS text × 1.5 | Browser text expansion; does **not** change Android fontScale or React Native's font metrics. Icons are not enlarged. |
| gesture-frame | 360 × 752 | Nominal 360 × 800 minus 24 top / 24 bottom reserved height; does **not** inject safe-area values. |
| three-button-frame | 360 × 728 | Nominal 360 × 800 minus 24 top / 48 bottom reserved height; does **not** render/test native system bars. |
| landscape | 844 × 390 | Short-height stress only; the native app is configured portrait. |
| tablet | 800 × 1280 | Wide/readable content layout; not a physical tablet validation. |

Profile runs save selected screenshots for layout review but still execute the entire functional smoke flow, including errors and read-only guards. Alternate profiles write to `docs/screenshots/mobile-staff-compatibility/<profile>/` and never overwrite the primary all-screen ZIP. Each `verification.json` records the viewport, profile assumptions, request count, runtime errors and geometry checks. The combined browser matrix is `docs/screenshots/mobile-staff-compatibility/matrix.json`; its gallery is `index.html` beside it.

Current matrix result: **7/7 profiles completed the full fixture-backed functional flow on the same final source**, each with 270 intercepted API requests and no runtime/unmocked API errors. Across the matrix this is 1,890 fixture requests, 254 selected screenshots and 820 capture-point geometry checks. Every profile ran horizontal document/control, vertically reachable control and fixed-tab text-line checks; all recorded zero problems. Pure helper tests independently cover the same widths/insets/font sizes.

Fresh large-text and 844 × 390 landscape chat captures were visually inspected: the explicit accessible SVG Back control paints, multiline content remains in its inner scroller, and the fixed action footer/button remains fully visible without overlap. The error notice is reachable within that inner scroller while the action remains fixed. The app is portrait-only; landscape remains a browser stress test and browser Back remains separate from native Android hardware/gesture Back proof.

The standard screenshots and download archive remain `docs/screenshots/mobile-staff/index.html` and `docs/screenshots/mobile-staff.zip`. Screenshots of long screens are scroll segments, not extra routes.

## Native validation build

The opt-in local `staffValidation` variant is **not a production/release-distribution APK**. It embeds the local fixture API, uses a debug signing key, has a distinct package suffix `.staffvalidation`, and is marked `testOnly`. The variant is created only by the explicitly supplied test init script; normal release/debug configuration is not replaced. Run one build at a time through the supplied helper:

```text
node apps/mobile/tests/staff-native-build.mjs
```

The helper selects `:app:assembleStaffValidation`, x86_64, a maximum of two Gradle workers, and offline dependency resolution by default. It embeds `http://127.0.0.1:8100`; the local fixture server and appropriate emulator port forwarding are required at runtime. The init script refuses ordinary release/debug task names or a different API URL. Installation requires adb's test-package flag (`-t`). Build logs are under `apps/mobile/.expo/staff-native-validation/`.

The final local build completed successfully in 4 minutes 2 seconds: 832 Gradle tasks, 24 executed and 808 up-to-date. The resulting APK is 50,823,243 bytes with SHA-256 `9c07b0405b338e6edcf235bdb010122320d2703d9c5f060a0d6cb83d5c6993ea`. Package inspection on the emulator reports version `1.0.0-staff-validation`, minSdk 24, targetSdk 36, x86_64 ABI and `TEST_ONLY`. The merged manifest confirms package `com.giaunh.urbanmind.staffvalidation`, portrait orientation, `adjustResize`, `testOnly=true` and local-fixture cleartext traffic. The validation variant leaves ordinary debug/release configuration untouched.

## Native APK/emulator result

The APK was installed with Android's test-package flag and launched against the isolated fixture server. Direct native captures are in `docs/screenshots/mobile-staff-native/index.html`.

- Fixture-backed Staff login, dashboard, chat list and chat detail rendered in the native React Native/Fabric build.
- Gesture navigation and three-button navigation were each enabled on the dedicated emulator. The app tab bar and last visible controls stayed above the measured system navigation area; no duplicate bottom inset was observed.
- Android font scale 2 made the dashboard metric grid one column and expanded content line boxes without clipping. Fixed header/tab chrome capped at 1.4× and all five tab destinations remained simultaneously visible under three-button navigation.
- After restarting for a 720 × 1280 native window, all five tab destinations still fit while the main content remained vertically scrollable.
- The final APK completed the selected native execution path: `Assigned → InProgress`, per-Report SLA display, `NeedRework` confirmation/resubmission and resolution history. The final logcat check reported no `AndroidRuntime` or `ReactNativeJS` errors.
- Opening Gboard in the public-reply composer kept the focused multiline field and full-width send action above the IME. Android Back dismissed the IME; the action footer remained fixed and visible.
- The explicit SVG Back control painted in the release-like native build. Its measured accessibility/button bounds were 121 × 121 physical pixels on the 440-density emulator.
- The repeatable `staff-native-device.mjs errors` check returned zero `AndroidRuntime`/`ReactNativeJS` error lines after the final chat/IME run. This is evidence for the observed run, not a guarantee against every future runtime path.

This native evidence covers one Pixel 5 API 36 emulator and selected Staff paths. It does not convert the synthetic seven-profile browser matrix into seven physical Android devices, and it does not justify a universal all-OEM claim.

## Remaining pre-release physical/OEM checklist

Use isolated fixtures and a dedicated validation device/profile. Record actual Android version, OEM, navigation mode, display density, font scale and keyboard with each result. The following remain required device-level checks unless separately evidenced:

- **API 24 / 29 / 34 / 35 / 36:** launch, Staff navigation, authenticated role guards and complete Incident execution. API 36 native launch and selected Staff flows are evidenced above; API 24 / 29 / 34 / 35 and the complete native execution flow remain to be run.
- **Gesture and 3-button navigation:** both modes passed the selected API 36 emulator captures. Repeat on representative Samsung, Xiaomi/Redmi, Oppo/Realme and low-memory hardware; verify Back first dismisses each vendor IME/confirmation as expected before navigation.
- **IME variations:** Gboard and at least one vendor keyboard; open/close, predictive row, floating keyboard, multiline chat/contact/resolution fields, emoji and Vietnamese composition. Verify draft retention and focused-field visibility.
- **Accessibility text/display settings:** font scales 1 and 2 plus a 720 × 1280 native window are evidenced on API 36; at font scale 2 all five destinations were visible together. Repeat font 1.5, the device maximum, display zoom and vendor multi-window; labels must remain legible and every destination reachable.
- **Window/environment:** portrait, supported tablet/multi-window sizes, split-window resizing, cutouts and asymmetric side insets; native landscape only if explicitly enabled in product configuration.
- **Language/theme:** Vietnamese diacritics, long names and messages, RTL system setting with intended reading order, and system dark mode while the app intentionally uses its configured light appearance.
- **TalkBack and input:** meaningful labels, logical focus order, selected tabs/switch state, disabled/loading controls, announced errors, minimum touch targets and hardware/system Back. Confirm the file-picker cancel/return flow and permission denial without lost drafts.

The direct native screenshots, APK hash and observed runtime outcome are recorded above. Results from future physical/OEM checks must remain separately attributable; browser matrix results remain a distinct evidence category.
