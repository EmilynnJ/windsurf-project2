# ✨ SoulSeer

**A Community of Gifted Psychics**

SoulSeer is a premium platform connecting spiritual readers with clients seeking guidance. The app embodies a mystical yet professional atmosphere while providing robust functionality for seamless spiritual consultations.

## 🔮 Initial Launch Features

- **Pay-Per-Minute Readings** — Live chat, voice, and video sessions via Agora
- **Spiritual Community** — On-platform forum + Discord & Facebook community links
- **Prepay Balance System** — Clients add funds, billed per-minute during sessions
- **Reader Dashboard** — Earnings tracking, availability toggle, rate management
- **Admin Dashboard** — Full platform control, reader onboarding, financial oversight

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | Neon (PostgreSQL) + Drizzle ORM |
| Auth | Auth0 |
| Payments | Stripe + Stripe Connect |
| Real-Time | Agora (RTC + RTM) |
| Architecture | Monorepo (client / server / shared) |

## 📁 Project Structure

```
soulseer/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── app/         # App root & router
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   ├── styles/      # Global CSS
│   │   └── types/       # TypeScript types
│   └── index.html
├── server/          # Express API server
│   ├── src/
│   │   ├── db/          # Database connection & migrations
│   │   ├── middleware/   # Auth, rate limiting
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic
│   │   └── utils/       # Logger, helpers
│   └── drizzle.config.ts
├── shared/          # Shared types & schema
│   └── src/
│       ├── schema.ts    # Drizzle schema (source of truth)
│       └── index.ts     # Exports
├── .env.example     # Environment variable template
└── package.json     # Root monorepo config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Auth0 account
- Stripe account
- Agora account
- Neon database

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/EmilynnJ/soulseer.git
cd soulseer

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations
npm run db:migrate -w server

# 5. Start development servers
npm run dev
```

This starts both the client (port 3000) and server (port 5000) concurrently.

## 📝 API Routes

All routes prefixed with `/api`. Protected routes require Auth0 JWT in Authorization header.

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| POST | /api/auth/sync | Auth | Sync Auth0 user to DB |
| GET | /api/auth/me | Auth | Current user profile |
| GET | /api/readers | Public | All reader profiles |
| GET | /api/readers/online | Public | Online readers |
| POST | /api/readings/on-demand | Client | Create reading request |
| POST | /api/readings/:id/accept | Reader | Accept reading |
| POST | /api/readings/:id/start | Participant | Start session |
| POST | /api/readings/:id/end | Participant | End session |
| POST | /api/payments/create-intent | Auth | Top up balance |
| GET | /api/forum/posts | Public | Forum posts |
| POST | /api/admin/readers | Admin | Create reader |

See `docs/BUILD_GUIDE.md` for full API reference.

## 🎨 Design System

- **Aesthetic**: Celestial, mystical, ethereal
- **Mode**: Dark mode default
- **Colors**: Pink (#FF69B4), Gold (#D4AF37), Deep Black (#0A0A0F)
- **Fonts**: Alex Brush (headings), Playfair Display (body)

## 💰 Business Model

- Clients prepay by adding funds to their account balance
- Per-minute billing during reading sessions
- 70/30 revenue split: readers keep 70%, platform retains 30%
- Reader payouts via Stripe Connect

## 📋 License

Proprietary — All rights reserved © SoulSeer
