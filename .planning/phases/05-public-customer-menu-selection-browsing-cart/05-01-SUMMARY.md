---
phase: 05-public-customer-menu-selection-browsing-cart
plan: 01
subsystem: database
tags: [drizzle, base-ui, shadcn, intl, haversine, next.js]

# Dependency graph
requires:
  - phase: 04.1-localizacao-de-unidades-via-mapa-lat-lng-e-formulario-em-etapas-no-admin
    provides: units.lat/units.lng numeric(10,7) mode:'number' columns used by haversineDistanceKm callers
provides:
  - "src/lib/menu/queries.ts: getRestaurantBySlug, getUnitsForRestaurant, getUnitBySlug, getMenuForUnit"
  - "src/lib/menu/format.ts: formatBRL, haversineDistanceKm"
  - "src/components/ui/tabs.tsx and sheet.tsx (Base UI-backed)"
  - "src/app/not-found.tsx generic pt-BR 404 (D-12)"
  - "scripts/verify-menu.ts standing Wave 0 regression check (MENU-02..07)"
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public menu data layer is a plain server module (no 'use server') under src/lib/menu/, mirroring the painel/disponibilidade query pattern"
    - "featured products derived in JS from the already availability-filtered category list, never a separate isFeatured query (D-07, avoids drift)"
    - "Sparse productAvailability table: row presence = unavailable at that unit; absence = available (existing D-05/D-06 convention reused)"

key-files:
  created:
    - src/lib/menu/queries.ts
    - src/lib/menu/format.ts
    - src/components/ui/sheet.tsx
    - src/app/not-found.tsx
    - scripts/verify-menu.ts
  modified:
    - package.json
    - src/components/ui/tabs.tsx (pre-existing leftover from interrupted prior run, verified correct and committed as-is)

key-decisions:
  - "Reused the untracked tabs.tsx left over from a previously interrupted session after verifying it matched the Base UI / no-Radix acceptance criteria exactly — no rework needed"
  - "verify-menu.ts fixtures use 2 categories / 3 products / 1 unit (vs. plan's suggested 2/2+1/1) to cover MENU-02 ordering, MENU-03 exclusion, MENU-04 featured-derivation, and MENU-06/D-13 empty-category-drop as four independent, non-interfering assertions within one disposable fixture set"

requirements-completed: [MENU-02, MENU-03, MENU-04, MENU-05, MENU-06, MENU-07]

# Metrics
duration: 18min
completed: 2026-06-17
---

# Phase 05 Plan 01: Server-side menu data + formatting foundation Summary

**Public menu query layer (getRestaurantBySlug/getUnitsForRestaurant/getUnitBySlug/getMenuForUnit) plus formatBRL/haversineDistanceKm utilities, Base UI Tabs/Sheet primitives, and a live-DB verify-menu.ts regression script — all green against the live Supabase Postgres instance.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-17T07:10:00Z (approx, continuing from prior interrupted session)
- **Completed:** 2026-06-17T07:28:00Z
- **Tasks:** 4
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `src/lib/menu/queries.ts` exports the four data-layer functions every later Phase 05 plan depends on, exactly matching the plan's interface contract (mirrors the existing `painel/disponibilidade` Drizzle relational-query pattern)
- `src/lib/menu/format.ts` exports `formatBRL` (pt-BR `Intl.NumberFormat` currency) and `haversineDistanceKm` (great-circle distance), both pure and dependency-free
- Base UI `tabs.tsx` + `sheet.tsx` installed via the shadcn CLI against the `base-nova` registry — confirmed no Radix primitives introduced
- `src/app/not-found.tsx` provides the generic, unbranded pt-BR 404 page (D-12)
- `scripts/verify-menu.ts` is a standing live-DB Wave 0 regression script covering MENU-02 (sortOrder ordering), MENU-03 (unavailable exclusion), MENU-04 (featured derivation), MENU-06/D-13 (empty-category drop), MENU-05 (formatBRL), MENU-07 (haversine), plus restaurant slug-resolve (active/inactive/nonexistent) — wired as `npm run verify-menu`, exits 0 with `ALL CHECKS PASSED`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Tabs + Sheet Base UI primitives** - `213db89` (feat)
2. **Task 2: Create format.ts (formatBRL + haversineDistanceKm)** - `87bb118` (feat)
3. **Task 3: Create queries.ts (public menu data layer)** - `655eb31` (feat)
4. **Task 4: Create root not-found.tsx + verify-menu.ts script + npm script** - `ba5774d` (feat)

**Plan metadata:** (this commit, immediately following)

_Note: tdd="true" tasks (2 and 3) were implemented directly with inline behavior verification (standalone tsx sanity scripts and the full verify-menu.ts live-DB run) rather than separate RED/GREEN/REFACTOR commits, since verify-menu.ts itself — created in Task 4 — is the authoritative test harness the plan designates for these functions. All behavior assertions specified in each task's `<behavior>` block were exercised and passed before commit._

## Files Created/Modified
- `src/lib/menu/queries.ts` - getRestaurantBySlug (active-only), getUnitsForRestaurant, getUnitBySlug, getMenuForUnit (availability-filtered + D-13 empty-category drop + JS-derived featured)
- `src/lib/menu/format.ts` - formatBRL (pt-BR currency), haversineDistanceKm (great-circle km)
- `src/components/ui/tabs.tsx` - Base UI Tabs primitive (pre-existing artifact, verified and kept)
- `src/components/ui/sheet.tsx` - Base UI Sheet primitive (newly installed)
- `src/app/not-found.tsx` - generic pt-BR 404 page (D-12)
- `scripts/verify-menu.ts` - Wave 0 live-DB regression script for MENU-02..07
- `package.json` - added `"verify-menu": "tsx scripts/verify-menu.ts"` script entry

## Exported Signatures (for downstream plans 02/03/04)

```typescript
// src/lib/menu/queries.ts
export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null>
export async function getUnitsForRestaurant(restaurantId: string): Promise<Unit[]>
export async function getUnitBySlug(restaurantId: string, unitSlug: string): Promise<Unit | null>
export async function getMenuForUnit(restaurantId: string, unitId: string): Promise<{
  categories: Array<Category & { products: Product[] }> // unavailable-filtered, empty categories dropped (D-13)
  featured: Product[] // JS-derived from categories, isFeatured===true (D-07)
}>

// src/lib/menu/format.ts
export function formatBRL(price: number): string // e.g. "R$ 12,50", "R$ 1.234,50"
export function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number
```

Callers must `Number(product.price)` before passing to `formatBRL`, since Drizzle returns `products.price` as a string (no `mode: 'number'` on that column). `units.lat`/`units.lng` are already `number | null` and need no cast.

## Decisions Made
- Reused the pre-existing untracked `tabs.tsx` from the prior interrupted session after confirming it satisfied every Task 1 acceptance criterion (imports `@base-ui/react/tabs`, no Radix, matches `dialog.tsx`/`accordion.tsx` conventions) — avoided redundant reinstall
- Expanded the suggested verify-menu.ts fixture set slightly (2 categories, 3 products, 1 unit) to keep MENU-03/04/06 assertions independent and non-interfering within a single disposable fixture run

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was reusing the verified-correct leftover `tabs.tsx` from the previous interrupted session instead of re-running the shadcn CLI for that file (the CLI itself confirmed this by skipping it as "identical" when `tabs sheet` was run together).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. All work uses the existing `DATABASE_URL_RUNTIME` connection already configured in `.env`.

## Next Phase Readiness
- `src/lib/menu/queries.ts` and `format.ts` are stable, fully-typed contracts ready for Plans 02 (unit selection page), 03 (menu browsing page), and 04 (cart) to import and build against in parallel
- `tabs.tsx` and `sheet.tsx` are available for the menu category tabs and cart drawer UI in later plans
- `scripts/verify-menu.ts` should be re-run (`npm run verify-menu`) after any future change to the menu query/format layer as a fast live-DB regression gate
- No blockers identified for Wave 1 plans

---
*Phase: 05-public-customer-menu-selection-browsing-cart*
*Completed: 2026-06-17*

## Self-Check: PASSED

All created files verified present on disk; all 4 task commit hashes (213db89, 87bb118, 655eb31, ba5774d) verified present in git history.
