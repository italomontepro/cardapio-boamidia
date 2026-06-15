---
phase: 01-foundation-data-model-rls-auth-roles
verified: 2026-06-15T00:00:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 1: Foundation — Data Model, RLS & Auth Roles Verification Report

**Phase Goal:** The multi-tenant data model exists with Row Level Security correctly enforced, and both admin roles (platform super-admin and restaurant admin) can authenticate against it with strict tenant isolation.
**Verified:** 2026-06-15
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A super admin user can log in to a platform admin area | ✓ VERIFIED | `src/lib/auth/actions.ts` `login()` calls `signInWithPassword`, resolves role via RLS-scoped `admin_users` query, redirects to `/admin` for `super_admin`. `src/app/admin/(dashboard)/page.tsx` renders all restaurants. Live `scripts/verify-auth.ts` run: `AUTH-01 PASS: super_admin sees 2 restaurants`. |
| 2 | A restaurant admin user can log in to a restaurant admin area, scoped only to their own restaurant | ✓ VERIFIED | Same `login()` redirects `restaurant_admin` to `/painel`. `src/app/painel/page.tsx` queries `restaurants` with no manual filter (RLS-scoped). Live run: `AUTH-02 PASS: restaurant_admin_1 sees only pizzaria-do-joao`. |
| 3 | Logging in as one restaurant's admin and querying another restaurant's data returns nothing (cross-tenant isolation verified) | ✓ VERIFIED | Live run: `AUTH-03 PASS: restaurant_admin_2 sees only hamburgueria-central -- cross-tenant isolation verified` (different non-overlapping restaurant than admin_1, asserted explicitly in the script). |
| 4 | Database schema for restaurants, units, categories, products, availability, and admin users exists with RLS enabled on every table | ✓ VERIFIED | `src/db/schema.ts` defines all 6 tables + `admin_role` enum with FKs/indexes. Live `information_schema.tables` lists all 6: `admin_users, categories, product_availability, products, restaurants, units`. Live `pg_class.relrowsecurity` query: all 6 = `true`. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | Drizzle schema for 6 tables + admin_role enum, FKs, indexes, sparse availability convention | ✓ VERIFIED | All 6 tables exported with correct columns/FKs/indexes; `SPARSE TABLE CONVENTION` comment present |
| `src/db/migrations/0000_*.sql`, `0001_admin_users_auth_fk.sql`, `0002_rls_policies.sql` | Applied migrations creating tables, auth.users FK + CHECK, RLS policies | ✓ VERIFIED | All present; live DB confirms tables, `admin_users_user_id_fkey`, `admin_users_role_restaurant_chk`, and RLS enabled |
| `src/db/index.ts` | Runtime Drizzle client (DATABASE_URL_RUNTIME, prepare:false) | ✓ VERIFIED | Matches plan exactly; `npx tsc --noEmit` clean |
| `drizzle.config.ts` | drizzle-kit config, Session Mode, `entities.roles.provider: 'supabase'` | ✓ VERIFIED | Exists per 01-01-SUMMARY, used successfully for all live migration applies |
| `src/lib/supabase/{server,client,middleware}.ts` | @supabase/ssr factories + session-refresh middleware | ✓ VERIFIED | All three match planned interfaces; `getUser()` called for refresh, redirect logic correct |
| `middleware.ts` (root) | Wires `updateSession`, matcher excludes static assets | ✓ VERIFIED | Matches plan; live curl confirms redirects |
| `scripts/seed.ts` | Creates 1 super_admin + 2 restaurant_admins via Admin API | ✓ VERIFIED | Live DB: 1 super_admin, 2 restaurant_admins, 2 restaurants (counts match exactly) |
| `src/lib/auth/actions.ts` | `login`/`logout` Server Actions | ✓ VERIFIED | `signInWithPassword`, RLS-scoped role lookup (not Drizzle), role-based redirect, `logout` signs out |
| `src/lib/auth/session.ts` | `getCurrentAdmin()` helper | ✓ VERIFIED | Resolves `auth.uid()` to `admin_users` row via SSR client; exports `CurrentAdmin` type with all 4 fields |
| `src/app/admin/login/page.tsx` | Single login form (D-08) | ✓ VERIFIED | `action={login}`, pt-BR error messages for both error codes |
| `src/app/admin/(dashboard)/page.tsx` + `layout.tsx` | super_admin landing, lists all restaurants, auth guard | ✓ VERIFIED | Unfiltered `from('restaurants')` query; layout redirects non-super_admin/null to `/admin/login`; logout button wired |
| `src/app/painel/page.tsx` + `layout.tsx` | restaurant_admin landing, own restaurant only, auth guard | ✓ VERIFIED | Same unfiltered query pattern; layout redirects non-restaurant_admin/null; logout button wired |
| `scripts/verify-auth.ts` | Automated AUTH-01/02/03 check | ✓ VERIFIED | Runs live, all 3 checks PASS, exits 0 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/db/index.ts` | `DATABASE_URL_RUNTIME` | postgres.js client construction | WIRED | `prepare: false`, env var read confirmed |
| `drizzle.config.ts` | `DATABASE_URL` | `dbCredentials.url` | WIRED | All migrations applied successfully via this config |
| `src/db/schema.ts` | `src/db/index.ts` | `import * as schema from './schema'` | WIRED | `npx tsc --noEmit` clean |
| `admin_users.restaurant_id` | `restaurants.id` | Drizzle `.references()` ON DELETE CASCADE | WIRED | `pg_constraint` shows `admin_users_restaurant_id_restaurants_id_fk` |
| `middleware.ts` | `src/lib/supabase/middleware.ts` | `import { updateSession }` | WIRED | Live curl: `/admin` (unauth) → 307 → `/admin/login`; `/painel` (unauth) → 307 → `/admin/login`; `/admin/login` → 200 |
| `scripts/seed.ts` | `SUPABASE_SECRET_KEY` | `createClient(url, secret, ...)` | WIRED | Live DB seeded counts match exactly (1/2/2) |
| `src/app/admin/login/page.tsx` | `src/lib/auth/actions.ts` | `form action={login}` | WIRED | Confirmed via grep + tsc |
| `src/lib/auth/actions.ts` | `admin_users` (RLS-scoped) | `supabase.from('admin_users').select('role')...` | WIRED | Not Drizzle (correct per plan deviation note); live `verify-auth.ts` exercises equivalent path |
| `src/app/admin/(dashboard)/page.tsx` | RLS policy on `restaurants` | unfiltered `supabase.from('restaurants').select('*')` | WIRED | Live verify-auth: super_admin sees 2 restaurants |
| `src/app/painel/page.tsx` | RLS policy via `current_admin_restaurant_id()` | unfiltered `supabase.from('restaurants').select(...)` | WIRED | Live verify-auth: each restaurant_admin sees exactly 1, different restaurants |
| `0002_rls_policies.sql` helper functions | `auth.uid()` / `is_super_admin()` | `LANGUAGE plpgsql SECURITY DEFINER` | WIRED | Live `pg_proc`/`pg_language`: both functions `prosecdef=true`, `lanname='plpgsql'` (avoids Pitfall 1 recursion) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `src/app/admin/(dashboard)/page.tsx` | `restaurants` | `supabase.from('restaurants').select('id, name, slug, is_active, created_at').order('name')` against live Supabase via RLS | Yes — live run returns 2 real seeded restaurants | ✓ FLOWING |
| `src/app/painel/page.tsx` | `restaurants` (first element) | Same unfiltered query, RLS narrows to 1 row per restaurant_admin | Yes — live run confirms exactly 1 row, distinct per tenant | ✓ FLOWING |
| `src/app/admin/login/page.tsx` | `errorMessage` | `searchParams.error` mapped via `ERROR_MESSAGES` | N/A (UI-only derived state, not DB-backed) | ✓ FLOWING (static mapping, intentional) |

No hardcoded-empty props or disconnected data sources found — both landing pages issue real, unfiltered Supabase queries against the live database, and RLS does all the tenant scoping (the D-09 "live smoke test" design intent).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AUTH-01/02/03 live verification | `npx tsx scripts/verify-auth.ts` | `AUTH-01 PASS`, `AUTH-02 PASS`, `AUTH-03 PASS`, `ALL CHECKS PASSED`, exit 0 | ✓ PASS |
| RLS enabled on all 6 tables | live `pg_class.relrowsecurity` query | All 6 tables `true` | ✓ PASS |
| Helper functions correct language/security | live `pg_proc`/`pg_language` query | Both `prosecdef=true`, `lanname='plpgsql'` | ✓ PASS |
| `admin_users` constraints present | live `pg_constraint` query | `admin_users_user_id_fkey`, `admin_users_role_restaurant_chk`, `admin_users_restaurant_id_restaurants_id_fk` all present | ✓ PASS |
| Seed data counts | live `admin_users`/`restaurants` count query | `superAdmins: 1, restaurantAdmins: 2, restaurants: 2` | ✓ PASS |
| Anon (unauthenticated) query default-deny | `supabase.from('restaurants').select('*')` with anon key, no session | `{ data: [], error: undefined }` | ✓ PASS |
| Middleware route protection | `curl /admin`, `curl /painel`, `curl /admin/login` (dev server, unauthenticated) | `/admin` → 307 → `/admin/login`; `/painel` → 307 → `/admin/login`; `/admin/login` → 200 | ✓ PASS |
| TypeScript compilation | `npx tsc --noEmit -p tsconfig.json` | No errors | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| AUTH-01 | 01-01, 01-02, 01-04, 01-05 | Super admin da plataforma pode fazer login em painel próprio | ✓ SATISFIED | Live `verify-auth.ts`: `AUTH-01 PASS: super_admin sees 2 restaurants`; `/admin` dashboard renders all restaurants |
| AUTH-02 | 01-01, 01-02, 01-04, 01-05 | Admin do restaurante pode fazer login em painel próprio, restrito ao seu restaurante | ✓ SATISFIED | Live `verify-auth.ts`: `AUTH-02 PASS: restaurant_admin_1 sees only pizzaria-do-joao`; `/painel` shows exactly 1 restaurant |
| AUTH-03 | 01-03, 01-05 | Dados de cada restaurante são isolados entre tenants | ✓ SATISFIED | RLS policies (`0002_rls_policies.sql`) enforce `is_super_admin() OR restaurant_id = current_admin_restaurant_id()`; live `verify-auth.ts`: `AUTH-03 PASS` with explicit cross-tenant non-overlap assertion; anon default-deny confirmed |

No orphaned requirements found — REQUIREMENTS.md maps only AUTH-01/02/03 to Phase 1, and all three are declared across plans 01-01 through 01-05 and satisfied.

### Anti-Patterns Found

None. Scanned all phase-modified files (`src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `src/lib/auth/{actions,session}.ts`, `src/lib/supabase/{server,client,middleware}.ts`, `middleware.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/(dashboard)/{layout,page}.tsx`, `src/app/painel/{layout,page}.tsx`, `scripts/{seed,verify-auth}.ts`, `src/db/migrations/0002_rls_policies.sql`) for TODO/FIXME/placeholder/stub patterns, empty handlers, and hardcoded-empty data flowing to render. None found. All landing pages issue real, unfiltered, RLS-scoped Supabase queries; no static/empty fallbacks masking missing data.

### Human Verification Required

None required for this phase's automated re-check. Manual browser walkthrough (9-step session/cookie UX checklist) was already performed and approved by the user during plan 01-05 execution ("tudo correto"), and the equivalent RLS-level checks were independently re-confirmed live during this verification (middleware redirects via curl, RLS-scoped queries via `verify-auth.ts`).

### Gaps Summary

No gaps. All 4 success criteria from ROADMAP.md are independently re-verified against the live Supabase instance during this verification pass (not just trusted from SUMMARY claims):

1. Schema: all 6 tables exist with correct columns, FKs, unique constraints, and indexes (live `information_schema.tables`).
2. RLS: enabled on all 6 tables (live `pg_class.relrowsecurity`), helper functions are `plpgsql`/`security definer` (avoiding the infinite-recursion pitfall), and `admin_users` has both the `auth.users` FK and the role/restaurant_id CHECK constraint.
3. Auth: `npx tsx scripts/verify-auth.ts` runs live and prints `AUTH-01 PASS`, `AUTH-02 PASS`, `AUTH-03 PASS`, `ALL CHECKS PASSED`, confirming super_admin sees all (2) restaurants, and the two restaurant_admins see exactly 1 restaurant each, with no cross-tenant overlap.
4. Routing: middleware correctly redirects unauthenticated `/admin` and `/painel` requests to `/admin/login`, while `/admin/login` itself is accessible (no redirect loop — the route-group fix from 01-05's deviation log is in place and working).
5. Default-deny: an unauthenticated (anon-key) query against `restaurants` returns `[]`, confirming no accidental public read access.
6. `npx tsc --noEmit` is clean across the entire project.

The premature "Phase 1 complete" marking in ROADMAP.md/STATE.md is justified by this independent verification — the phase goal is fully achieved.

---

*Verified: 2026-06-15*
*Verifier: Claude (gsd-verifier)*
