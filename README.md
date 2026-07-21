# Wiklee — Appointment Scheduling Platform

> A full-stack, production-grade scheduling app built with React 19, Express 5, PostgreSQL, and TypeScript — end-to-end type safe from database to UI.

Wiklee lets hosts create shareable booking pages, configure weekly availability, and manage appointments — similar to Calendly. Guests visit a public profile page, pick a time slot, and book in seconds. No account required for guests.

---

## Live Demo

Deploy your own instance in one click or run locally following the instructions below.

---

## Features

**For hosts (authenticated)**
- Create multiple **event types** — set duration, description, color, and custom slug
- Toggle events as **public** (listed on your profile) or **secret** (accessible only via direct link, ideal for VIP clients)
- Configure **weekly availability** — set which days and hours you're open per day of the week
- **Dashboard** with a quick summary of upcoming bookings, total event types, and profile stats
- **Bookings management** — view all upcoming and past appointments, cancel with one click
- **Visual calendar** — monthly grid (Apple Calendar style) with color-coded event chips, today highlighted, and a daily bookings side panel
- **Copy booking link** for any event type directly from the dashboard

**For guests (no account needed)**
- Browse a host's public booking page at `/:username`
- Pick an event type, select a day with available slots, choose a time, and confirm
- Booking confirmation with all details

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS 4 |
| **Routing** | Wouter |
| **Server state** | TanStack React Query v5 |
| **UI components** | Shadcn UI (Radix UI primitives) |
| **Backend** | Node.js 24, Express 5 |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | Clerk (managed auth — social + email/password) |
| **Validation** | Zod v4 + drizzle-zod |
| **API contract** | OpenAPI 3.1 → Orval codegen |
| **Logging** | Pino (structured JSON) |
| **Monorepo** | pnpm workspaces |

---

## Architecture

### Contract-First API Design

The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the **single source of truth** for the entire API surface. A single codegen command (`pnpm --filter @workspace/api-spec run codegen`) produces:

- **`lib/api-zod`** — Zod validation schemas used by the Express backend to validate request and response bodies
- **`lib/api-client-react`** — Type-safe TanStack React Query hooks used by the frontend

This means the API contract is always in sync between client and server — no hand-written types, no drift.

```
openapi.yaml  →  orval codegen  →  Zod schemas (backend validation)
                              └→  React Query hooks (frontend data fetching)
```

### Monorepo Structure

```
wiklee/
├── artifacts/
│   ├── api-server/          # Express 5 API — routes, middleware, auth
│   └── calendly/            # React 19 frontend — host dashboard + public booking
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval config (codegen source of truth)
│   ├── api-zod/             # Generated Zod schemas (backend validation)
│   ├── api-client-react/    # Generated React Query hooks (frontend data fetching)
│   └── db/                  # Drizzle ORM schema, migrations, DB connection
├── pnpm-workspace.yaml
└── tsconfig.json
```

### Database Schema (Drizzle ORM + PostgreSQL)

```
profiles
  id (text, PK — Clerk user ID)   username (unique)   name   timezone   createdAt

event_types
  id (serial, PK)   userId → profiles   title   slug (unique per user)
  description   durationMinutes   color   isActive   isPublic   createdAt

availability_rules
  id (serial, PK)   userId → profiles   dayOfWeek (0–6)   startTime (HH:mm)   endTime (HH:mm)

bookings
  id (serial, PK)   eventTypeId → event_types   hostUserId → profiles
  inviteeName   inviteeEmail   inviteeTimezone   notes
  startTime   endTime   status (confirmed | cancelled)
```

### Slot Computation

Available time slots are calculated on-the-fly at booking time:

1. Fetch the host's `availability_rules` for the requested day of week
2. Fetch all existing `bookings` for that day
3. Walk the availability window in `durationMinutes` increments
4. Subtract any overlapping confirmed bookings
5. Filter out slots in the past (UTC-based)

No pre-generated slots stored — always computed from source of truth.

### Zero-Touch Profile Sync

When an authenticated user hits any protected endpoint for the first time, the `ensureProfile` middleware automatically creates their database profile from the Clerk JWT — no separate onboarding step required.

---

## API Reference

All endpoints are prefixed with `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/healthz` | — | Health check |
| `GET` | `/me` | ✓ | Fetch/sync current user profile |
| `PATCH` | `/me` | ✓ | Update profile (username, name, timezone) |
| `GET` | `/event-types` | ✓ | List all event types for the current host |
| `POST` | `/event-types` | ✓ | Create a new event type |
| `GET` | `/event-types/:id` | ✓ | Get a single event type |
| `PATCH` | `/event-types/:id` | ✓ | Update an event type |
| `DELETE` | `/event-types/:id` | ✓ | Delete an event type |
| `GET` | `/availability` | ✓ | Get weekly availability rules |
| `PUT` | `/availability` | ✓ | Replace all availability rules (bulk) |
| `GET` | `/bookings` | ✓ | List bookings (upcoming + past) |
| `POST` | `/bookings/:id/cancel` | ✓ | Cancel a booking |
| `GET` | `/dashboard/summary` | ✓ | Stats: upcoming count, event type count, etc. |
| `GET` | `/public/users/:username` | — | Public profile + listed event types |
| `GET` | `/public/users/:username/event-types/:slug` | — | Single event type details |
| `GET` | `/public/slots` | — | Available time slots for a given date range |
| `POST` | `/public/users/:username/event-types/:slug/book` | — | Create a booking (guest) |

---

## Frontend Pages

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/dashboard` | Host overview with key metrics |
| `/event-types` | Create, edit, and manage event types |
| `/availability` | Configure weekly availability schedule |
| `/bookings` | View and manage all bookings |
| `/calendar` | Monthly calendar view of scheduled bookings |
| `/settings` | Profile settings (username, name, timezone) |
| `/:username` | Public booking page — guest picks an event type |
| `/:username/:slug` | Guest booking flow — date, time, and form |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/wiklee
SESSION_SECRET=your_session_secret
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Run the API server (port 5000)
pnpm --filter @workspace/api-server run dev

# Run the frontend (separate terminal)
pnpm --filter @workspace/calendly run dev
```

### Regenerate API code after spec changes

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates both the Zod schemas and React Query hooks from the OpenAPI spec.

### Typecheck everything

```bash
pnpm run typecheck
```

---

## Project Highlights for Reviewers

- **End-to-end type safety** — from PostgreSQL schema → Drizzle types → Zod validation → OpenAPI spec → generated React Query hooks → React components. No `any`, no runtime surprises.
- **Contract-first development** — the API spec drives both sides of the stack. Adding a new field means editing one YAML file and running one command.
- **Real slot computation** — availability calculation handles day-of-week rules, existing bookings, past-time filtering, and duration chunking entirely server-side.
- **Composable auth** — Clerk handles identity; the backend uses a thin `requireAuth` middleware that validates the JWT and attaches `req.userId` to every protected route.
- **Scalable monorepo** — pnpm workspaces with TypeScript project references; shared libraries are composite packages with declaration emit; leaf apps use `--noEmit` checks to avoid type portability issues.
- **Production-ready logging** — Pino structured JSON logging with `req.log` in route handlers; no `console.log` in server code.

---

## License

MIT
