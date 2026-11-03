# 🚀 FinMax — AI-Powered Personal Finance & Budget Management Platform

FinMax is a state-of-the-art, high-performance financial management platform engineered with React, TypeScript, Tailwind CSS, and a client-side Statistical AI Insights Engine. It empowers users to take complete control of their financial life through real-time expense tracking, dynamic budgeting, group bill splitting (**Split Kro**), interactive financial tools, CSV data synchronisation, and AI-driven spending intelligence.

---

## 📋 Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Complete Technology Stack](#2-complete-technology-stack)
- [3. Complete Project Structure](#3-complete-project-structure)
- [4. Frontend Architecture](#4-frontend-architecture)
- [5. Complete Feature List](#5-complete-feature-list)
  - [Dashboard & Analytics](#dashboard--analytics)
  - [AI Insights (Spending Intelligence)](#ai-insights-spending-intelligence)
  - [Budgets Management](#budgets-management)
  - [Expenses Management](#expenses-management)
  - [Reminders & Bills](#reminders--bills)
  - [Split Kro (Group Expense Splitting)](#split-kro-group-expense-splitting)
  - [Financial Tools (Loan & EMI Calculator)](#financial-tools-loan--emi-calculator)
  - [CSV Data Sync & Export](#csv-data-sync--export)
  - [Settings & Preferences](#settings--preferences)
  - [Blockchain Integration](#blockchain-integration)
- [6. AI / ML System Architecture](#6-ai--ml-system-architecture)
- [7. ML Model Details](#7-ml-model-details)
- [8. Mobile Application (React Native / Expo)](#8-mobile-application-react-native--expo)
- [9. Setup & Local Development](#9-setup--local-development)
- [10. Deployment & Build Pipeline](#10-deployment--build-pipeline)

---

## 1. Project Overview

### Purpose
FinMax provides a unified, visual, and intelligent financial workspace. It solves the friction of traditional personal finance by offering zero-latency client-side interaction, liquid glassmorphism aesthetics, deterministic financial AI analysis, and multi-platform availability (Web & Android).

### Target Users
- **Individuals** seeking visual tracking of monthly incomes, spending habits, and savings rates.
- **Budgeters** aiming to set category limits and prevent overspending.
- **Roommates & Friends** needing to split shared trip, household, or dining expenses effortlessly (**Split Kro**).
- **Borrowers** evaluating loan options with real-time EMI interest calculations.

### Core Architecture
- **Web App**: Built as a Single Page Application (SPA) using React 18, Vite, and TypeScript.
- **Data Persistence**: Dual-mode architecture supporting client-side `localStorage` state management and optional Supabase backend tables (`incomes`, `expenses`, `budgets`, `reminders`, `groups`, `group_expenses`).
- **AI Intelligence**: Deterministic, explainable statistical inference pipeline in TypeScript (`src/ai-insights/`).

---

## 2. Complete Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Component UI structure and state management |
| **Build System** | Vite | `^6.3.5` | Next-generation frontend bundler & dev server |
| **Language** | TypeScript | `^5.6.3` | Type-safe development across web and AI engine |
| **Styling & Design System** | Tailwind CSS | `^4.1.12` | Utility-first CSS framework with custom liquid glass tokens |
| **Animations** | Motion (`motion/react`) | `^12.4.7` | Spring physics, micro-interactions, layout transitions |
| **Charts & Visuals** | Recharts | `^2.15.1` | Animated donut pie charts, area graphs, and legends |
| **Iconography** | Lucide React / MUI Icons | `^0.475.0` | Modern SVG icons for navigation and indicators |
| **UI Components** | Radix UI / MUI Material | `^1.2.3` | Accessible dialogs, popovers, sliders, accordions |
| **Backend & Auth** | Supabase JS / Auth | `^2.98.0` | Cloud database, PostgreSQL, Email & Google OAuth |
| **State Persistence** | Web Storage API | Native | Offline-first `localStorage` fallback layer |
| **Notifications** | Sonner | `^2.0.1` | Toast notifications for user actions |
| **Mobile Framework** | React Native / Expo | `~52.0.0` | Cross-platform iOS/Android mobile app (`mobile/`) |
| **Mobile Navigation** | React Navigation | `^7.0.0` | Native stack navigation and bottom tab bar |
| **Deployment** | Vercel | `2.0` API | Static SPA deployment with edge rewrites |

---

## 3. Complete Project Structure

```text
FinMax/
├── .env                                  # Local environment variables
├── .gitignore                            # Git exclusion rules
├── index.html                            # HTML5 entry point with Google Fonts
├── package.json                          # Web dependencies and build scripts
├── tsconfig.json                         # TypeScript configuration
├── vercel.json                           # Vercel deployment & rewrite rules
├── vite.config.ts                        # Vite bundler configuration
│
├── src/                                  # Web Application Source
│   ├── main.tsx                          # React DOM mounting entry point
│   ├── vite-env.d.ts                     # Vite environment type declarations
│   │
│   ├── ai-insights/                      # 🧠 AI Insights Model Engine
│   │   ├── aiInsightsModel.ts            # Primary entry point & methodology docs
│   │   ├── anomalyDetection.ts           # IQR (Tukey's fence) & Z-score detection
│   │   ├── featureEngineering.ts         # Feature extraction & matrix computation
│   │   ├── insightEngine.ts              # 6 generators, weighted scoring & ranking
│   │   └── types.ts                      # AI Engine data contracts & interfaces
│   │
│   ├── app/                              # Application Core
│   │   ├── App.tsx                       # Top-level view router & state holder
│   │   │
│   │   ├── components/                   # UI View Components
│   │   │   ├── Dashboard.tsx             # Main dashboard layout & sidebar nav
│   │   │   ├── LandingPage.tsx           # Public marketing landing page
│   │   │   ├── AuthModal.tsx             # Login / Sign up modal interface
│   │   │   ├── LoanCalculator.tsx        # Financial Loan & EMI calculator
│   │   │   ├── Settings.tsx              # Profile, currency & data management
│   │   │   ├── ContactDeveloper.tsx      # Support & developer contact view
│   │   │   ├── Logo.tsx                  # Brand SVG logo component
│   │   │   ├── StarField.tsx             # Interactive canvas background
│   │   │   ├── CyberBackground.tsx       # Glowing grid visual overlay
│   │   │   │
│   │   │   ├── AIInsights/               # 📊 AI Insights UI Module
│   │   │   │   ├── AIInsights.tsx        # Main AI Insights page container
│   │   │   │   ├── InsightCard.tsx       # Severity card with explainable panel
│   │   │   │   └── InsightSummary.tsx    # Spending overview banner
│   │   │   │
│   │   │   ├── SplitKro/                 # 💸 Split Kro Group Expense Module
│   │   │   │   ├── index.tsx             # Groups list & balances overview
│   │   │   │   └── GroupDetail.tsx       # Expense logging & debt simplification
│   │   │   │
│   │   │   └── ui/                       # Design System Components
│   │   │       ├── GlassCard.tsx         # Liquid glassmorphism container
│   │   │       └── NeonButton.tsx        # Glowing interactive button
│   │   │
│   │   └── utils/                        # Application Utilities
│   │       ├── api.ts                    # Supabase database wrapper
│   │       ├── csvDataSync.ts            # CSV import/export engine
│   │       ├── debtSimplifier.ts         # Greedy debt minimization algorithm
│   │       ├── localStorage-auth.ts      # LocalStorage auth provider
│   │       ├── splitkro-api.ts           # Split Kro database operations
│   │       └── supabase.ts               # Supabase JS client initializer
│   │
│   ├── context/                          # React Context Providers
│   ├── hooks/                            # Custom React Hooks
│   ├── layouts/                          # Page Layout Containers
│   └── styles/                           # Global CSS & Tailwind Tokens
│
└── mobile/                               # 📱 React Native Mobile Application
    ├── App.tsx                           # Mobile root component
    ├── app.json                          # Expo configuration manifest
    ├── package.json                      # Mobile npm dependencies
    ├── eas.json                          # Expo Application Services build config
    ├── android/                          # Native Android Gradle project files
    └── src/
        ├── api/                          # Mobile REST / Supabase API client
        ├── context/                      # AuthContext & DataContext providers
        ├── screens/                      # Mobile Screen Views
        │   ├── Auth/                     # LoginScreen & SignupScreen
        │   ├── DashboardScreen.tsx       # Mobile dashboard & stat summary
        │   ├── ExpensesScreen.tsx        # Mobile expense listing & add modal
        │   ├── BudgetsScreen.tsx         # Mobile budget progress meters
        │   ├── RemindersScreen.tsx       # Mobile bill reminders
        │   ├── SplitKroScreen.tsx        # Mobile bill splitter screen
        │   └── SettingsScreen.tsx        # Mobile user options & logout
        └── types/                        # Mobile TypeScript type definitions
```

---

## 4. Frontend Architecture

### Component Hierarchy & Data Flow

```text
               ┌──────────────────────────┐
               │        main.tsx          │
               └────────────┬─────────────┘
                            │
               ┌────────────▼─────────────┐
               │         App.tsx          │
               └──────┬────────────┬──────┘
                      │            │
         Unauthenticated           Authenticated
              │                            │
      ┌───────▼────────┐          ┌────────▼────────┐
      │  LandingPage   │          │    Dashboard    │
      └───────┬────────┘          └────────┬────────┘
              │                            │
      ┌───────▼────────┐    ┌──────────────┼──────────────┬──────────────┐
      │   AuthModal    │    │              │              │              │
      └────────────────┘ ┌──▼──┐      ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
                         │Stats│      │Expenses │    │ Budgets │    │Reminders│
                         └──┬──┘      └────┬────┘    └────┬────┘    └────┬────┘
                            │              │              │              │
                            └──────────────┼──────────────┴──────────────┘
                                           │
                                ┌──────────▼──────────┐
                                │   AI Insights UI    │
                                └──────────┬──────────┘
                                           │
                                ┌──────────▼──────────┐
                                │ AI Model Inference  │
                                └─────────────────────┘
```

### Key Architectural Concepts
1. **Liquid Glass Design System**: Custom blur, saturation, and border opacity tokens (`glass()` helper in `Dashboard.tsx`) with dark mode `#000000` aesthetic and teal accents (`#00F2EA`).
2. **Offline-First Resilience**: Data is persisted immediately to `localStorage` and synchronized with Supabase tables asynchronously when connected.
3. **Memoized AI Execution**: The AI Engine evaluates expense arrays inside `useMemo` hooks to prevent unnecessary re-computations during unrelated UI state transitions.

---

## 5. Complete Feature List

### Dashboard & Analytics
- **Income Setup**: Onboarding overlay forcing initial monthly income entry for savings calculations.
- **Financial Stat Cards**: Live calculations for Monthly Income, Total Expenses, Total Savings, and Savings Rate percentage.
- **Category Donut Chart**: Recharts animated distribution of expenses across categories (`Food & Dining`, `Transportation`, `Entertainment`, `Shopping`, `Bills`, `Healthcare`, `Other`).
- **Interactive Starfield**: HTML5 Canvas particle background (`StarField.tsx`) with dynamic movement.

### AI Insights (Spending Intelligence)
- **Data Sufficiency Gating**: Categorizes data state into `no_data`, `insufficient` (< 5 transactions), `limited` (5–9 transactions), or `sufficient` (10+ transactions).
- **6 Insight Generators**:
  1. *Category Overspending*: Detects spend exceeding historical average by ≥ 30%.
  2. *Unusual Transactions*: Flags single outlier transactions via IQR or Z-score.
  3. *Month-over-Month Trends*: Computes directional spending velocity across 30-day windows.
  4. *Savings Opportunities*: Highlights non-essential category spends for potential reduction.
  5. *Category Concentration Risk*: Warns when a single category absorbs > 40% of total spend.
  6. *Positive Financial Behaviour*: Praises spending decreases or healthy savings.
- **Explainable Analysis**: Each insight displays current vs. baseline metrics, confidence bar, and human-readable reasoning.

### Budgets Management
- **Category Budgets**: Allocate monthly limits per expense category.
- **Visual Progress Bar**: Real-time progress bar changing color from Teal (< 80%) to Yellow (80–90%) to Red (> 100% over-budget).
- **Budget Deletion & Creation**: Instant update to budget limits and utilization calculations.

### Expenses Management
- **Expense Logging**: Add title, amount, category, date, and optional notes.
- **Transaction History**: Chronological view with category icons and formatted amounts.
- **Expense Deletion**: Deletes transaction records and updates dashboard totals instantly.

### Reminders & Bills
- **Bill Tracking**: Log recurring bills, EMIs, or subscriptions with due dates.
- **Completion Toggle**: Check off completed reminders with strikethrough state.
- **Due Date Indicators**: Displays exact remaining days/date formatted string.

### Split Kro (Group Expense Splitting)
- **Group Creation**: Create expense-sharing groups (e.g. Trips, Apartment, Dinner).
- **Member Management**: Add multiple group participants.
- **Flexible Expense Splitting**:
  - *Equal*: Splits expense evenly among members.
  - *Exact*: Specify exact individual amounts.
  - *Percentage*: Split by custom percentages summing to 100%.
- **Greedy Debt Simplification**: Algorithm (`debtSimplifier.ts`) minimizes total bank transfers required between members:
  ```text
  Net Balances -> Positive Creditors & Negative Debtors -> Match Max Creditor with Max Debtor
  ```

### Financial Tools (Loan & EMI Calculator)
- **Loan Parameters**: Principal loan amount, annual interest rate (%), and loan tenure (years/months).
- **Live Output**: Monthly EMI payment, total interest payable, and overall total payment amount.

### CSV Data Sync & Export
- **CSV Export**: Exports expense and budget records into formatted `.csv` files.
- **CSV Import**: Parses imported `.csv` files (`csvDataSync.ts`), validates headers, coerces data types, and imports records into the active state.

### Settings & Preferences
- **Currency Switcher**: Real-time currency switching between INR (`₹`), USD (`$`), EUR (`€`), GBP (`£`), JPY (`¥`), CAD (`C$`), AUD (`A$`).
- **Profile Summary**: Displays active user profile, email, and authentication provider.
- **Contact Developer**: Dedicated developer contact screen (`ContactDeveloper.tsx`).

### Blockchain Integration


---

## 6. AI / ML System Architecture

The AI Insights engine inside `src/ai-insights/` is a client-side statistical financial intelligence pipeline. It operates deterministically on raw transaction data.

```text
       Raw Expense Records (from Dashboard state)
                           │
                           ▼
          ┌──────────────────────────────────┐
          │      Feature Engineering         │  featureEngineering.ts
          │  • Category statistics           │
          │  • 30-day temporal windows       │
          │  • Concentration & volatility    │
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │      Anomaly Detection           │  anomalyDetection.ts
          │  • IQR Tukey Fence (n >= 4)      │  Q3 + 1.5 * IQR
          │  • Z-score fallback (3 <= n < 4) │  |z| > 2.0
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │      Insight Generation          │  insightEngine.ts
          │  • 6 Domain Generators           │
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │     Scoring & Prioritization     │  insightEngine.ts
          │  Priority = Magnitude x Severity │
          │             x Confidence x 100   │
          └────────────────┬─────────────────┘
                           │
                           ▼
          ┌──────────────────────────────────┐
          │            UI Output             │  AIInsights.tsx & InsightCard.tsx
          └──────────────────────────────────┘
```

---

## 7. ML Model Details

| Attribute | Technical Specification |
| :--- | :--- |
| **Model Type** | Multi-Factor Statistical Inference & Anomaly Detection Pipeline |
| **Model File** | [src/ai-insights/aiInsightsModel.ts](file:///A:/Web%20Application/FinMax/src/ai-insights/aiInsightsModel.ts) |
| **Primary Method** | Interquartile Range (IQR) Tukey's Fence: $\text{Upper Fence} = Q_3 + 1.5 \times \text{IQR}$ |
| **Fallback Method** | Sample Z-score: $z = \frac{x - \mu}{\sigma}$ (Flagged if $\|z\| > 2.0$) |
| **Input Features** | Category totals, mean amount, median amount, standard deviation, 30-day window spend, prior 30-day window spend, concentration ratio, coefficient of variation |
| **Output** | Ranked array of `Insight` objects with `type`, `severity`, `title`, `description`, `confidence`, and `explanation` |
| **Scoring Formula** | $\text{Priority} = \text{Magnitude Score} \times \text{Severity Weight} \times \text{Confidence} \times 100$ |
| **Data Requirements** | Requires $\ge 5$ transactions for pattern analysis, $\ge 10$ for full confidence scoring |

---

## 8. Mobile Application (React Native / Expo)

FinMax includes a complete mobile application codebase inside the `mobile/` directory.

- **Tech Stack**: React Native, Expo SDK 52, React Navigation 7, TypeScript.
- **Screens**:
  - `LoginScreen.tsx` & `SignupScreen.tsx`: Mobile authentication views.
  - `DashboardScreen.tsx`: Mobile dashboard overview and key metrics.
  - `ExpensesScreen.tsx`: Mobile expense listing and modal entry.
  - `BudgetsScreen.tsx`: Category budget progress meters.
  - `RemindersScreen.tsx`: Mobile bill reminder checklist.
  - `SplitKroScreen.tsx`: Group creation, bill splitting, and debt summaries.
  - `SettingsScreen.tsx`: Mobile app options and session sign-out.
- **Android APK Build**: Contains pre-configured native Android Gradle project in `mobile/android/` for local standalone APK builds.

---

## 9. Setup & Local Development

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/akshu0605/FinMax.git

# Navigate to project directory
cd FinMax

# Install web dependencies
npm install
```

### Running Web Application

```bash
# Start Vite development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Building for Production

```bash
# Compile TypeScript and generate production assets
npm run build

# Preview production build locally
npm run preview
```

---

## 10. Deployment & Build Pipeline

FinMax is configured for automated static deployment via Vercel or any static web host.

- **Vercel Configuration**: [vercel.json](file:///A:/Web%20Application/FinMax/vercel.json)
  - **Framework**: `vite`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **SPA Rewrites**: Redirects `/(.*)` to `/index.html`
- **Output Bundle**: Compiled HTML, CSS, and JS static assets in `dist/`.
