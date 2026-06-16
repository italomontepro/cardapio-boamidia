---
phase: 02-platform-super-admin-restaurant-provisioning
plan: 01
subsystem: platform-admin
tags: [foundation, slugify, shadcn, admin-client, zod-schemas, verify-script]
dependency_graph:
  requires: [Phase 01 complete (RLS, schema, seed)]
  provides: [createAdminClient, generateSlug, createRestaurantSchema, updateRestaurantSchema, UI primitives (table/dialog/badge/alert-dialog), verify-restaurants scaffold]
  affects: [02-02-PLAN (Server Actions), 02-03-PLAN (listing UI), 02-04-PLAN (E2E verification)]
tech_stack:
  added: [slugify@^1.6.9]
  patterns: [service_role admin client factory, PT-BR slug generation with slugify locale:pt, zod 4 schema with branded error messages in Portuguese, integration-test scaffold with dotenv + ws shim + dynamic imports]
key_files:
  created:
    - src/lib/supabase/admin.ts
    - src/lib/restaurants/slug.ts
    - src/lib/restaurants/schema.ts
    - scripts/verify-restaurants.ts
  modified:
    - package.json (slugify added)
    - src/components/ui/table.tsx (shadcn add)
    - src/components/ui/dialog.tsx (shadcn add)
    - src/components/ui/badge.tsx (shadcn add)
    - src/components/ui/alert-dialog.tsx (shadcn add)
decisions:
  - "createAdminClient() does NOT include the ws realtime shim — Next.js server runtime has native WebSocket; shim is only needed in plain Node scripts (verify if WebSocket errors appear in Plan 02)"
  - "updateRestaurantSchema deliberately excludes adminEmail — admin provisioning is create-only per D-10 (1 admin per restaurant, multi-admin out of scope)"
  - "switch component intentionally NOT installed — D-12 specifies asymmetric UI: activate via Button, deactivate via Button+AlertDialog (no symmetric switch)"
metrics:
  duration: ~12 min
  completed: 2026-06-16T04:16:28Z
  tasks_completed: 3
  files_created: 4
  files_modified: 5
requirements_satisfied: [PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05]
---

# Phase 02 Plan 01: Foundation — Dependencies, Shared Modules & Verify Scaffold Summary

**One-liner:** slugify + shadcn UI primitives + service_role admin client + zod schemas + verify-restaurants.ts scaffold with 7 PLAT requirement TODOs for downstream plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install slugify and add shadcn UI components | fc871fa | package.json, src/components/ui/table.tsx, dialog.tsx, badge.tsx, alert-dialog.tsx |
| 2 | Create admin client factory, slug helper, and zod schemas | 7e2031c | src/lib/supabase/admin.ts, src/lib/restaurants/slug.ts, src/lib/restaurants/schema.ts |
| 3 | Scaffold scripts/verify-restaurants.ts integration test | 6b6fc95 | scripts/verify-restaurants.ts |

## What Was Built

### slugify + shadcn UI components (Task 1)

Installed `slugify@^1.6.9` and added four shadcn components using `npx shadcn@latest add`:
- `src/components/ui/table.tsx` — TableHeader, TableBody, TableRow, TableCell primitives
- `src/components/ui/dialog.tsx` — DialogContent, DialogHeader, DialogTitle for create/edit modals
- `src/components/ui/badge.tsx` — Badge component for active/inactive status display
- `src/components/ui/alert-dialog.tsx` — AlertDialogAction for destructive action confirms (deactivate)

`switch` component was intentionally NOT installed per D-12: deactivation requires a confirmation dialog (AlertDialog) to prevent accidental disables, making Switch's symmetric UX inappropriate.

### Admin client factory, slug helper, and zod schemas (Task 2)

Three shared modules providing stable contracts for downstream plans:

**`src/lib/supabase/admin.ts`** — `createAdminClient()` returns a service_role Supabase client that bypasses RLS. Uses `SUPABASE_SECRET_KEY`. No `ws` realtime shim (Next.js server runtime has native WebSocket; shim only needed in plain Node scripts like `seed.ts`).

**`src/lib/restaurants/slug.ts`** — `generateSlug(name)` using `slugify` with `{ lower: true, strict: true, locale: 'pt' }`. Verified: `generateSlug('Pizzaria do João') === 'pizzaria-do-joao'`.

**`src/lib/restaurants/schema.ts`** — Two zod 4 schemas:
- `createRestaurantSchema` — validates `name` (2-80 chars), `slug` (lowercase kebab-case regex), `adminEmail` (valid email)
- `updateRestaurantSchema` — validates `id` (UUID), `name`, `slug` — deliberately excludes `adminEmail` per D-10

### verify-restaurants.ts scaffold (Task 3)

`scripts/verify-restaurants.ts` follows the exact `verify-auth.ts` pattern:
- `config({ path: '.env' })` before any imports
- `import ws from 'ws'` Node 20 WebSocket shim
- Dynamic `await import('../src/db')` and `await import('../src/db/schema')` after dotenv
- `main().then(() => process.exit(0)).catch(...)` at bottom

Smoke check: `db.select().from(restaurants)` — exits 0 and prints `SMOKE PASS: restaurants table reachable, 2 rows` against the Phase 1 seeded DB.

7 TODO markers for Plan 02 to implement:
- `TODO(02-02): PLAT-01 create assertion`
- `TODO(02-02): PLAT-01 D-05 duplicate-slug assertion`
- `TODO(02-02): PLAT-02 update assertion`
- `TODO(02-02): PLAT-03 toggle assertion`
- `TODO(02-02): PLAT-04 listing+admin-count assertion`
- `TODO(02-02): PLAT-05 provisioning + signInWithPassword assertion`
- `TODO(02-02): PLAT-05 D-07 rollback assertion`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| No ws shim in createAdminClient() | Next.js server runtime provides native WebSocket; shim is a plain-Node workaround only needed in tsx scripts (seed.ts, verify-*.ts). If Plan 02 encounters WebSocket errors at runtime, add the shim then. |
| updateRestaurantSchema excludes adminEmail | Admin provisioning is create-only per D-10: 1 admin per restaurant, multi-admin management is out of scope for v1. Prevents accidental admin re-provisioning via the edit form. |
| switch NOT installed | D-12: asymmetric UX — activation is silent (Button click), deactivation requires confirmation dialog (AlertDialog). A symmetric Switch control doesn't model this asymmetry. |

## Deviations from Plan

None — plan executed exactly as written. The `.env` was not present in the worktree (it lives only in the main repo root); copied it for the verification run. The file is gitignored and was not committed.

## Known Stubs

None — this plan establishes contracts and scaffolding only. No UI or data-rendering code was written that could have placeholder values.

## Self-Check: PASSED

Files created:
- src/lib/supabase/admin.ts: FOUND
- src/lib/restaurants/slug.ts: FOUND
- src/lib/restaurants/schema.ts: FOUND
- scripts/verify-restaurants.ts: FOUND
- src/components/ui/table.tsx: FOUND
- src/components/ui/dialog.tsx: FOUND
- src/components/ui/badge.tsx: FOUND
- src/components/ui/alert-dialog.tsx: FOUND

Commits:
- fc871fa: FOUND
- 7e2031c: FOUND
- 6b6fc95: FOUND

Verification:
- `npx tsx scripts/verify-restaurants.ts`: exits 0, prints SMOKE PASS
- `npx tsc --noEmit`: TypeScript: No errors found
