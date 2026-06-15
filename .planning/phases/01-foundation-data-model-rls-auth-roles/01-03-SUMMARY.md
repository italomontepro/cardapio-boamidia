---
phase: 01-foundation-data-model-rls-auth-roles
plan: 03
subsystem: database
tags: [postgres, rls, supabase, drizzle, security, multi-tenant]

# Dependency graph
requires:
  - phase: 01-foundation-data-model-rls-auth-roles
    provides: "Drizzle schema for restaurants, units, categories, products, product_availability, admin_users (plan 01-02)"
provides:
  - "RLS enabled on all 6 tables (admin_users, restaurants, units, categories, products, product_availability)"
  - "is_super_admin() and current_admin_restaurant_id() SECURITY DEFINER/LANGUAGE plpgsql helper functions"
  - "Tenant-isolation policies enforcing is_super_admin() OR restaurant_id = current_admin_restaurant_id() (direct FK or via products join for product_availability)"
  - "Verified default-deny: anon/unauthenticated queries against all 6 tables return empty arrays"
affects: [01-04-auth-seed-users, 01-05-login-pages, all-future-phases-touching-tenant-data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS helper functions use LANGUAGE plpgsql (not sql) + SECURITY DEFINER + STABLE + SET search_path = public to avoid query inlining and infinite recursion against admin_users"
    - "Tenant-scoped tables use FOR ALL policies with both USING and WITH CHECK clauses following is_super_admin() OR restaurant_id = current_admin_restaurant_id()"
    - "product_availability (no direct restaurant_id) resolves tenant scope via EXISTS subquery joining products"

key-files:
  created:
    - src/db/migrations/0002_rls_policies.sql
    - src/db/migrations/meta/0002_snapshot.json
  modified:
    - src/db/migrations/meta/_journal.json

key-decisions:
  - "Used drizzle-kit generate --custom to scaffold a journaled raw-SQL migration file rather than letting drizzle-kit attempt to generate RLS DDL from the schema (Drizzle's schema DSL doesn't model RLS policies)"
  - "Verified default-deny via raw REST API curl with anon key instead of supabase-js client, because @supabase/realtime-js requires native WebSocket support unavailable on Node 20 without the optional 'ws' dependency"

requirements-completed: [AUTH-03]

# Metrics
duration: 12min
completed: 2026-06-15
---

# Phase 1 Plan 3: RLS Policies Foundation Summary

**Row Level Security enabled on all 6 tables via raw SQL migration with plpgsql SECURITY DEFINER helper functions (is_super_admin, current_admin_restaurant_id), enforcing tenant isolation for AUTH-03**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-15T20:40:00Z
- **Completed:** 2026-06-15T20:52:26Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Scaffolded and wrote `src/db/migrations/0002_rls_policies.sql` containing two `LANGUAGE plpgsql SECURITY DEFINER STABLE` helper functions (`is_super_admin()`, `current_admin_restaurant_id()`) and 7 `CREATE POLICY` statements covering all 6 tables
- Applied the migration to the live Supabase Postgres instance via `drizzle-kit migrate`
- Verified live: all 6 tables (`admin_users`, `categories`, `product_availability`, `products`, `restaurants`, `units`) show `relrowsecurity = true` in `pg_class`
- Verified live: both helper functions are registered as `prosecdef = true` and `lanname = 'plpgsql'` in `pg_proc`/`pg_language`
- Verified live: anon-key REST queries against all 6 tables return `[]` (empty array, no error, no recursion) — default-deny confirmed for unauthenticated access

## Task Commits

Each task was committed atomically:

1. **Task 1: Write and apply RLS policy migration (helper functions + ENABLE RLS + CREATE POLICY for all 6 tables)** - `4320c8e` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/db/migrations/0002_rls_policies.sql` - Raw SQL: helper functions `is_super_admin()`/`current_admin_restaurant_id()` (plpgsql, security definer, stable), `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements for admin_users, restaurants, units, categories, products, product_availability
- `src/db/migrations/meta/0002_snapshot.json` - drizzle-kit schema snapshot generated for migration 0002
- `src/db/migrations/meta/_journal.json` - Added journal entry for `0002_rls_policies`

## Decisions Made
- **Custom journaled migration via `drizzle-kit generate --custom`**: Drizzle's schema DSL has no representation for RLS policies/functions, so this migration is hand-written raw SQL registered through the standard drizzle migration journal (consistent with the 0001 pattern from plan 01-02).
- **Verification approach for default-deny used raw REST/curl, not supabase-js**: `@supabase/supabase-js` 2.108.x's bundled `@supabase/realtime-js` throws at client construction on Node 20 without the optional `ws` package (`Node.js 20 detected without native WebSocket support`). Rather than add a new dependency for a one-off verification script (out of scope for this plan), the same REST endpoint (`/rest/v1/<table>?select=*` with `apikey`/`Authorization: Bearer <anon key>` headers) that `supabase-js` calls under the hood was queried directly via `curl`. Result is identical and equally authoritative: `[]` for all 6 tables.
- **node_modules was missing in this worktree** (gitignored, not shared across worktrees) — ran `npm install` before any drizzle-kit/tsx commands, consistent with the env_setup instructions for `.env`.

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was the verification *method* for the default-deny check (curl instead of supabase-js client), driven by a Node 20 / `ws` dependency limitation unrelated to the RLS migration itself — the SQL migration content and all other verification steps match the plan's `<interfaces>` block exactly.

## Issues Encountered
- `npx tsx -e "...createClient..."` failed with `Error: Node.js 20 detected without native WebSocket support` when instantiating the supabase-js client (realtime-js subsystem). Resolved by querying the equivalent REST endpoint directly via `curl` with the anon key — same result (`[]`), no functional impact on the RLS migration or its verification.

## User Setup Required
None - no external service configuration required. The migration was applied directly to the existing live Supabase Postgres instance using credentials already present in `.env`.

## Next Phase Readiness
- RLS is fully enabled and verified on all 6 tables; tenant isolation is enforced at the database layer per AUTH-03.
- Plan 01-04 can now seed `admin_users` rows (super_admin and restaurant_admin) — the helper functions will correctly resolve roles/restaurant scoping once rows exist.
- Plan 01-05 (login pages) can rely on this RLS layer for the "RLS-scoped data view" success criterion (D-09) — no admin users exist yet, so authenticated end-to-end verification is deferred to 01-05 as planned.
- No blockers identified.

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Completed: 2026-06-15*

## Self-Check: PASSED

- FOUND: src/db/migrations/0002_rls_policies.sql
- FOUND: src/db/migrations/meta/0002_snapshot.json
- FOUND: 4320c8e (commit)
