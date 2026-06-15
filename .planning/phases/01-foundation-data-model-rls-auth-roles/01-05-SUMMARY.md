---
phase: 01-foundation-data-model-rls-auth-roles
plan: 05
subsystem: auth
tags: [auth, server-actions, rls, supabase-ssr, multi-tenant, route-groups]

# Dependency graph
requires:
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: "RLS policies and helper functions (plan 01-03)"
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: "@supabase/ssr server/browser client factories + session middleware + seed data (plan 01-04)"
provides:
  - "login(formData) / logout() Server Actions (src/lib/auth/actions.ts)"
  - "getCurrentAdmin() session-resolution helper (src/lib/auth/session.ts)"
  - "/admin/login single login page (D-08) with pt-BR error messages"
  - "/admin (super_admin landing -- all restaurants) and /painel (restaurant_admin landing -- own restaurant only), each with auth-guard layouts and logout button (D-09)"
  - "scripts/verify-auth.ts -- automated AUTH-01/02/03 verification (all 3 seeded users)"
affects: [phase-2-platform-super-admin, phase-3-restaurant-admin-units-catalog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role lookup in login() uses the SSR Supabase client (supabase.from('admin_users').select('role')...), NOT Drizzle -- Drizzle's postgres.js connection has no auth.uid() JWT context, so it cannot satisfy the 'admins read own row' RLS policy"
    - "Landing pages (/admin, /painel) query restaurants with NO manual tenant filter -- RLS policies (is_super_admin() OR id = current_admin_restaurant_id()) do all the scoping; this IS the D-09 'live RLS smoke test'"
    - "Next.js route groups ((dashboard)) used to separate the super_admin-guarded /admin dashboard from the unguarded /admin/login page under the same /admin/* URL prefix, avoiding a layout-induced redirect loop"

key-files:
  created:
    - src/lib/auth/actions.ts
    - src/lib/auth/session.ts
    - src/app/admin/login/page.tsx
    - src/app/admin/(dashboard)/layout.tsx
    - src/app/admin/(dashboard)/page.tsx
    - src/app/painel/layout.tsx
    - src/app/painel/page.tsx
    - scripts/verify-auth.ts
  modified:
    - package.json

key-decisions:
  - "Moved /admin dashboard layout+page into src/app/admin/(dashboard)/ route group (deviation, Task 4 prerequisite fix) -- the super_admin auth guard in admin/layout.tsx was wrapping /admin/login too, causing /admin/login to redirect to itself (infinite NEXT_REDIRECT loop). Route groups don't affect the URL, so /admin/login (Task 1) and /admin (Task 2, dashboard) now resolve independently under the same /admin/* prefix."
  - "Confirmed both /admin and /painel landing-page queries use unfiltered supabase.from('restaurants').select(...) -- tenant scoping is entirely delegated to the RLS policies from plan 01-03, per D-09"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 18min
completed: 2026-06-15
---

# Phase 1 Plan 5: Login/Logout, Role-Scoped Landing Pages & Auth Verification Summary

**Single login form (D-08) with role-based redirect to /admin or /painel, RLS-scoped landing pages proving tenant isolation (D-09), and scripts/verify-auth.ts automating AUTH-01/02/03 -- all PASS against the live Supabase instance**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-15T21:36:00Z
- **Completed:** 2026-06-15T21:54:00Z
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify)
- **Files modified:** 9 (8 created, 1 modified)

## Accomplishments

- Implemented `src/lib/auth/actions.ts`: `login(formData)` signs in via `supabase.auth.signInWithPassword`, resolves role via the RLS-scoped `admin_users` query (SSR client, not Drizzle), redirects to `/admin` (super_admin) or `/painel` (restaurant_admin); on invalid credentials redirects to `/admin/login?error=invalid_credentials`, on valid auth but no admin row signs out and redirects with `?error=not_an_admin`. `logout()` signs out and redirects to `/admin/login`.
- Implemented `src/lib/auth/session.ts`: `getCurrentAdmin()` resolves the current session's `auth.uid()` to an `admin_users` row (`role`, `restaurant_id`) for use as a layout auth guard.
- Implemented `src/app/admin/login/page.tsx`: single login form (D-08) for both roles using shadcn `Card`/`Input`/`Label`/`Button`, reads `searchParams.error` and shows pt-BR error messages ("Email ou senha invalidos." / "Este usuario nao tem acesso administrativo.").
- Implemented `src/app/admin/(dashboard)/layout.tsx` + `page.tsx`: redirects non-super_admin to `/admin/login`; lists ALL restaurants via unfiltered `supabase.from('restaurants').select(...)` -- proves `is_super_admin()` RLS policy. Heading "Painel da Plataforma -- Restaurantes", with empty-state message.
- Implemented `src/app/painel/layout.tsx` + `page.tsx`: redirects non-restaurant_admin to `/admin/login`; shows only the admin's own restaurant via the same unfiltered query -- proves `current_admin_restaurant_id()` RLS policy. Heading "Painel do Restaurante", with error-state message for zero rows.
- Both layouts render a shared header (logged-in email + "Sair" logout button wired to the `logout` Server Action).
- Implemented `scripts/verify-auth.ts`: logs in as all 3 seeded users, asserts RLS-scoped `restaurants` query results. Added `"verify-auth": "tsx scripts/verify-auth.ts"` to `package.json`.
- Ran `npx tsx scripts/verify-auth.ts` against the live Supabase instance: `AUTH-01 PASS` (super_admin sees 2 restaurants), `AUTH-02 PASS` (restaurant_admin_1 sees only `pizzaria-do-joao`), `AUTH-03 PASS` (restaurant_admin_2 sees only `hamburgueria-central`, no cross-tenant leak), `ALL CHECKS PASSED`, exit 0.
- Re-ran the `relrowsecurity` check: all 6 tables remain RLS-enabled (D-03 -- no service_role bypass introduced).
- `npx tsc --noEmit` reports no errors for any of the new/modified files.
- Manual browser walkthrough (Task 4, checkpoint:human-verify): all 9 steps passed -- unauthenticated/wrong-role redirects to `/admin/login`, correct role-based redirects and RLS-scoped data on `/admin` (2 restaurants) and `/painel` (1 restaurant each, different per admin), working logout, and an error message on invalid credentials. User confirmed "tudo correto".

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement login/logout Server Actions, session helper, and /admin/login page** - `a37c62c` (feat)
2. **Task 2: Build /admin and /painel landing pages with auth guards and RLS-scoped data views** - `ffd5a93` (feat)
3. **Task 3: Write scripts/verify-auth.ts and run full AUTH-01/02/03 verification** - `38695c2` (feat)
4. **Deviation fix (prerequisite for Task 4): move /admin dashboard into route group** - `53dba6c` (fix)
5. **Task 4: Manual browser verification of login flow, redirects, and logout** - checkpoint:human-verify, approved by user, no code changes (no commit)

## Files Created/Modified

- `src/lib/auth/actions.ts` - `login()` / `logout()` Server Actions
- `src/lib/auth/session.ts` - `getCurrentAdmin()` + `CurrentAdmin` type
- `src/app/admin/login/page.tsx` - Single login form (D-08), pt-BR error messages
- `src/app/admin/(dashboard)/layout.tsx` - super_admin auth guard + shared header (moved here via deviation)
- `src/app/admin/(dashboard)/page.tsx` - lists ALL restaurants (RLS-scoped, D-09)
- `src/app/painel/layout.tsx` - restaurant_admin auth guard + shared header
- `src/app/painel/page.tsx` - shows only own restaurant (RLS-scoped, D-09)
- `scripts/verify-auth.ts` - automates AUTH-01/02/03 verification
- `package.json` - added `verify-auth` npm script

## Decisions Made

- **SSR client (not Drizzle) for role lookup in `login()`**: Drizzle's `postgres.js` runtime connection has no `auth.uid()` JWT context and cannot satisfy the "admins read own row" RLS policy on `admin_users`. The Supabase SSR client runs under the authenticated user's session, so `supabase.from('admin_users').select('role').eq('user_id', ...).single()` is used instead.
- **Route group `(dashboard)` for `/admin` dashboard**: separates the super_admin-guarded dashboard layout from the unguarded `/admin/login` page under the same `/admin/*` URL prefix without changing any URLs.
- **RLS does all tenant scoping on landing pages**: both `/admin` and `/painel` issue the identical unfiltered `restaurants` query; the difference in results (all restaurants vs. exactly one) is produced entirely by the RLS policies from plan 01-03, which is the D-09 "live smoke test" requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Fixed infinite redirect loop on /admin/login caused by /admin layout guard**
- **Found during:** Task 4 (manual browser verification) setup -- discovered while preparing the dev server for checkpoint verification
- **Issue:** `src/app/admin/layout.tsx` (the super_admin auth guard added in Task 2) applied to ALL routes under `/admin/*`, including `/admin/login` itself. An unauthenticated or wrong-role request to `/admin/login` was redirected by this layout back to `/admin/login`, producing an infinite `NEXT_REDIRECT` loop (observed as a 404/error page) and blocking the entire Task 4 checkpoint.
- **Fix:** Moved the dashboard `layout.tsx` and `page.tsx` from `src/app/admin/` into `src/app/admin/(dashboard)/` -- a Next.js route group that does not alter the URL path. `/admin/login` (Task 1, outside the route group) is no longer wrapped by the super_admin guard. Verified via `curl`: `/admin/login` -> 200, `/admin` (unauthenticated) -> 307 to `/admin/login`.
- **Files modified:** `src/app/admin/(dashboard)/layout.tsx` (moved), `src/app/admin/(dashboard)/page.tsx` (moved)
- **Commit:** `53dba6c`

## Issues Encountered

None blocking beyond the redirect-loop fix above (Rule 3, resolved before Task 4 verification).

## User Setup Required

None - all verification ran against the existing live Supabase Postgres instance using credentials already present in `.env`, and the manual browser checkpoint was completed by the user with the dev server started by the executor.

## Phase 1 Completion

This was the final plan of Phase 1. All 3 phase success criteria from ROADMAP.md are now verified:

1. **AUTH-01**: super_admin logs in at `/admin/login`, redirected to `/admin`, sees all 2 restaurants (`pizzaria-do-joao`, `hamburgueria-central`) -- verified via `scripts/verify-auth.ts` and manual browser walkthrough.
2. **AUTH-02**: restaurant_admin logs in at `/admin/login`, redirected to `/painel`, sees only their own restaurant -- verified both ways.
3. **AUTH-03**: two different restaurant_admins see two different, non-overlapping restaurants (cross-tenant isolation) -- verified both ways.
4. Logout (D-10) ends the session and redirects to `/admin/login`; protected routes then redirect unauthenticated users back to `/admin/login`.
5. All 6 tables remain `relrowsecurity = true` (D-03) -- re-checked after all Phase 1 work.

## Next Phase Readiness

- Full auth foundation (schema, RLS, SSR clients, middleware, login/logout, role-scoped landing pages) is live and verified against the real Supabase instance.
- Phase 2 (Platform Super-Admin -- Restaurant Provisioning) can build CRUD for restaurants directly on top of `/admin/(dashboard)`, reusing `getCurrentAdmin()` and the existing RLS policies (`is_super_admin()` already grants full read/write per plan 01-03).
- No blockers identified.

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Completed: 2026-06-15*

## Self-Check: PASSED

- FOUND: src/lib/auth/actions.ts
- FOUND: src/lib/auth/session.ts
- FOUND: src/app/admin/login/page.tsx
- FOUND: src/app/admin/(dashboard)/layout.tsx
- FOUND: src/app/admin/(dashboard)/page.tsx
- FOUND: src/app/painel/layout.tsx
- FOUND: src/app/painel/page.tsx
- FOUND: scripts/verify-auth.ts
- FOUND: a37c62c (commit)
- FOUND: ffd5a93 (commit)
- FOUND: 38695c2 (commit)
- FOUND: 53dba6c (commit)
