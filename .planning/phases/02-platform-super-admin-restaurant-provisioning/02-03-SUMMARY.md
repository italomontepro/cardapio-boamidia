---
phase: 02-platform-super-admin-restaurant-provisioning
plan: 03
subsystem: auth
tags: [auth, is_active, login-gate, D-11, restaurant_admin, tenant-isolation]
dependency_graph:
  requires: [01-05]
  provides: [D-11-login-gate]
  affects: [login, restaurant_admin-sessions]
tech_stack:
  added: []
  patterns: [supabase-ssr-rls-gate, drizzle-update-restore-in-tests]
key_files:
  modified:
    - src/lib/auth/actions.ts
    - src/app/admin/login/page.tsx
    - scripts/verify-auth.ts
decisions:
  - "D-11 gate runs only for role === 'restaurant_admin' — super_admin has null restaurant_id and is never gated"
  - "Gate uses the SSR client (not Drizzle) so it runs under the user's RLS context — restaurants SELECT policy already permits restaurant_admin to read their own row"
  - "verify-auth.ts replicates the gate's SELECT chain rather than calling login() to avoid redirect() throwing in a Node.js script context"
  - "dotenv in verify-auth.ts now walks up to parent directories to support git worktrees"
metrics:
  duration: 5 min
  completed_date: 2026-06-16
  tasks_completed: 2
  files_modified: 3
requirements: [PLAT-03]
---

# Phase 02 Plan 03: D-11 is_active Login Gate — Summary

**One-liner:** JWT login gate that denies restaurant_admin users of deactivated restaurants, verified via live Supabase RLS assertions with state restore.

## What Was Built

- **login() gate (D-11):** After the `not_an_admin` check, `restaurant_admin` users now trigger a Supabase SSR query to `restaurants.is_active`. If `false`, the session is signed out and the user is redirected to `/admin/login?error=restaurant_inactive`. `super_admin` is structurally excluded (the gate block is wrapped in `if (adminRow.role === 'restaurant_admin')`).
- **Login page error:** `ERROR_MESSAGES` extended with `restaurant_inactive: 'Este restaurante está desativado. Contate o administrador da plataforma.'` — clear PT-BR message rendered when `?error=restaurant_inactive` is present.
- **verify-auth.ts D-11 section:** Deactivates `hamburgueria-central` via Drizzle, signs in as its `restaurant_admin`, reads `is_active` through the SSR client (replicating the gate logic), asserts `false`, then re-activates. Separately asserts that `super_admin`'s role causes the gate to be skipped. All AUTH-01/02/03 checks remain green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] dotenv path in verify-auth.ts failed in git worktree**
- **Found during:** Task 2 verification
- **Issue:** `config({ path: '.env' })` resolved relative to the worktree directory (`agent-aa5487510cfbe569e/`), which has no `.env`. Script exited with `supabaseUrl is required.`
- **Fix:** Added a parent-directory walk using Node.js `fs.existsSync` + `path.dirname` to find the nearest `.env` file (which lives in the repo root). All static `import` statements were placed at the top of the file to comply with ES module hoisting rules.
- **Files modified:** `scripts/verify-auth.ts`
- **Commit:** f55f534

## Known Stubs

None — all changes are logic and test verification code; no UI stubs or placeholder data introduced.

## Self-Check

- [x] `src/lib/auth/actions.ts` contains `.select('role, restaurant_id')` — commit 7b149bc
- [x] `src/lib/auth/actions.ts` contains `from('restaurants')` and `select('is_active')` — commit 7b149bc
- [x] `src/lib/auth/actions.ts` contains `redirect('/admin/login?error=restaurant_inactive')` — commit 7b149bc
- [x] `src/app/admin/login/page.tsx` contains `restaurant_inactive:` key — commit 7b149bc
- [x] `scripts/verify-auth.ts` contains `D-11 PASS` assertions — commit f55f534
- [x] `npx tsx scripts/verify-auth.ts` exits 0 with all 5 checks (AUTH-01/02/03 + 2×D-11) PASS
- [x] `npx tsc --noEmit` reports no errors

## Self-Check: PASSED
