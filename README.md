# 🚌 BusBnB

> Airbnb-style bus ticketing platform — book seats, pay via M-Pesa, get your ticket instantly.

[![CI](https://github.com/Webb2209/Busbnb/actions/workflows/ci.yml/badge.svg)](https://github.com/Webb2209/Busbnb/actions/workflows/ci.yml)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Next.js 16  │  │ Express API  │  │  PostgreSQL   │ │
│  │  (Port 3000) │→ │  (Port 4000) │→ │  (Port 5432)  │ │
│  │  Standalone  │  │  Node.js     │  │  Prisma ORM   │ │
│  └──────────────┘  └──────┬───────┘  └───────────────┘ │
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │    Redis 7   │                     │
│                    │ (BullMQ/RL)  │                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 (standalone) | React 19, TypeScript |
| Backend | Express 4 | Zod validation, Pino logging |
| ORM | Prisma 5 | PostgreSQL 15 |
| Cache / Queue | Redis 7 + BullMQ | Seat lock expiry, rate limiting |
| Payments | Safaricom Daraja M-Pesa | STK Push |
| Auth | JWT (15 min access + 7 day refresh) | HttpOnly cookies |
| CI | GitHub Actions | Lint, build, test, secret scan, audit |

---

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15
- Redis 7

### 1. Clone
```bash
git clone https://github.com/Webb2209/Busbnb.git
cd Busbnb
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # fill in your values
npm install
npx prisma migrate dev        # run migrations
npx prisma db seed            # optional seed data
npm run dev                   # starts on http://localhost:4000
```

### 3. Frontend
```bash
# from project root
npm install
npm run dev                   # starts on http://localhost:3000
```

---

## Docker Compose (recommended)

### 1. Set up environment
```bash
# Copy the template and fill in all values
cp .env.compose .env
nano .env   # or use your preferred editor
```

### 2. Start all services
```bash
docker compose up -d
```

Services:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Stop
```bash
docker compose down
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | 64-char hex secret (`openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | ✅ | 64-char hex secret (`openssl rand -hex 64`) |
| `MPESA_ENV` | ✅ | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | ✅ | From Safaricom Daraja portal |
| `MPESA_CONSUMER_SECRET` | ✅ | From Safaricom Daraja portal |
| `MPESA_SHORTCODE` | ✅ | Paybill / Till number |
| `MPESA_PASSKEY` | ✅ | From Daraja portal |
| `MPESA_CALLBACK_URL` | ✅ | Public HTTPS URL (use ngrok in dev) |
| `MPESA_CALLBACK_SECRET` | ✅ | 32-char hex secret (`openssl rand -hex 32`) |
| `FRONTEND_URL` | ✅ | CORS origin (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | 🔶 | [resend.com](https://resend.com) — for ticket emails |
| `PORT` | — | Defaults to `4000` |
| `NODE_ENV` | — | `development` / `production` / `test` |

### Frontend (root `.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default: `http://localhost:4000`) |

---

## Running Tests

```bash
cd backend
npm test              # run all tests with coverage
npm test -- --watch  # watch mode during development
```

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| GET | `/api/trips` | — | Search trips |
| GET | `/api/trips/:id` | — | Trip detail + seat map |
| POST | `/api/trips/:id/lock-seats` | — | Lock seats (returns JWT token) |
| DELETE | `/api/trips/:id/lock-seats` | — | Release seat locks early |
| POST | `/api/bookings` | — | Create booking + trigger STK Push |
| GET | `/api/bookings/:ref?email=` | — | Booking status / ticket |
| POST | `/api/mpesa/callback` | IP + secret | Safaricom webhook |
| POST | `/api/admin/auth/login` | — | Admin login |
| GET | `/api/admin/companies` | Admin JWT | List companies |
| POST | `/api/operators/login` | — | Operator login |
| GET | `/api/operators/routes` | Operator JWT | Operator's routes |

---

## Security Notes

- All secrets are stored in environment variables — never committed to git
- M-Pesa callbacks are protected by IP whitelist (Safaricom CIDRs) + shared secret
- Seat lock tokens are JWT-signed, IP-bound, and JTI-invalidated after single use
- Rate limiting on all public endpoints (booking, M-Pesa, seat lock, login)
- Admin endpoints require short-lived JWT (15 min) with refresh token rotation

---

## Deployment Checklist

- [ ] Rotate M-Pesa credentials (Safaricom Daraja portal)
- [ ] Generate new JWT secrets: `openssl rand -hex 64`
- [ ] Add all secrets to GitHub Actions → Settings → Secrets
- [ ] Configure `RESEND_API_KEY` for ticket emails
- [ ] Set `MPESA_ENV=production` and update callback URL
- [ ] Set up Nginx reverse proxy with TLS (Let's Encrypt)
- [ ] Point `MPESA_CALLBACK_URL` to your production domain
