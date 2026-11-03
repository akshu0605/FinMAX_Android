# FinMax Backend — Setup & Deployment Guide

## Overview

| Layer | Technology |
|---|---|
| Functions Runtime | Netlify Functions (AWS Lambda, Node.js 20) |
| Database | MongoDB Atlas (free M0 tier works) |
| Auth | JWT (7-day tokens) |
| Password Hashing | bcryptjs (12 salt rounds) |

---

## Folder Structure

```
FinMax/
├── netlify/
│   └── functions/
│       ├── package.json          ← Functions-only deps (CJS)
│       ├── _utils/
│       │   ├── db.js             ← MongoDB connection + all models
│       │   ├── auth.js           ← JWT verifyToken helper
│       │   └── response.js       ← CORS + response helpers
│       │
│       ├── register.js           ← POST /api/register
│       ├── login.js              ← POST /api/login
│       ├── verify-token.js       ← GET  /api/verify-token
│       │
│       ├── add-income.js         ← POST /api/add-income
│       ├── get-income.js         ← GET  /api/get-income
│       │
│       ├── add-budget.js         ← POST   /api/add-budget
│       ├── get-budgets.js        ← GET    /api/get-budgets
│       ├── update-budget.js      ← PUT    /api/update-budget
│       ├── delete-budget.js      ← DELETE /api/delete-budget
│       │
│       ├── add-expense.js        ← POST   /api/add-expense
│       ├── get-expenses.js       ← GET    /api/get-expenses
│       ├── update-expense.js     ← PUT    /api/update-expense
│       ├── delete-expense.js     ← DELETE /api/delete-expense
│       │
│       ├── add-reminder.js       ← POST   /api/add-reminder
│       ├── get-reminders.js      ← GET    /api/get-reminders
│       ├── update-reminder.js    ← PUT    /api/update-reminder
│       ├── delete-reminder.js    ← DELETE /api/delete-reminder
│       │
│       ├── calculate-loan.js     ← POST /api/calculate-loan
│       ├── calculate-emi.js      ← POST /api/calculate-emi
│       └── calculate-sip.js      ← POST /api/calculate-sip
│
├── netlify.toml
└── .env.example
```

---

## Step 1 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → create free account
2. Create a **Free M0 cluster** (512 MB — enough for FinMax)
3. **Database Access** → Add user → username + password (save both)
4. **Network Access** → Add IP → Allow from anywhere: `0.0.0.0/0` *(required for Netlify serverless)*
5. **Connect** → Drivers → copy the connection string

Connection string format:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/finmax?retryWrites=true&w=majority
```

---

## Step 2 — Generate JWT Secret

Run in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output — that's your `JWT_SECRET`.

---

## Step 3 — Install Function Dependencies

```bash
cd netlify/functions
npm install
cd ../..
```

---

## Step 4 — Local Development

Install Netlify CLI (once):
```bash
npm install -g netlify-cli
```

Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
# edit .env and fill in real values
```

Start local dev server (runs both React + functions):
```bash
netlify dev
```

The dev server runs at `http://localhost:8888`
- Frontend: `http://localhost:8888`
- Functions: `http://localhost:8888/api/*`

---

## Step 5 — Netlify Deployment

### Option A — Netlify Dashboard
1. Push code to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git
3. Build settings auto-detected from `netlify.toml`
4. **Site settings** → **Environment variables** → Add:

```
MONGODB_URI   = mongodb+srv://...
JWT_SECRET    = your_hex_secret
```

5. **Deploy site** → done ✅

### Option B — Netlify CLI
```bash
netlify login
netlify link   # or: netlify init
netlify env:set MONGODB_URI "mongodb+srv://..."
netlify env:set JWT_SECRET  "your_hex_secret"
netlify deploy --prod
```

---

## API Reference

### Auth — No token required

| Method | URL | Body |
|--------|-----|------|
| POST | `/api/register` | `{ name, email, password }` |
| POST | `/api/login` | `{ email, password }` |
| GET  | `/api/verify-token` | Header: `Authorization: Bearer <token>` |

### Protected routes — All require `Authorization: Bearer <token>` header

| Method | URL | Query / Body |
|--------|-----|------|
| POST | `/api/add-income` | `{ amount, month, year, source? }` |
| GET  | `/api/get-income` | `?month=&year=` |
| POST | `/api/add-budget` | `{ category, allocatedAmount, month, year }` |
| GET  | `/api/get-budgets` | `?month=&year=` |
| PUT  | `/api/update-budget` | `{ id, ...fields }` |
| DELETE | `/api/delete-budget` | `?id=` |
| POST | `/api/add-expense` | `{ title, amount, category, date, note? }` |
| GET  | `/api/get-expenses` | `?category=&from=&to=` |
| PUT  | `/api/update-expense` | `{ id, ...fields }` |
| DELETE | `/api/delete-expense` | `?id=` |
| POST | `/api/add-reminder` | `{ title, dueDate, amount?, status? }` |
| GET  | `/api/get-reminders` | `?status=pending\|completed` |
| PUT  | `/api/update-reminder` | `{ id, ...fields }` |
| DELETE | `/api/delete-reminder` | `?id=` |

### Calculators — No auth required

| Method | URL | Body |
|--------|-----|------|
| POST | `/api/calculate-loan` | `{ principal, annualRate, months, type: 'simple'\|'compound' }` |
| POST | `/api/calculate-emi` | `{ principal, annualRate, tenureMonths }` |
| POST | `/api/calculate-sip` | `{ monthlyAmount, annualRate, years }` |

---

## Testing with curl

```bash
BASE=http://localhost:8888/api

# 1. Register
curl -s -X POST $BASE/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@finmax.com","password":"Pass@1234"}' | jq

# 2. Login — copy the token
TOKEN=$(curl -s -X POST $BASE/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@finmax.com","password":"Pass@1234"}' | jq -r '.data.token')

# 3. Add expense
curl -s -X POST $BASE/add-expense \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Groceries","amount":1200,"category":"Food","date":"2026-02-21"}' | jq

# 4. Get expenses
curl -s $BASE/get-expenses \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. SIP calculator (no auth)
curl -s -X POST $BASE/calculate-sip \
  -H "Content-Type: application/json" \
  -d '{"monthlyAmount":5000,"annualRate":12,"years":10}' | jq

# 6. Delete expense (replace EXPENSE_ID)
curl -s -X DELETE "$BASE/delete-expense?id=EXPENSE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Connecting the Frontend

In your React components, use the `/api/` prefix — Netlify's redirect handles the rest:

```js
// Example: login
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { data } = await res.json();
localStorage.setItem('finmax_token', data.token);

// Example: protected call
const token = localStorage.getItem('finmax_token');
const res = await fetch('/api/get-expenses?category=Food', {
  headers: { 'Authorization': `Bearer ${token}` },
});
```

---

## Security Notes

- Passwords hashed with **bcrypt (12 rounds)** — never stored in plain text
- JWT tokens expire in **7 days** — rotate secret to invalidate all sessions
- All delete/update endpoints use `{ _id, userId }` query — **IDOR prevented**
- Input lengths capped on all string fields — **overposting prevented**
- `JWT_SECRET` and `MONGODB_URI` live only in Netlify env vars — **never in code**
- CORS headers allow `*` — restrict to your Netlify domain in production if needed:
  ```
  Access-Control-Allow-Origin: https://your-site.netlify.app
  ```
