---
phase: 01-foundation-data-model-rls-auth-roles
plan: 01
subsystem: infra
tags: [nextjs, supabase, drizzle, postgres, shadcn, tailwind, env-config]

# Dependency graph
requires: []
provides:
  - Running Next.js 16 App Router project (TypeScript, Tailwind 4, src/ dir)
  - Full Phase 1 dependency set installed (Supabase, Drizzle, zod, react-hook-form, libphonenumber-js, shadcn/ui)
  - Live Supabase project with Postgres, Auth, and Storage provisioned
  - .env (gitignored) and .env.example with Supabase + dual-mode DB connection strings
  - drizzle.config.ts (Session Mode, port 5432, entities.roles.provider: supabase)
  - src/db/index.ts runtime Drizzle client (Transaction Mode, port 6543, prepare: false)
affects: [01-02-schema-rls, 01-03-auth-roles, all-future-phases]

# Tech tracking
tech-stack:
  added:
    - next@16 (App Router, Turbopack, src/ dir, TS)
    - "@supabase/supabase-js@2.108.2"
    - "@supabase/ssr@0.12.0"
    - drizzle-orm@0.45.2 + drizzle-kit@0.31.10 + postgres (postgres.js driver)
    - zod@4, react-hook-form@7, @hookform/resolvers, libphonenumber-js
    - shadcn/ui (button, input, label, card, form)
    - dev: tsx, dotenv, prettier, prettier-plugin-tailwindcss
  patterns:
    - "Dual connection-string split: DATABASE_URL (Session Mode, port 5432) for drizzle-kit migrations; DATABASE_URL_RUNTIME (Transaction Mode, port 6543, prepare:false) for app runtime queries (D-11)"
    - "drizzle.config.ts entities.roles.provider: 'supabase' to avoid drizzle-kit managing Supabase's built-in Postgres roles"

key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - components.json
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - src/components/ui/*.tsx
    - src/lib/utils.ts
    - .env
    - .env.example
    - drizzle.config.ts
    - src/db/index.ts
  modified:
    - .gitignore

key-decisions:
  - "Supabase project provisioned via dashboard (cardapio-boamidia); credentials collected manually since no Supabase CLI session existed for non-interactive project creation"
  - "DATABASE_URL = Session pooler (5432) for drizzle-kit; DATABASE_URL_RUNTIME = Transaction pooler (6543, prepare:false) for app runtime, per D-11"

patterns-established:
  - "Pattern: src/db/index.ts imports * as schema from './schema' -- schema.ts does not exist yet (created in plan 01-02), so this file will show a TS module-resolution error until then. This is expected and must not be worked around with a placeholder schema."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: ~35min (across two sessions, paused at Task 2 checkpoint:human-action)
completed: 2026-06-15
---

# Phase 1 Plan 01: Foundation Scaffold + Supabase Provisioning Summary

**Next.js 16 + Tailwind 4 + shadcn/ui scaffold with live Supabase project, full Phase 1 dependency set, and Drizzle dual-mode (Session/Transaction) Postgres connection wired and verified.**

## Performance

- **Duration:** ~35 min total (Task 1 in prior session; Tasks 2-3 in this continuation session)
- **Started:** prior session (Task 1)
- **Completed:** 2026-06-15
- **Tasks:** 3 (1 auto, 1 checkpoint:human-action, 1 auto)
- **Files modified:** 16+ (scaffold) + 4 (env/drizzle config)

## Accomplishments
- Next.js 16 App Router project scaffolded at repo root with TypeScript, Tailwind 4, src/ dir, all Phase 1 dependencies installed and shadcn/ui initialized with base components (button, input, label, card, form)
- Live Supabase project ("cardapio-boamidia") provisioned via dashboard with Postgres, Auth, and Storage
- `.env` (gitignored) and `.env.example` (committed, placeholders) populated with all 5 required env vars
- `drizzle.config.ts` and `src/db/index.ts` created per the locked Session Mode (migrations) / Transaction Mode (runtime, `prepare: false`) split
- Live `select 1 as ok` connectivity check against `DATABASE_URL` succeeded (`[{"ok":1}]`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 app and install full dependency set** - `20efb01` (feat)
2. **Task 2: Create Supabase project and obtain credentials** - checkpoint:human-action, no code artifact (credentials obtained, used in Task 3 commit below)
3. **Task 3: Write .env, .env.example, drizzle.config.ts, and runtime Drizzle client stub** - `b2e614b` (feat, combined with Task 2 acknowledgment)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `package.json`, `tsconfig.json`, `next.config.ts`, `components.json` - Next.js 16 + Tailwind 4 + shadcn/ui scaffold config
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` - App Router entrypoints
- `src/components/ui/*.tsx` - shadcn/ui base components (button, input, label, card, form)
- `src/lib/utils.ts` - shadcn `cn()` helper
- `.env` - gitignored, real Supabase + dual DB connection string credentials
- `.env.example` - committed placeholder template with inline comments documenting Session vs Transaction mode usage
- `drizzle.config.ts` - drizzle-kit config, Session Mode (`DATABASE_URL`), `entities.roles.provider: 'supabase'`
- `src/db/index.ts` - runtime Drizzle client, Transaction Mode (`DATABASE_URL_RUNTIME`), `prepare: false`
- `.gitignore` - confirmed `.env*` ignored with `.env.example` exception

## Decisions Made
- Supabase project created manually via dashboard (no CLI auth available for non-interactive creation); 5 credential values (Project URL, publishable key, secret key, session pooler URL, transaction pooler URL) collected and supplied by user.
- Confirmed Session Mode (port 5432) -> `DATABASE_URL` (drizzle-kit) and Transaction Mode (port 6543, `prepare: false`) -> `DATABASE_URL_RUNTIME` (app runtime) per D-11/Pitfall 3.

## Deviations from Plan

None - plan executed exactly as written. Task 2's checkpoint:human-action and Task 3's file-writing/connectivity-check were combined into a single commit (`b2e614b`) since Task 2 itself produces no code artifacts.

## Issues Encountered
None. Connectivity check succeeded on first attempt.

## User Setup Required
None further - Supabase project setup (the only external service requirement for this plan) is complete. `.env` is populated locally; production/Vercel env vars will need to be configured at deploy time (out of scope for this plan).

## Next Phase Readiness
- Plan 01-02 (schema + RLS) can proceed: `src/db/index.ts` is in place and expects `src/db/schema.ts` (intentionally not yet created - will cause a TS error referencing `./schema` until 01-02 creates it, as documented in the plan's interfaces block).
- Live DB connection verified end-to-end; drizzle-kit migrations can run against `DATABASE_URL` once schema.ts exists.
- No blockers for Phase 1 wave 2 plans.

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Completed: 2026-06-15*

## Self-Check: PASSED

All claimed files exist (.env, .env.example, drizzle.config.ts, src/db/index.ts) and all claimed commits (20efb01, b2e614b) found in git log.
