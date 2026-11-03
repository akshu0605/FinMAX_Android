# Android release and store publishing

## Current project setup

- Canonical Android project: `android/` (Capacitor)
- Application ID: `com.finmax.mobile` — keep this unchanged after the first store listing
- Target API: 36 (Android 16)
- Minimum API: 24
- Current version: `1.0.1` / version code `2`
- Play artifact: Android App Bundle (`.aab`)
- Amazon artifact: signed `.aab` or `.apk`; Amazon supports both in its Developer Console

Google Play requires new apps and updates to target API 36 or higher from August 31, 2026. Amazon accepts AABs in its console; APK is also supported. Fire OS devices have different API levels and compatibility, so review the devices Amazon reports as supported and test Google sign-in on a real Fire device before release.

## Create the upload key once

From the repository root, use Android Studio's bundled `keytool` or a JDK `keytool`:

```powershell
keytool -genkeypair -v -keystore android/finmax-upload-key.jks -alias finmax-upload -keyalg RSA -keysize 2048 -validity 10000
```

Back up `android/finmax-upload-key.jks` securely. Do not commit it or send it in chat. Create `android/key.properties` locally with:

```properties
storeFile=finmax-upload-key.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=finmax-upload
keyPassword=YOUR_KEY_PASSWORD
```

Both the keystore and `key.properties` are ignored by Git. Keep the upload key for future updates; Google Play App Signing uses it to authenticate your uploads and manages the distribution signing key. If choosing Amazon's signing option, follow the Developer Console's instructions and keep future releases consistent with that listing's signing choice.

## Build the store artifacts

Install the required Android SDK/build tools and JDK 21, create `android/key.properties`, then run:

```powershell
npm ci
npm run verify
npm run android:release
```

Outputs:

- Play/Amazon AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Amazon APK option: `android/app/build/outputs/apk/release/app-release.apk`

`npm run android:apk` is for local development only. It creates a debug-signed APK and must not be uploaded to either store. Release commands now stop with an error if the local upload key is missing, preventing accidental unsigned store artifacts.

For every update, increment `versionCode` and update `versionName` in `android/app/build.gradle` before making release artifacts. Keep the application ID fixed. Test the signed outputs on real supported devices before submission.

## Google Play Console

1. Create a Play Console developer account and create an app with the name, default language, app/game type, and free/paid choice.
2. Complete the store listing: description, app icon, feature graphic, phone screenshots, support contact, and privacy-policy URL.
3. Complete App content declarations, content rating, target audience, ads, Data safety, and app access instructions. Disclose Google sign-in, Supabase, and the app's financial data handling accurately.
4. Upload `app-release.aab` to an internal testing track first. Test installation, Google OAuth return into the app, file import, and account/data controls.
5. Complete any testing requirement shown for your developer account, then create a production release and submit it for review.

## Amazon Appstore

1. Register for the free Amazon Developer account and create the app listing. Use the same package ID `com.finmax.mobile`.
2. Upload the signed AAB or APK through the Developer Console. The Appstore's submission API does not accept AABs; use the Console for the first app submission.
3. Review device targeting and regions, add the store listing assets and content rating, and complete the privacy and account/data-deletion questionnaires.
4. Test the app and Google OAuth on actual target Fire tablets/TV devices. Fire OS does not include Google Play services, so validate that browser-based Google login and the custom callback work on the devices you select.
5. Submit the listing for Amazon review. Preserve the package ID, increase the version code on updates, and keep signing choices consistent.

## Release blockers to resolve before submission

- **Privacy policy:** A public draft is included at `public/privacy.html` and linked from the landing page. Review it against the production Supabase settings, actual retention and security practices, and any third-party SDK behavior before submitting. After Vercel deployment, use the exact `/privacy.html` URL in both store listings.
- **Account deletion:** Settings and `public/account-deletion.html` now provide an email request path, but deletion is not automated in the app. Before submission, confirm a real operational process that verifies the requester and removes the Supabase Auth account plus associated financial and group records. Test the whole process; keep the external request page available and use its deployed URL in the Play and Amazon forms.
- **Store assets and declarations:** Prepare the required screenshots, icon/graphics, support details, content rating, Data safety/privacy answers, and account access instructions. Answer using the app's real behavior, not assumptions.
- **Fire device sign-in:** Verify Google OAuth on the Fire OS versions/devices you plan to list. Keep unsupported devices out of the Amazon target list until tested.
