# Android app setup (interim Capacitor wrapper)

`android/` is a Capacitor project that loads the live site (personalfin.site) in a WebView. It is
an interim build: it will be replaced by a real native app before the production Play Store
release, because Play rejects apps that are only a website in a frame. Until then it is useful
for starting the Play closed test (12 testers, 14 days) under the final package name
`com.personalfin.app` — later builds of the native app are uploaded as updates to the same app.

SMS auto-detect has been removed: the app no longer requests `READ_SMS`/`RECEIVE_SMS`, so no
SMS permissions declaration is needed on Play.

## What's in the repo

- `capacitor.config.js` — points the WebView at `NEXT_PUBLIC_BASE_URL` (with `www.` added, see the
  comment there). Re-run `npx cap sync android` after changing it.
- `android/app/src/main/java/com/personalfin/app/push/PushMessagingService.kt` — Firebase push
  notifications with the full-colour logo.
- `lib/auth/nativeGoogleAuth.js` + the `login-callback` intent-filter in `AndroidManifest.xml` —
  native Google sign-in through a Chrome Custom Tab (Google sign-in doesn't work inside a WebView).
- Backups are off (`allowBackup="false"` plus `res/xml/data_extraction_rules.xml`), so finance
  data and session cookies never land in device or cloud backups.

**None of the Kotlin/Gradle code has been compiled or run from this repo's tooling.** Build and
test it in Android Studio.

## Steps

### 1. Prerequisites
- Android Studio (includes the Android SDK) — https://developer.android.com/studio
- An Android device with USB debugging, or an emulator (Android 7.0 / API 24+). The project targets
  API 36, which Play requires for new apps.

### 2. Set up native Google sign-in (dashboard config, not code)
Reuse the same Google Cloud OAuth client already behind `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env`
— no need to create a new one. Three things, all outside this repo:
1. **Google Cloud Console → Credentials → that OAuth client → Client secret** — Google Identity
   Services (the web flow) only ever used the Client ID, never the secret, so it was never stored
   anywhere in this repo. Grab/generate it here.
2. **Google Cloud Console → that same OAuth client → Authorized redirect URIs** — add your
   Supabase project's own callback: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (GIS uses "Authorized JavaScript origins" instead, so this redirect URI almost certainly isn't
   there yet even though the client itself already exists).
3. **Supabase Dashboard**:
   - **Authentication → Providers → Google** — enable it, paste in the existing Client ID +
     the secret from step 1.
   - **Authentication → URL Configuration → Redirect URLs** — add
     `com.personalfin.app://login-callback` (must match `REDIRECT_URL` in
     `lib/auth/nativeGoogleAuth.js` and the intent-filter in `AndroidManifest.xml` exactly).

Skip this and native Google sign-in will fail with a Supabase/Google error as soon as you tap the
button — email/password sign-in is unaffected either way.

### 3. Open and build in Android Studio
```
npx cap open android
```
This opens the `android/` project in Android Studio. Let Gradle sync (first sync will download the
Kotlin Gradle plugin and dependencies — needs internet). Then **Run** on a device/emulator.

If Gradle sync fails on the Kotlin plugin, double check `android/build.gradle` has the
`kotlin-gradle-plugin` classpath and `android/app/build.gradle` applies `kotlin-android` — both
were added for you, but version mismatches with your installed Android Studio's bundled Gradle
are the most likely first build error.

### 4. Build for Play
In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Use Play
App Signing and keep the upload keystore somewhere safe — every future build, including the native
app, must be signed with the same upload key. Bump `versionCode` in `android/app/build.gradle`
for every upload.
