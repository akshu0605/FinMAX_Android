# FinMax Android app

The Android app packages the existing React/Vite application with Capacitor. It uses the same Supabase project and the same pages and business logic as the web app; it does not create a second financial database.

## Build a debug APK on Windows

Requirements: Node.js 22 or newer, Android Studio 2025.2.1 or newer with Android SDK Platform 36, Build Tools 35.0.0 and 36.0.0, and JDK 21. Android 16 (API 36) is the current stable Capacitor target; the app also runs on newer Android releases. In Android Studio, open the `android` folder to inspect or run the app.

From the project folder:

```powershell
npm ci
npm run android:apk
```

The installable debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To refresh the Android project after web app changes, run `npm run android:sync`.

## Supabase and sign-in

The web client in `src/app/utils/supabase.ts` supplies the public Supabase URL and publishable/anon key used by the existing app. No service-role key is packaged. Email/password sign-in uses the existing Supabase Auth project.

Google sign-in opens the system browser and returns to `com.finmax.mobile://auth/callback`. The app handles both warm returns and cold starts, closes the browser tab as soon as Android hands the callback to FinMax, completes the Supabase code exchange, and opens the signed-in dashboard.

For the app return to work, open **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs** and add this exact allowed URL:

```text
com.finmax.mobile://auth/callback
```

Keep the existing Google provider enabled. In Google Cloud OAuth settings, the authorized redirect URI remains Supabase's callback URL (`https://ktkanoyjdczikahzivso.supabase.co/auth/v1/callback`); the app's custom URL belongs in Supabase's allowed redirect URLs. Without that dashboard allowlist, Supabase can send a successful sign-in to the website's Site URL instead of the app.

The launcher icon and `public/finmax-app-thumbnail.jpg` use the supplied FinMax image.

## Install on a phone

Copy `app-debug.apk` to the phone, open it, and approve Android's prompt to install an app from that source if shown. Launch **FinMax** and sign in with the existing account. Debug APKs are for personal testing; Play Store releases need a separately created release signing key.
