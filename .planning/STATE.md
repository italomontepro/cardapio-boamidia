---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 06-02-PLAN.md Tasks 1-2 (code-complete); Task 3 (real-device verification) explicitly deferred per user decision — see 06-HUMAN-UAT.md. Phase 6 code-complete, real-device UAT pending.
last_updated: "2026-06-18T06:35:07.781Z"
last_activity: 2026-06-18
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 25
  completed_plans: 25
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** Um cliente final consegue acessar o link de um restaurante, escolher a unidade, montar um pedido pelo cardápio e enviá-lo via WhatsApp direto para aquela unidade.
**Current focus:** Phase 06 — whatsapp-order-generation

## Current Position

Phase: 06
Plan: Not started
Status: Code-complete — phase-level verification will hit a human_needed gate (real-device UAT pending, see 06-HUMAN-UAT.md)
Last activity: 2026-06-18

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
| Phase 04.1 P01 | 12min | 2 tasks | 7 files |
| Phase 04.1 P02 | 4min | 2 tasks | 3 files |
| Phase 04.1 P03 | 6min | 2 tasks | 2 files |
| Phase 04.1 P04 | 9min | 3 tasks | 3 files |
| Phase 05 P01 | 18min | 4 tasks | 7 files |
| Phase 05-public-customer-menu-selection-browsing-cart P03 | 6min | 2 tasks | 2 files |
| Phase 05 P02 | 12min | 2 tasks | 2 files |
| Phase 05 P04 | 25min | 3 tasks | 5 files |
| Phase 06 P01 | 15min | 3 tasks | 7 files |
| Phase 06 P02 | 6min | 2 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: Localizacao de unidades via mapa - lat/lng e formulario em etapas no admin (URGENT) — Phase 5's "unidade mais próxima" feature depends on units having lat/lng, which Phase 3's original units CRUD did not include.

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
- [Phase 04.1-localizacao-de-unidades-via-mapa-lat-lng-e-formulario-em-etapas-no-admin]: P01: units.lat/units.lng added as nullable numeric(10,7) mode:'number' columns via migration 0003; leaflet/react-leaflet/@types/leaflet installed; scripts/verify-units-location.ts is the standing Wave 0 regression check for this phase, with geocode assertions skip-tolerant until Plan 02 creates src/lib/units/geocode.ts
- [Phase 04.1-localizacao-de-unidades-via-mapa-lat-lng-e-formulario-em-etapas-no-admin]: P02: upsertUnitSchema gained optional/nullable lat/lng (-90..90/-180..180); createUnit/updateUnit persist coordinates (null when omitted); src/lib/units/geocode.ts wraps Nominatim server-side with mandatory User-Agent; geocodeUnitAddress Server Action returns {lat,lng,displayName} or {error} for the Plan 03 map wizard
- [Phase 04.1-localizacao-de-unidades-via-mapa-lat-lng-e-formulario-em-etapas-no-admin]: P03: unit-location-map.tsx (real Leaflet MapContainer/draggable Marker/Recenter) and unit-location-map-loader.tsx (next/dynamic ssr:false) created exactly per plan; Plan 04 must import UnitLocationMap only from the loader file
- [Phase 04.1-localizacao-de-unidades-via-mapa-lat-lng-e-formulario-em-etapas-no-admin]: P04: unit-form-dialog.tsx rewritten as a 3-step wizard (Básico/Contato-Horário/Localização) inside one useForm+zodResolver instance, gated via form.trigger(STEP_FIELDS); Step 3 embeds UnitLocationMap with auto-geocode-once-on-entry (useRef guard) + manual Buscar search + draggable pin, Brazil-center fallback when no coords; unit-table.tsx shows a discreet 'Sem localização' outline badge when lat/lng is null — Phase 04.1 feature-complete
- [Phase 05-public-customer-menu-selection-browsing-cart]: P01: src/lib/menu/queries.ts (getRestaurantBySlug/getUnitsForRestaurant/getUnitBySlug/getMenuForUnit) and format.ts (formatBRL/haversineDistanceKm) established as the stable contract for Plans 02-04; featured products derived in JS from availability-filtered categories (D-07); scripts/verify-menu.ts is the standing Wave 0 live-DB regression check for MENU-02..07
- [Phase 05-public-customer-menu-selection-browsing-cart]: P03: cart-types.ts (CartItem) and cart-provider.tsx (CartProvider/useCart, Context+useReducer) implemented exactly per RESEARCH.md Pattern 3; mount-gated localStorage hydrate/persist keyed by cart:<restaurantId>:<unitId> (D-10) ensures per-unit isolation and no SSR hydration mismatch; ADD merges by productId (sums qty), SET_QTY with qty<=0 removes the line
- [Phase 05-public-customer-menu-selection-browsing-cart]: P02: src/app/r/[restaurantSlug]/page.tsx (Server Component, 404/empty/redirect/picker branch) and unit-picker.tsx (Client Component, geolocation nearest-first via haversineDistanceKm, boamidia:lastUnit:<restaurantSlug> localStorage convention) implement MENU-01/MENU-06/MENU-07 and D-01/D-02/D-03/D-04/D-12
- [Phase 05]: P04: menu-view.tsx (sticky unit header, Destaques strip outside Tabs, Base UI category Tabs) + product-dialog.tsx (qty stepper min 1, notes, Number(price)-converted ADD dispatch, key={product.id} remount instead of reset-effect) + cart-fab.tsx/cart-sheet.tsx (floating count button hidden when empty, bottom Sheet with inline SET_QTY/REMOVE and live subtotal) complete MENU-02..05/CART-01/02; Phase 5 feature-complete
- [Phase 06-whatsapp-order-generation]: P01: src/lib/menu/whatsapp.ts (buildOrderMessage/buildWhatsAppUrl pure functions + DeliveryType) and scripts/verify-whatsapp.ts (DB-free, 13 assertions) establish the stable contract for Plan 02's CartSheet footer wiring; address omitted from message body, encodeURIComponent used for encoding, CLEAR cart action added, sonner Toaster mounted without ThemeProvider
- [Phase 06]: 06-02: Task 3 (real-device WhatsApp verification) explicitly deferred per user decision — no seeded units in live DB blocks test URL construction; tracked as pending in 06-HUMAN-UAT.md, not marked passed

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- [Phase 1 planning]: Decide default availability rule for product/unit pairs with no explicit `product_availability` row (available vs. unavailable) — flagged by research as needing explicit decision before Phase 4.
- [Phase 1 planning]: Confirm `admin_users` single-table-with-role design (role + restaurant_id, server-side only, never client-writable).
- [Phase 1 planning]: Confirm ORM choice (Drizzle vs. raw supabase-js) for the schema/migrations.
- [Phase 3 planning]: Confirm whether "fotos" implies multi-photo galleries per product or a single `image_url` is sufficient for v1 (research recommends single column, additive `product_images` table later if needed).
- Phase 6 real-device WhatsApp verification (success criterion #4) is pending — no seeded units with whatsappNumber in live DB; see .planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260630-odg | Criar página link na bio estilo Linktree em /r/restaurantSlug/link | 2026-06-30 | 17195d5 | [260630-odg-criar-p-gina-link-na-bio-estilo-linktree](./quick/260630-odg-criar-p-gina-link-na-bio-estilo-linktree/) |

## Session Continuity

Last session: 2026-06-30 - Completed quick task 260630-odg: Criar página link na bio estilo Linktree
Stopped at: Completed 06-02-PLAN.md Tasks 1-2 (code-complete); Task 3 (real-device verification) explicitly deferred per user decision — see 06-HUMAN-UAT.md. Phase 6 code-complete, real-device UAT pending.
Resume file: None
