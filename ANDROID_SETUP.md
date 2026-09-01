# Android app setup — SMS Auto-Detect

Everything web/backend for SMS Auto-Detect Transactions is built, tested (`npm run test`), and
building clean (`npm run build`). This file covers the parts that can't be done or verified from
this session — no Android SDK, emulator, or physical device is available here. Everything below
is Phases E–H of the feature plan.

## What's already in the repo

- `capacitor.config.js` — points the native WebView at your **production URL**, read straight from
  `NEXT_PUBLIC_BASE_URL` in `.env` (same variable every other absolute-URL builder in this app
  already uses) — nothing to edit here, already resolves to `https://personalfin.site`. This has
  to be your real deployed domain, not `localhost`, since the app authenticates via cookies tied
  to that origin. If you ever change `NEXT_PUBLIC_BASE_URL`, just re-run `npx cap sync android` to
  pick it up.
- `android/` — a real Capacitor Android project (`npx cap add android` was run for you).
- `android/app/src/main/java/com/personalfin/app/sms/SmsReceiver.kt` — listens for incoming SMS.
- `android/app/src/main/java/com/personalfin/app/sms/SmsListenerPlugin.kt` — bridges detected SMS
  to the web app's JS, and exposes permission request/check + a battery-optimization settings
  shortcut.
- `lib/sms/nativeBridge.js` — the JS side: parses each SMS (`lib/sms/parseEngine.js`) and POSTs it
  to `/api/finance/pending_transactions`. Wired into `app/page.js` automatically once the
  "Pending" module is turned on in Settings.
- `features/settings/SettingsSmsAutoDetect.jsx` — where you'll request the SMS permission and open
  the battery-optimization screen once the app is installed.

**None of the Kotlin/Gradle code has been compiled or run.** Treat it as a first draft to build
and debug, not verified-working native code.

## What you need to do

### 1. Prerequisites
- Android Studio (includes the Android SDK) — https://developer.android.com/studio
- A way to test: an Android device with USB debugging enabled, or an emulator (Android 7.0/API 24+,
  matching `minSdkVersion` in `android/variables.gradle`)

### 2. Open and build in Android Studio
```
npx cap open android
```
This opens the `android/` project in Android Studio. Let Gradle sync (first sync will download the
Kotlin Gradle plugin and dependencies — needs internet). Then **Run** on a device/emulator.

If Gradle sync fails on the Kotlin plugin, double check `android/build.gradle` has the
`kotlin-gradle-plugin` classpath and `android/app/build.gradle` applies `kotlin-android` — both
were added for you, but version mismatches with your installed Android Studio's bundled Gradle
are the most likely first build error.

### 3. Verify the plain app first, before trusting SMS detection
Confirm the app launches and behaves like the normal web app (login, navigate around) *before*
testing SMS — this isolates "Capacitor wrapper is broken" from "SMS plugin is broken" if something
doesn't work.

### 4. Turn on SMS Auto-Detect
In the app: Settings → SMS auto-detect → tap **Enable** to grant the SMS permission (Android will
show its own permission dialog), then **Open settings** to exempt the app from battery
optimization (recommended, especially on Xiaomi/Oppo/Vivo devices — see the PRD's note on OEMs
aggressively killing background apps). Also turn on the "Pending" module under Settings → Modules
if you haven't already — that's the master switch.

### 5. Test with a real SMS
Have a bank or UPI app send you a real transaction SMS (or trigger a small real transaction).
Expect it to show up within a few seconds, pre-filled with amount/type/merchant — either as a
"Detected from SMS" banner right at the top of the **Transactions** tab (one-tap approve/reject
icons, no navigation needed), or under the **Pending** nav tab if you want to correct a field
before approving. If it doesn't show up:
- Confirm the SMS permission shows "Granted" in Settings → SMS auto-detect.
- Confirm the sender ID matches one of the patterns in `drizzle/0048_pending_transactions.sql`'s
  seed data (HDFCBK, ICICIB, SBI, AXISBK, GPAY, PHONEPE) — a different bank/format needs its own
  pattern row added to the `sms_parse_patterns` table (via Supabase's SQL editor; there's
  currently no in-app editor for these, by design — see the RLS in that migration).
- Check `adb logcat` filtered to your app's package (`com.personalfin.app`) for errors from
  `SmsReceiver`/`SmsListenerPlugin`.

### 6. Sign and distribute
This ships as a sideloaded APK, not the Play Store (Play policy restricts `READ_SMS`/`RECEIVE_SMS`
to apps whose core function is SMS handling). In Android Studio: **Build → Generate Signed Bundle
/ APK**, create/use a keystore, build a release APK, and share the `.apk` file directly (a link,
file transfer, or QR code to a hosted copy).

## Database migration

Already applied to the live database this session — `pending_transactions` and
`sms_parse_patterns` exist, RLS is on, and the starter patterns are seeded. Nothing to do here
unless you're setting this up against a different/fresh database, in which case run
`drizzle/0048_pending_transactions.sql` via Supabase's SQL editor.
