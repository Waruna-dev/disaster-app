# FloodGuard frontend: Jest test report

**Date:** 9 October 2026
**Scope:** all code in `disaster-app/frontend` (screens, components, hooks, contexts, services, utils, config, i18n)
**Result:** ✅ **556 / 556 tests passing** · 15 suites · 0 failures · ~20 s

Seventeen of those tests document **confirmed bugs**. Each one is written as `it.failing(...)`, so it passes *because* the bug is still there. When someone fixes the bug, that test turns red as a reminder to change it into a normal test. The bugs are listed under [Findings](#findings).

---

## How to run

```bash
cd disaster-app/frontend
npm test                 # run everything
npm run test:coverage    # + coverage (HTML at test-results/coverage/index.html)
npx tsc --noEmit -p tests   # type-check the tests
```

## Toolchain

| | Version |
|---|---|
| jest / jest-expo | 29.7.0 / 57.0.5 |
| @testing-library/react-native | 14.1.0 (async API: `await render`, `await fireEvent`) |
| react / react-native / expo | 19.2.3 / 0.86.3 / 57.0.25 |
| TypeScript | 6.0.3 |

## Results by suite

| Suite | What it covers | Tests |
|---|---|---:|
| `unit/utils/simpleUtils` | phone validation, report normalising, warning status, relative time, Cloudinary URLs | 39 |
| `unit/utils/geoAndClustering` | haversine, convex hull, report grouping (3 km), flood-incident clustering, 24 h rainfall | 62 |
| `unit/utils/mapHtml` | all 6 Leaflet map pages, **executed in a sandbox with a fake Leaflet** (taps, drags, messages back to RN) | 38 |
| `unit/services/firestoreServices` | warnings, incident reviews, approve/reject transactions, reports, users, auth | 34 |
| `unit/services/httpServices` | river-gauge API (ArcGIS), geocoding (Nominatim), Cloudinary upload | 29 |
| `unit/config/firebaseConfigAndI18n` | Firebase init, translation bundles, missing-key scan, constants | 16 |
| `unit/hooks/firestoreHooks` | live Firestore hooks, `AuthContext` | 22 |
| `unit/hooks/deviceAndHttpHooks` | emergency contacts, location, flood data polling, `FloodUpdatesContext`, `NearbyServicesContext` (Overpass) | 25 |
| `unit/routes/routeIntegrity` | every `router.push/replace` target resolves to a real screen | 4 |
| `components/basicComponents` | 25 presentational components, headers, charts | 39 |
| `components/interactiveComponents` | review dialogs, DMC nav, river panel, photo picker, map wrappers, emergency contacts | 44 |
| `screens/screenFlows` | splash routing, login, register, forgot password, create report, delete account, publish warning, DMC review | 47 |
| `screens/dmcFloodScreens` | DMC flood-warning (gauges, popups, station picker), group details (map, approve/reject all), flood-incident detail (approve/reject/publish) | 38 |
| `screens/dmcScreens` | DMC dashboard, pending reports, incident map, all reports, report groups, flood zones, create/edit warning, report detail | 37 |
| `screens/allScreensSmoke` | **every one of the 41 route files** mounts signed-out and signed-in and survives live data | 82 |
| **Total** | | **556** |

## Coverage

| Area | Files | Lines | Branches | Functions |
|---|---:|---:|---:|---:|
| utils | 16 | **100 %** | 94.3 % | 100 % |
| services | 9 | 98.0 % | 88.1 % | 100 % |
| hooks | 12 | 97.3 % | 87.8 % | 97.0 % |
| context / contexts | 3 | 96–99 % | 87–88 % | 85–94 % |
| components | 40 | 89.2 % | 83.3 % | 86.0 % |
| app/(auth) | 7 | 79.8 % | 73.0 % | 65.7 % |
| app/(DMC) | 15 | **93.5 %** | 91.4 % | 89.7 % |
| app/(user) | 17 | 46.5 % | 24.3 % | 33.9 % |
| **All files** | | **81.8 %** | **68.0 %** | **78.8 %** |

All business logic (utils, services, hooks) is at or near 100 %. Screens are lower because many of their branches only run on real-device interactions such as gestures, pull-to-refresh and image editing. The least-covered screens are `(user)/edit-profile`, `(user)/river-updates`, `(user)/select-home-location` and `(user)/emergency/nearby-services`, all in the 34–39 % range. Every DMC (officer) screen is now at 91–100 % line coverage, e.g. `flood-warning` 43 → 91 %, `group-details` 47 → 98 %, `flood-incident/[id]` 36 → 97 %, `map` 57 → 100 %, `incidents` 58 → 97 %, `reports` 68 → 100 %, `create-alert` 71 → 98 %, `dashboard` 70 → 100 %, `incident/[id]` 77 → 95 %.

---

## Findings

Severity is my judgement. **Confirmed** means a test reproduces the bug. **Static** means I found it by reading the code and the Firestore rules, but couldn't run it (see [Limitations](#limitations)).

### High

**1. "Delete account" always fails for regular users** *(static: code vs. Firestore rules)*
`deleteUserData` (`services/userService.ts:39-42`) does two things:
- It rewrites the user's reports to `userId: 'anonymous'`, but the rules forbid changing `userId` and only allow edits to *Pending* reports (`firestore.rules:97-102`).
- It deletes `users/{uid}`, but only admins may delete user docs (`firestore.rules:74`).

So for a non-admin both steps return permission-denied, and the user just sees "Failed to update profile." This needs a backend change: a Cloud Function, or rules that let users delete themselves.

**2. Report text is injected into the DMC map pages as raw HTML and script** *(confirmed, 2 tests)*
`buildReportsMapHtml` (`utils/reportMap.ts`) puts the resident-typed `affectedArea` into Leaflet popups without escaping. It also embeds the data as JSON inside a `<script>` tag, and JSON doesn't escape `</script>`. A report with the area `</script><script>…` therefore runs code inside the officer's WebView, and that WebView has a bridge that can post `viewDetails` / `editWarning` messages back to the app. This is live: `app/(DMC)/map.tsx:97`, `reports.tsx:41` and `group-details.tsx:76` all pass real reports. The same unescaped pattern exists in the other map builders, though their inputs are officer-entered.

### Medium

**3. Eight validation messages show raw translation keys** *(confirmed: 8 screen tests + 1 source scan)*
Calls like `t('register.passwordNoUpper') || "Password must…"` never reach the fallback text. When a key is missing, i18next returns the key string itself, which is truthy, so `||` never fires. The keys are missing from `en.json`, so users see text like **`register.passwordNoUpper`**. Affected: every registration validation error, the login invalid-email alert, and the edit-profile invalid-phone alert. Fix: add the keys to `en.json` (and si/ta), or use `t(key, 'default')`, which already works elsewhere in the app.

**4. Account deletion removes data before the auth account** *(confirmed)*
`edit-profile.tsx:374-376` deletes the Firestore data first and the auth account second. If Firebase answers `auth/requires-recent-login`, the profile is already gone but the account still exists. Deleting the auth account first, or re-authenticating up front, avoids this.

### Low

**5. Two fast `addContact` calls lose a contact** *(confirmed)*: `hooks/useEmergencyContacts.ts:50` builds the new list from a stale `contacts` value. Using `setContacts(prev => …)` fixes it.

**6. Duplicate check misses the same number in another format** *(confirmed)*: `0712345678` and `+94712345678` are both accepted (`components/emergency/AddEmergencyContactModal.tsx`). Normalise numbers before comparing.

**7. `PrimaryButton` stays tappable while `loading`** *(static)*: login and register pass only `loading`, so a double tap can send the request twice.

### Latent (not reachable today, but one change away)

**8.** `createReport` turns only `photoUrl` from `undefined` into `null`. Other optional fields stay `undefined`, which Firestore rejects (`services/reportService.ts:40-44`). The only caller today always sends coordinates. *(confirmed)*

**9.** `buildUserMapHtml` wraps warning JSON in a single-quoted JS string. An apostrophe in a warning title throws a syntax error, and a double quote drops every warning. `UserMapEngine` currently passes `[]` here. *(confirmed, 2 tests)*

### Observations (no test failure, worth knowing)

- **No client-side role check on `(DMC)` screens.** Any signed-in user who reaches a `/(DMC)/…` route sees officer screens. The Firestore rules do block their writes, so this is a UX issue, not a security hole. Also, `(user)/(tabs)/index.tsx:34` treats `occupation === 'admin'` as admin, but the rules only trust `role`, and users can edit their own `occupation`.
- **"Incidents" goes to two different places:** `/(DMC)/report-groups` from the tab bar, `/(DMC)/incidents` from the menu.
- **Screens nothing navigates to:** `(DMC)/users` and `(user)/alert/[id]`. Every other navigation target resolves.
- **Grouping radius:** comments in `utils/floodIncidents.ts` say 300 m, but `GROUPING_RADIUS_METERS` is **1000**.
- **Phone validation differs:** register accepts `712345678` (no leading 0) but the emergency-contact validator doesn't.
- `AlertCard` is static placeholder content (its "View details" does nothing). `TextAreaInput` without `maxLength` shows a dangling "0 / ".
- **Translations:** Sinhala and Tamil contain every English key. No empty strings. `{{placeholders}}` match.
- **No React warnings** (keys, act, invalid props) were logged by any screen during the smoke run.

---

## Test setup (what was added)

- `package.json`: dev deps `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest`; scripts `test`, `test:coverage`
- `jest.config.js`: `jest-expo` preset, tests under `tests/`, coverage of all source folders
- `tests/tsconfig.json`: Jest types for tests only. The root `tsconfig.json` now excludes `tests/`, because TypeScript 6 no longer loads `@types/*` automatically.
- `tests/mocks/`: in-memory Firestore (records queries and writes; tests push live snapshots), Firebase Auth, expo-router, WebView, SVG/maps/icons. No test touches the network or real Firebase.
- `tests/helpers/`: data factories, `renderWithAuth`, and the Leaflet sandbox that runs the generated map pages.
- `.gitignore`: coverage output.

## Limitations

- **Firestore rules weren't executed.** The rules emulator needs Java, which isn't installed, so finding 1 is from reading the code. To verify it, install Java and add `@firebase/rules-unit-testing`.
- **All native modules are mocked:** maps, camera, GPS, WebView rendering, SMS. These tests check app logic and UI wiring, not on-device behaviour. Real-device or E2E testing (e.g. Maestro/Detox) is still needed for gestures, the actual Leaflet rendering and the native permission dialogs.
- **Only the English UI** is asserted in screen tests. Sinhala and Tamil are checked at the bundle level.
