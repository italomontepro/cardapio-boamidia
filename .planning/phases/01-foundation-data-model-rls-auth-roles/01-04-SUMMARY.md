---
phase: 01-foundation-data-model-rls-auth-roles
plan: 04
subsystem: auth
tags: [supabase-ssr, middleware, seed, auth, multi-tenant]

# Dependency graph
requires:
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: "Drizzle schema for restaurants, units, categories, products, product_availability, admin_users (plan 01-02)"
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: "RLS policies and helper functions (plan 01-03)"
provides:
  - "@supabase/ssr server/browser client factories (src/lib/supabase/{server,client}.ts)"
  - "Session-refresh middleware (updateSession) with /admin and /painel route protection"
  - "Seed script creating 1 super_admin + 2 restaurant_admins across 2 restaurants (D-04)"
affects: [01-05-login-pages]

# Tech tracking
tech-stack:
  added: [ws, "@types/ws"]
  patterns:
    - "@supabase/ssr createServerClient with await cookies() for Server Components/Actions (setAll wrapped in try/catch)"
    - "Root middleware.ts delegates to updateSession(); matcher excludes _next/static, _next/image, favicon.ico, common image extensions"
    - "Seed/standalone scripts load dotenv first, then dynamically import db/supabase-js modules to avoid ESM import-hoisting reading process.env before dotenv populates it"

key-files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/middleware.ts
    - middleware.ts
    - scripts/seed.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Added ws + @types/ws as dev dependencies: Node 20 lacks native WebSocket support required by supabase-js's realtime client constructor, needed for scripts/seed.ts to instantiate the Admin API client"
  - "scripts/seed.ts uses dynamic imports after dotenv config() to avoid ESM import hoisting causing src/db/index.ts to read process.env before .env is loaded"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 13min
completed: 2026-06-15
---

# Phase 1 Plan 4: Supabase SSR Clients, Middleware & Seed Script Summary

**@supabase/ssr server/browser client factories, session-refresh middleware protecting /admin and /painel, and a seed script provisioning 1 super_admin + 2 restaurant_admins across 2 restaurants**

## Performance

- **Duration:** 13 min
- **Started:** 2026-06-15T20:59:00Z
- **Completed:** 2026-06-15T21:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Implemented `src/lib/supabase/server.ts` (async `createClient()` using `createServerClient` + `await cookies()`, `setAll` wrapped in try/catch for Server Component context)
- Implemented `src/lib/supabase/client.ts` (`createClient()` using `createBrowserClient`)
- Implemented `src/lib/supabase/middleware.ts` (`updateSession(request)` calling `auth.getUser()` to refresh the session, redirecting unauthenticated `/admin/*` and `/painel/*` requests — except `/admin/login` — to `/admin/login`)
- Implemented root `middleware.ts` wiring `updateSession` with a matcher excluding static assets/images
- Implemented `scripts/seed.ts`: creates `super@boamidia.dev` (super_admin, restaurant_id null), restaurant `pizzaria-do-joao` + `admin@pizzaria-do-joao.dev` (restaurant_admin), and restaurant `hamburgueria-central` + `admin@hamburgueria-central.dev` (restaurant_admin), all via `auth.admin.createUser` + Drizzle inserts
- Added `"seed": "tsx scripts/seed.ts"` to `package.json`
- Ran the seed script against the live Supabase Postgres instance and verified counts: 1 super_admin, 2 restaurant_admins, 2 restaurants
- `npx tsc --noEmit` reports no errors for `src/lib/supabase/*` or `middleware.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement @supabase/ssr client factories and session-refresh middleware** - `b9f9faa` (feat)
2. **Task 2: Write and run seed script (1 super_admin + 2 restaurant_admins across 2 restaurants)** - `211f62e` (feat)

## Files Created/Modified
- `src/lib/supabase/server.ts` - Async `createClient()` factory for Server Components/Actions
- `src/lib/supabase/client.ts` - `createClient()` factory for browser/client components
- `src/lib/supabase/middleware.ts` - `updateSession()` session refresh + route protection
- `middleware.ts` - Root middleware wiring `updateSession` with static-asset-excluding matcher
- `scripts/seed.ts` - Seed script for 1 super_admin + 2 restaurant_admins (D-04)
- `package.json` / `package-lock.json` - Added `seed` script and `ws`/`@types/ws` dev dependencies

## Decisions Made
- **`ws` + `@types/ws` added as dev dependencies**: Node 20 lacks native WebSocket support, and `supabase-js`'s realtime client constructor requires a WebSocket implementation even when realtime is unused — required for `scripts/seed.ts` to call `auth.admin.createUser`.
- **Dynamic imports in `scripts/seed.ts` after `dotenv.config()`**: static imports are hoisted under ESM, which would cause `src/db/index.ts` (and `@supabase/supabase-js`) to read `process.env` before `.env` is loaded, falling back to default/empty connection values. Dynamic `await import(...)` after `config({ path: '.env' })` avoids this.

## Deviations from Plan
- The `<interfaces>` block's `scripts/seed.ts` example used static imports and omitted the `ws` dependency; the implementation deviates by using dynamic imports (post-dotenv) and adding `ws`/`@types/ws` to satisfy `supabase-js`'s realtime client constructor on Node 20. All seed data (emails, passwords, restaurant names/slugs, roles) matches the plan exactly.

## Issues Encountered
- None blocking. The `ws` dependency requirement mirrors the same Node 20 / `@supabase/realtime-js` limitation noted in plan 01-03's summary.

## User Setup Required
None - seed script ran against the existing live Supabase Postgres instance using credentials already present in `.env`.

## Next Phase Readiness
- Auth infrastructure (`createClient` for server/browser, `updateSession` middleware) is in place; `/admin/*` and `/painel/*` redirect unauthenticated requests to `/admin/login` (route does not exist yet — expected until plan 01-05).
- Seed data (1 super_admin, 2 restaurant_admins across 2 restaurants) is live in Postgres, ready for plan 01-05's login pages and `verify-auth.ts` to exercise AUTH-01/02/03.
- No blockers identified.

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Completed: 2026-06-15*

## Self-Check: PASSED

- FOUND: src/lib/supabase/server.ts
- FOUND: src/lib/supabase/client.ts
- FOUND: src/lib/supabase/middleware.ts
- FOUND: middleware.ts
- FOUND: scripts/seed.ts
- FOUND: b9f9faa (commit)
- FOUND: 211f62e (commit)
