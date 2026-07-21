# Wiklee — Appointment Scheduling Platform

A full-stack scheduling app where hosts create event types, set weekly availability, and share public booking pages. Similar to Calendly.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/calendly run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS 4, Wouter, TanStack React Query v5, Shadcn UI
- API: Express 5, Pino logging
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (`@clerk/express` + `@clerk/react`)
- Validation: Zod v4, drizzle-zod
- API codegen: Orval (from OpenAPI 3.1 spec)
- Build: esbuild (CJS bundle)

## Where things live

- OpenAPI spec (source of truth): `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/`
- Generated Zod schemas: `lib/api-zod/src/`
- Generated React Query hooks: `lib/api-client-react/src/`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/calendly/src/pages/`
- Frontend components: `artifacts/calendly/src/components/`

## Architecture decisions

- **Contract-first**: OpenAPI spec is the single source of truth. Codegen produces both backend Zod schemas and frontend React Query hooks. Never write API types by hand.
- **Zero-touch profile sync**: `ensureProfile()` in route handlers creates DB profiles for new Clerk users on first API call — no separate onboarding flow.
- **Slot computation is on-the-fly**: No pre-stored slots. Computed at request time from `availability_rules` minus `bookings` for the requested date window (UTC-based, `T00:00:00.000Z` day boundaries).
- **isPublic vs isActive**: `isActive=false` hides the event from guests entirely. `isPublic=false` keeps it bookable via direct link but removes it from the public profile listing.
- **Auth middleware**: `requireAuth` validates the Clerk JWT and attaches `req.userId`. All protected routes use this; public routes (`/public/*`) are unauthenticated.

## Product

- Hosts sign in via Clerk (social + email/password)
- Create event types with title, duration, color, public/secret toggle
- Set weekly availability rules (day + time windows)
- Dashboard with upcoming booking count and event type stats
- Visual monthly calendar with color-coded bookings and day side panel
- Public profile page at `/:username` — guests browse and book without an account
- Individual booking flow at `/:username/:slug` — date picker, slot picker, confirmation form

## User preferences

- App display name is "Wiklee" (package/artifact dirs stay as `calendly`)
- Spanish is fine for conversation; English for code and documentation
- Color palette for calendar chips: amber-500, zinc-600, slate-500, yellow-600, stone-500, neutral-600 (all white text)
- Today in calendar: amber/gold circle highlight (bg-amber-500)
- Demo events on empty state: "Quick Chat" (15min, #0ea5e9, public) + "VIP Strategy Session" (60min, #6366f1, secret)

## Gotchas

- Must run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change. This also runs `typecheck:libs` automatically.
- Must run `pnpm --filter @workspace/db run push` after any schema change in `lib/db/src/schema/`.
- Never run `pnpm dev` at workspace root — no root dev script by design.
- Verify artifacts with `pnpm --filter @workspace/<slug> run typecheck` (not `build` — build needs workflow-provided PORT/BASE_PATH).
- Query cache invalidation: always call `queryClient.invalidateQueries()` in mutation `onSuccess`. Missing this causes stale UI.
- Booking "no slots" root cause: user hasn't set availability in `/availability` yet. Slot computation returns empty array when no rules exist.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` at root for full portfolio-ready documentation
