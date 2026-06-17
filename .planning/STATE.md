---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 context gathered
last_updated: "2026-06-17T00:39:13.028Z"
last_activity: 2026-06-16
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** Um cliente final consegue acessar o link de um restaurante, escolher a unidade, montar um pedido pelo cardápio e enviá-lo via WhatsApp direto para aquela unidade.
**Current focus:** Phase 03 — restaurant-admin-units-catalog-photos

## Current Position

Phase: 03 (restaurant-admin-units-catalog-photos) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-06-16

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation-data-model-rls-auth-roles P01 | 35 | 3 tasks | 16 files |
| Phase 01 P03 | 12 | 1 tasks | 3 files |
| Phase 01 P04 | 13 | 2 tasks | 7 files |
| Phase 01 P05 | 18 | 4 tasks | 9 files |
| Phase 02 P01 | 12 | 3 tasks | 9 files |
| Phase 02-platform-super-admin-restaurant-provisioning P03 | 5 | 2 tasks | 3 files |
| Phase 02-platform-super-admin-restaurant-provisioning P02 | 5 | 2 tasks | 3 files |
| Phase 02-platform-super-admin-restaurant-provisioning P04 | 182 | 2 tasks | 6 files |
| Phase 03 P03-04 | 25 | 2 tasks | 7 files |
| Phase 04-per-unit-availability-management P01 | 5 | 2 tasks | 6 files |
| Phase 04 P02 | 15 | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 1 must establish RLS and tenant-isolation correctly from the first migration — highest-cost-to-fix-later item per research.
- [Roadmap]: Per-unit availability (CTLG-07) isolated into its own Phase 4, after units/catalog exist (Phase 3), to focus query-correctness work.
- [Roadmap]: WhatsApp message generation isolated into its own final phase (Phase 6) for dedicated encoding/device-testing focus.
- [Phase 01-foundation-data-model-rls-auth-roles]: Supabase project provisioned via dashboard; DATABASE_URL=Session pooler(5432) for drizzle-kit, DATABASE_URL_RUNTIME=Transaction pooler(6543, prepare:false) for app runtime per D-11
- [Phase 01-foundation-data-model-rls-auth-roles P02]: All 6 tables (restaurants, units, categories, products, product_availability, admin_users) + admin_role enum defined in src/db/schema.ts and applied to live Supabase Postgres; admin_users.user_id FK to auth.users(id) and role/restaurant_id CHECK constraint added via hand-written journaled migration 0001
- [Phase 01-foundation-data-model-rls-auth-roles P03]: RLS enabled on all 6 tables via raw SQL migration 0002_rls_policies.sql; is_super_admin() and current_admin_restaurant_id() helper functions are SECURITY DEFINER/LANGUAGE plpgsql (avoids recursion pitfall); default-deny verified live via anon REST queries returning [] for all tables
- [Phase 01-foundation-data-model-rls-auth-roles P04]: @supabase/ssr server/browser client factories + updateSession middleware protecting /admin and /painel implemented; scripts/seed.ts creates 1 super_admin + 2 restaurant_admins (2 distinct restaurants) via Admin API, verified live in Postgres (D-04); ws/@types/ws added as dev deps for Node 20 realtime client compatibility
- [Phase 01-foundation-data-model-rls-auth-roles P05]: login()/logout() Server Actions, getCurrentAdmin() session helper, /admin/login (single form, D-08), and role-scoped /admin (super_admin, all restaurants) + /painel (restaurant_admin, own restaurant) landing pages implemented relying entirely on RLS for tenant scoping (D-09); /admin dashboard moved into a (dashboard) route group to avoid a redirect loop with /admin/login; scripts/verify-auth.ts confirms AUTH-01/02/03 all PASS live, and all 6 tables remain RLS-enabled (D-03) -- Phase 1 complete
- [Phase 02-01]: createAdminClient() omits ws realtime shim — Next.js server runtime has native WebSocket; add shim only if runtime errors appear in Plan 02
- [Phase 02-01]: updateRestaurantSchema excludes adminEmail — admin provisioning is create-only per D-10, no multi-admin management in v1
- [Phase 02-01]: shadcn switch intentionally NOT installed — D-12 requires asymmetric UX: activate=Button, deactivate=Button+AlertDialog confirm
- [Phase 02-platform-super-admin-restaurant-provisioning]: D-11 gate runs only for restaurant_admin role; super_admin is structurally excluded (null restaurant_id and gate block never executes)
- [Phase 02-platform-super-admin-restaurant-provisioning]: verify-auth.ts replicates gate SELECT chain (not calling login()) to avoid redirect() throwing in Node.js script context
- [Phase 02-platform-super-admin-restaurant-provisioning]: createRestaurant uses db.transaction() wrapping both Postgres inserts with Auth API inside callback; single deleteUser compensation path on throw (Pattern 2 refined from RESEARCH)
- [Phase 02-platform-super-admin-restaurant-provisioning]: createAdminClient() gains conditional ws transport shim (typeof WebSocket === 'undefined') — plan explicitly flagged this fallback; needed when Server Actions are imported from tsx scripts on Node.js 20
- [Phase 02-platform-super-admin-restaurant-provisioning]: Split RestaurantFormDialog into CreateForm/EditForm sub-components to avoid react-hook-form union type issues with zodResolver
- [Phase 02-platform-super-admin-restaurant-provisioning]: Admin count query uses second RLS-scoped supabase admin_users query aggregated in JS — preserves D-09 security proof, no Drizzle in listing page
- [Phase 02-platform-super-admin-restaurant-provisioning]: Replaced slugify dependency (uninstalled) with inline NFD normalization in slug.ts — handles pt-BR characters identically without external package
- [Phase 03]: Zod 4 price transform uses .transform().refine() instead of .pipe(z.coerce.number()) — ZodCoercedNumber input type unknown is incompatible with .pipe() string requirement
- [Phase 03]: base-ui Accordion uses 'multiple' prop (not type='multiple' like Radix UI) — AccordionItem value prop, AccordionRoot defaultValue array
- [Phase 04-per-unit-availability-management]: shadcn Switch/Select/Tooltip installed via npx shadcn@latest add for availability UI Wave 1
- [Phase 04-per-unit-availability-management]: verify-availability.ts mirrors verify-catalog.ts pattern: dotenv walk-up + dynamic imports after config(); 6 CTLG-07 sparse-exclusion assertions pass live
- [Phase 04]: base-ui Select onValueChange passes string|null; wrapped with ?? '' in availability-mobile.tsx

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 1 planning]: Decide default availability rule for product/unit pairs with no explicit `product_availability` row (available vs. unavailable) — flagged by research as needing explicit decision before Phase 4.
- [Phase 1 planning]: Confirm `admin_users` single-table-with-role design (role + restaurant_id, server-side only, never client-writable).
- [Phase 1 planning]: Confirm ORM choice (Drizzle vs. raw supabase-js) for the schema/migrations.
- [Phase 3 planning]: Confirm whether "fotos" implies multi-photo galleries per product or a single `image_url` is sufficient for v1 (research recommends single column, additive `product_images` table later if needed).

## Session Continuity

Last session: 2026-06-17T00:39:13.019Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-public-customer-menu-selection-browsing-cart/05-CONTEXT.md
