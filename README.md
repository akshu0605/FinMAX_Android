# FinMax

FinMax is a personal finance app for tracking income, expenses, budgets, and shared costs. The main app is a React and TypeScript web app, built with Vite and packaged for Android with Capacitor.

## Android download

Download the current debug build as a ZIP: [Finmax-AKJ.zip](./release/Finmax-AKJ.zip). The archive contains `Finmax-AKJ.apk`.

This APK is signed for development and local installation. It is not a Play Store release. Store builds require an upload key; see [Android release instructions](docs/deployment/ANDROID_STORES.md).

## What it includes

- Income, expense, savings, and budget tracking
- CSV backup and restore, plus CSV and text-based PDF bank statement import
- Expense categorization and duplicate detection during statement import
- Financial report export to PDF, with wrapped transaction names and Unicode support for Devanagari
- Bill reminders, spending summaries, and AI-assisted spending insights
- Split Kro group expense sharing and settlement tools
- Loan calculator and profile, appearance, and security settings
- Responsive layouts for desktop, tablet, and mobile

## Project layout

```text
src/
  app/
    components/        Screens and reusable interface components
    utils/             API, export, sync, and statement parsing
  ai-insights/         Spending insight calculations
  styles/              Global styles and design tokens
public/                 App icons, illustrations, and local fonts
android/                Capacitor Android project
scripts/                Release packaging helpers
mobile/                 Separate Expo prototype; not used by the Android build above
docs/
  deployment/           Web and Android release guides
  archive/              Historical project notes
```

The repository root is the source for the production web app and Capacitor Android app. The `mobile/` folder is a separate prototype.

## Local development

Requirements: Node.js 20 or newer and npm.

```sh
npm ci
npm run dev
```

Create a production web build and run the TypeScript check:

```sh
npm run verify
```

The web build is written to `dist/`.

## Android builds

Requirements: Android Studio or Android SDK command-line tools, and JDK 21. On Windows, Android Studio’s bundled JDK can be used by setting `JAVA_HOME` to its `jbr` folder.

Build a local debug APK:

```sh
npm run android:apk
```

The command also packages the debug build as `release/Finmax-AKJ.apk` and `release/Finmax-AKJ.zip` on Windows.

Store builds need the upload key settings described in [docs/deployment/ANDROID_STORES.md](docs/deployment/ANDROID_STORES.md). Release signing files belong in the ignored `android/key.properties` and must never be committed.

## Configuration and data

The app uses Supabase for authentication and account data. The public project URL and publishable key have development defaults in `src/app/utils/supabase.ts`. For a different environment, copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-publishable-key
```

Only public browser keys belong in `VITE_*` variables. Never put a Supabase service-role key, database password, or Android signing secret in the client app.

CSV import/export preserves UTF-8 text. PDF statement parsing and password-protected PDF decryption happen locally in the browser; imported transactions are saved to the user’s account after confirmation.

## Guides

- [Deployment documentation index](docs/README.md)
- [Vercel setup](docs/deployment/VERCEL.md)
- [Android store checklist](docs/deployment/ANDROID_STORES.md)
- [Attributions and bundled assets](ATTRIBUTIONS.md)
