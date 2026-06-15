---
phase: 01-foundation-data-model-rls-auth-roles
plan: 02
subsystem: database
tags: [drizzle, postgres, supabase, migrations, schema]

# Dependency graph
requires:
  - phase: 01-01
    provides: "src/db/index.ts runtime Drizzle client, drizzle.config.ts (Session/Transaction mode split), live Supabase Postgres instance"
provides:
  - "Complete Drizzle schema (src/db/schema.ts) for all 6 Phase 1 tables: restaurants, units, categories, products, product_availability, admin_users"
  - "admin_role enum (super_admin, restaurant_admin)"
  - "Applied initial migration creating all 6 tables, FKs, and FK indexes in live Supabase Postgres"
  - "admin_users.user_id FK to auth.users(id) ON DELETE CASCADE (raw SQL migration)"
  - "admin_users role/restaurant_id CHECK constraint (admin_users_role_restaurant_chk) enforcing D-01"
  - "src/db/index.ts now compiles cleanly against schema.ts"
affects: [01-03-auth-roles, 01-04, 01-05, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sparse product_availability convention (D-05/D-06): a row's existence means UNAVAILABLE; absence means AVAILABLE by default. No bulk-insert for every product x unit pair."
    - "FK + raw-SQL split: Drizzle schema models all in-schema FKs; the admin_users -> auth.users(id) FK and role/restaurant_id CHECK constraint are added via a hand-written, journaled migration (0001) since Drizzle cannot model auth.users or CHECK constraints directly."
    - "drizzle-kit generate --custom used to register hand-written SQL migrations in _journal.json so drizzle-kit migrate tracks and applies them in order."

key-files:
  created:
    - src/db/schema.ts
    - src/db/migrations/0000_useful_krista_starr.sql
    - src/db/migrations/0001_admin_users_auth_fk.sql
    - src/db/migrations/meta/_journal.json
    - src/db/migrations/meta/0000_snapshot.json
    - src/db/migrations/meta/0001_snapshot.json
  modified: []

key-decisions:
  - "admin_users.userId has no Drizzle .references() to auth.users (not modeled in Drizzle); FK added via raw SQL in migration 0001 per plan instructions"
  - "products.imageUrl and isFeatured, units.address and units.hours included now (nullable/defaulted) even though only required by Phase 3, to avoid later migration churn"

patterns-established:
  - "Pattern: Both pending migrations (0000 table creation, 0001 auth FK + CHECK constraint) applied in a single `npx drizzle-kit migrate` invocation since drizzle-kit applies all pending journal entries in sequence."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: ~10min (this continuation session; schema+migration generation was done in prior session)
completed: 2026-06-15
---

# Phase 1 Plan 02: Drizzle Schema + Initial Migration Summary

**All 6 Phase 1 tables (restaurants, units, categories, products, product_availability, admin_users) plus admin_role enum defined in Drizzle and applied to live Supabase Postgres, with admin_users' auth.users FK and role/restaurant_id CHECK constraint added via a hand-written journaled migration.**

## Performance

- **Duration:** ~10 min (this session applied + verified migrations; schema and migration files were generated in a prior session)
- **Started:** 2026-06-15 (continuation session)
- **Completed:** 2026-06-15
- **Tasks:** 2 (Task 1 fully done in prior session; Task 2 completed this session)
- **Files modified:** 0 new (all files already committed; this session applied migrations to the live DB)

## Accomplishments
- `src/db/schema.ts` defines all 6 tables + `admin_role` enum with correct FKs, unique constraints, and FK-performance indexes, including the documented sparse `product_availability` convention (D-05/D-06)
- Initial migration (`0000_useful_krista_starr.sql`) applied to live Supabase Postgres — all 6 tables now exist
- Second hand-written, journaled migration (`0001_admin_users_auth_fk.sql`) applied — adds `admin_users_user_id_fkey` (FK to `auth.users(id)` ON DELETE CASCADE) and `admin_users_role_restaurant_chk` (CHECK constraint enforcing D-01's role/restaurant_id consistency)
- Live verification: `information_schema.tables` confirms all 6 tables present; `pg_constraint` confirms both `admin_users_user_id_fkey` and `admin_users_role_restaurant_chk` exist
- `npx tsc --noEmit` reports no errors — `src/db/index.ts` compiles cleanly against `src/db/schema.ts`
- Re-running `npx drizzle-kit migrate` is idempotent (only emits harmless NOTICE-level logs for drizzle's own internal `drizzle` schema/`__drizzle_migrations` table, no pending application migrations re-run)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define Drizzle schema for all 6 tables** - `a0479ac` (feat)
2. **Task 2: Generate and apply initial migration, add auth.users FK via raw SQL** - `d37e6de` (feat, migration files generated); live application + verification performed in this session (no new file changes, so no additional commit required)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/db/schema.ts` - Drizzle schema: `adminRoleEnum`, `restaurants`, `adminUsers`, `units`, `categories`, `products`, `productAvailability` with FKs, unique constraints, and indexes
- `src/db/migrations/0000_useful_krista_starr.sql` - Initial migration creating all 6 tables, `admin_role` enum, FKs, and indexes
- `src/db/migrations/0001_admin_users_auth_fk.sql` - Hand-written migration adding `admin_users_user_id_fkey` (FK to `auth.users(id)`) and `admin_users_role_restaurant_chk` (CHECK constraint)
- `src/db/migrations/meta/_journal.json`, `meta/0000_snapshot.json`, `meta/0001_snapshot.json` - drizzle-kit migration tracking metadata

## Decisions Made
- Confirmed `admin_users.userId` has no Drizzle-level FK to `auth.users` (Supabase GoTrue-managed schema, not modeled in Drizzle); the FK and CHECK constraint live exclusively in the hand-written migration 0001, registered via `drizzle-kit generate --custom` so `drizzle-kit migrate` tracks and applies it in sequence after 0000.
- `products.imageUrl`/`isFeatured` and `units.address`/`hours` included now as nullable/defaulted columns even though only required starting Phase 3, avoiding a later schema migration for columns whose shape was already known (per plan's interface note).

## Deviations from Plan

None - plan executed exactly as written. Both migrations (0000 and 0001) were applied in a single `npx drizzle-kit migrate` invocation, which is expected behavior (drizzle-kit applies all pending journal entries sequentially in one run).

## Issues Encountered
- The second `npx drizzle-kit migrate` run (idempotency check) printed Postgres NOTICE-level objects (`schema "drizzle" already exists, skipping` and `relation "__drizzle_migrations" already exists, skipping`) to stderr, which initially looked like errors. Confirmed these are harmless NOTICEs from drizzle-kit's own internal bookkeeping schema/table being set up idempotently — the run still ended with "✓ migrations applied successfully!" and no pending application migrations were re-applied.

## User Setup Required
None - migrations applied directly to the live Supabase Postgres instance using the `.env` `DATABASE_URL` (Session Mode, port 5432) already configured in plan 01-01.

## Next Phase Readiness
- All 6 tables exist in live Postgres with correct columns, FKs, unique constraints, and FK indexes — ready for plan 01-03 (RLS policies) to enable RLS and write policies against these exact tables/columns.
- `admin_users` has both the `auth.users` FK and the role/restaurant_id CHECK constraint (D-01) — plan 01-04 (auth/seed) can insert `admin_users` rows referencing real `auth.users` ids with the constraint enforced.
- RLS is intentionally NOT yet enabled on any table (`relrowsecurity` = false for all 6) — this is plan 01-03's responsibility, per this plan's verification notes.
- `src/db/index.ts` compiles cleanly against `src/db/schema.ts` — no blockers for Phase 1 wave 2/3 plans.

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Completed: 2026-06-15*

## Self-Check: PASSED

All claimed files exist (src/db/schema.ts, src/db/migrations/0000_useful_krista_starr.sql, src/db/migrations/0001_admin_users_auth_fk.sql, src/db/migrations/meta/_journal.json, meta/0000_snapshot.json, meta/0001_snapshot.json) and all claimed commits (a0479ac, d37e6de) found in git log. Live verification confirms all 6 tables and both admin_users constraints exist in Supabase Postgres.
