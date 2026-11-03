# FinMax

FinMax is a React, TypeScript, and Vite finance app with a Capacitor Android wrapper. The repository root is the canonical app used for the web deployment and Android releases.

## Development

```sh
npm ci
npm run dev
```

Check types and create the production web build:

```sh
npm run verify
```

## Release builds

The Android release build requires signing values in the ignored `android/key.properties` file. Create and protect an upload key before building store artifacts. See [Android store publishing](docs/deployment/ANDROID_STORES.md).

```sh
npm run android:aab          # signed AAB for Play and Amazon Console
npm run android:amazon-apk   # signed APK option for Amazon
npm run android:release      # build both formats
```

The development APK command is `npm run android:apk`; it creates a debug-signed APK and is not a store upload artifact.

## Deployment

- [Vercel setup](docs/deployment/VERCEL.md)
- [Android store publishing and release checklist](docs/deployment/ANDROID_STORES.md)
- [Documentation index](docs/README.md)

The separate `mobile/` directory is an Expo prototype. It is not the source used by the root Vite/Capacitor build or by the Vercel configuration.

## Configuration and security

Copy `.env.example` to `.env.local` for local overrides. Only public Supabase URL and publishable/anon keys belong in browser builds; never put a Supabase service-role key, signing key, or password in `VITE_*` variables. Local env files, build outputs, and signing files are ignored by Git.

Historical platform-export notes are preserved under `docs/archive/legacy-export/`; use the current deployment documents linked above.
