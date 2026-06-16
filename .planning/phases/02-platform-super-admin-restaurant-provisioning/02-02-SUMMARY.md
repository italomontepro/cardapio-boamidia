---
phase: 02-platform-super-admin-restaurant-provisioning
plan: 02
subsystem: platform-admin
tags: [server-actions, provisioning, drizzle-transaction, rollback, compensation, integration-test]

requires:
  - phase: 02-01
    provides: [createAdminClient, createRestaurantSchema, updateRestaurantSchema, verify-restaurants scaffold]
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: [restaurants + adminUsers Drizzle schema, db runtime client (DATABASE_URL_RUNTIME)]

provides:
  - createRestaurant Server Action — atomic-ish provisioning (restaurants row + auth.users + admin_users) with D-07 compensation
  - updateRestaurant Server Action — name/slug update with D-05 slug-collision error
  - toggleRestaurantActive Server Action — is_active flip with D-12 caller-side confirmation
  - verify-restaurants.ts with green PLAT-01, PLAT-02, PLAT-03, PLAT-05, D-05, D-07 integration assertions

affects: [02-03-PLAN (restaurant listing UI calls these actions), 02-04-PLAN (E2E verification)]

tech-stack:
  added: []
  patterns:
    - "db.transaction() wraps both Postgres writes (restaurants + admin_users); Auth API call sits inside the callback — single compensation path on throw (delete orphaned auth user)"
    - "ProvisioningError custom class distinguishes auth-create-failure from unknown errors in catch block"
    - "isUniqueViolation(err) checks Postgres error code 23505 for stable slug-collision detection"
    - "createAdminClient() conditionally injects ws transport when WebSocket is not globally available (Node.js < 22 / tsx script context)"
    - "revalidatePath wrapped in try-catch so actions can be called from tsx integration scripts"

key-files:
  created:
    - src/lib/restaurants/actions.ts
  modified:
    - scripts/verify-restaurants.ts
    - src/lib/supabase/admin.ts

key-decisions:
  - "Pattern 2 (refined) from RESEARCH: db.transaction() wraps both Postgres inserts; Auth API call is placed inside the callback between them. One compensation path instead of two (only need to delete orphaned auth user — Postgres auto-rolls-back both rows)"
  - "revalidatePath wrapped in try-catch in updateRestaurant/toggleRestaurantActive — cache invalidation is not a correctness concern; allows Server Actions to be exercised directly from tsx integration scripts"
  - "createAdminClient() gains a conditional ws transport shim (typeof WebSocket === 'undefined') — plan explicitly flagged 'if WebSocket runtime error appears, add fallback'; applied here to make createRestaurant callable from verify scripts"
  - "tempPassword generated via crypto.randomBytes(6).toString('hex') + 'Aa1!' — meets Supabase policy (uppercase, lowercase, digit, symbol), never persisted or logged (D-08)"

patterns-established:
  - "Pattern: Server Action with partial-failure compensation — db.transaction() + Auth API + single deleteUser fallback"
  - "Pattern: Error return shape { error: Record<string, string[]> } consistent with Zod flattenedErrors for RHF integration"

requirements-completed: [PLAT-01, PLAT-02, PLAT-03, PLAT-05]

duration: 5min
completed: 2026-06-16
---

# Phase 02 Plan 02: Restaurant Provisioning Server Actions Summary

**createRestaurant/updateRestaurant/toggleRestaurantActive implemented with atomic-ish Postgres+GoTrue provisioning and full PLAT-01..05 integration assertions proving the D-07 rollback path.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-16T04:24:38Z
- **Completed:** 2026-06-16T04:29:48Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments

- Implemented `createRestaurant()` using Research Pattern 2 (refined): `db.transaction()` wraps the two Postgres writes with the Auth API call inside; the single compensation path in the catch block deletes the orphaned `auth.users` row if the transaction throws after `auth.admin.createUser()` succeeded
- Implemented `updateRestaurant()` and `toggleRestaurantActive()` with unique-constraint handling and `revalidatePath('/admin')` for Next.js cache invalidation
- Extended `scripts/verify-restaurants.ts` with 6 assertions (PLAT-01 create, PLAT-05 provisioning + signInWithPassword, D-05 duplicate-slug, PLAT-02 update, PLAT-03 toggle, D-07 rollback) — all green, with per-run unique slugs/emails and full cleanup so reruns stay green

## Task Commits

1. **Task 1: Implement createRestaurant, updateRestaurant, toggleRestaurantActive** - `1c49ddd` (feat)
2. **Task 2: Implement real assertions in verify-restaurants.ts** - `0fb8ce5` (feat)

## Files Created/Modified

- `src/lib/restaurants/actions.ts` — 205-line Server Actions module: 3 exported async functions, generateTempPassword/isUniqueViolation/ProvisioningError helpers, `'use server'` directive, no tempPassword persistence
- `scripts/verify-restaurants.ts` — All 6 TODO markers replaced with live integration assertions; cleanup step removes test restaurant + auth user
- `src/lib/supabase/admin.ts` — Added conditional ws transport shim for Node.js < 22 compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ws WebSocket shim missing in createAdminClient() for tsx script context**

- **Found during:** Task 2 (first run of verify-restaurants.ts)
- **Issue:** `createAdminClient()` in `admin.ts` doesn't pass `realtime: { transport: ws }`. When `createRestaurant` is dynamically imported from a tsx script (Node.js 20, no native WebSocket), supabase-js throws "Node.js 20 detected without native WebSocket support"
- **Fix:** Added `const wsTransport = typeof WebSocket === 'undefined' ? require('ws') : undefined` and conditionally spread `{ realtime: { transport: wsTransport } }` into the client options. This matches the plan's explicit note: "if a runtime error about WebSocket appears, add the same ws transport as a fallback"
- **Files modified:** `src/lib/supabase/admin.ts`
- **Commit:** `0fb8ce5`

**2. [Rule 3 - Blocking] revalidatePath throws "Invariant: static generation store missing" in tsx context**

- **Found during:** Task 2 (verify-restaurants.ts ran PLAT-02 updateRestaurant)
- **Issue:** `revalidatePath('/admin')` is a Next.js App Router-only API; it throws an invariant error when called outside the Next.js runtime (e.g., from a tsx integration script that imports the Server Action directly)
- **Fix:** Wrapped both `revalidatePath('/admin')` calls in `try { revalidatePath('/admin') } catch { /* not in Next.js runtime */ }`. The DB write succeeds; the cache hint is a non-critical skip outside Next.js context
- **Files modified:** `src/lib/restaurants/actions.ts`
- **Commit:** `0fb8ce5`

## Self-Check

### Files Exist
- [x] `src/lib/restaurants/actions.ts` — FOUND
- [x] `scripts/verify-restaurants.ts` — FOUND (updated)
- [x] `src/lib/supabase/admin.ts` — FOUND (updated)

### Commits Exist
- [x] `1c49ddd` — feat(02-02): implement createRestaurant, updateRestaurant, toggleRestaurantActive Server Actions
- [x] `0fb8ce5` — feat(02-02): implement verify-restaurants.ts assertions + fix ws shim and revalidatePath for tsx context

### Verification Passed
- [x] `npx tsx scripts/verify-restaurants.ts` exits 0 — ALL CHECKS PASSED
- [x] `npx tsc --noEmit` — no errors in restaurants/actions.ts
- [x] tempPassword not persisted or logged in actions.ts

## Self-Check: PASSED
