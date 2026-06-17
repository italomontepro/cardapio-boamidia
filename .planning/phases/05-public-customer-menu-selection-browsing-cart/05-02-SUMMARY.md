---
phase: 05-public-customer-menu-selection-browsing-cart
plan: 02
subsystem: ui
tags: [next.js, server-component, client-component, geolocation, haversine, localstorage]

# Dependency graph
requires:
  - phase: 05-public-customer-menu-selection-browsing-cart
    provides: "Plan 01: getRestaurantBySlug/getUnitsForRestaurant from src/lib/menu/queries.ts, haversineDistanceKm from src/lib/menu/format.ts"
provides:
  - "src/app/r/[restaurantSlug]/page.tsx: Server Component resolving restaurant slug, branching 404 / empty-state / auto-redirect / picker"
  - "src/app/r/[restaurantSlug]/unit-picker.tsx: Client Component with geolocation nearest-first sort and per-restaurant last-unit memory"
  - "localStorage key convention boamidia:lastUnit:<restaurantSlug> for last-visited-unit memory"
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public route branch logic (404/empty/redirect/render) lives entirely in the async Server Component; the Client Component receives only plain serializable props (units array, restaurantSlug, restaurantName)"
    - "Geolocation-based re-sort renders the unsorted list immediately on mount, then re-sorts in place via setState once getCurrentPosition resolves — never blocks initial render"
    - "localStorage writes for last-visited-unit are scoped per restaurant with the boamidia:lastUnit:<restaurantSlug> key prefix, reusable by future revisit-redirect features"

key-files:
  created:
    - "src/app/r/[restaurantSlug]/page.tsx"
    - "src/app/r/[restaurantSlug]/unit-picker.tsx"
  modified: []

key-decisions:
  - "Used next/link with an onClick handler (not router.push) for the localStorage write on card selection — simpler, preserves native prefetch/navigation behavior, and the write completes synchronously before navigation in practice"
  - "Null-safe distance sort treats any unit missing lat/lng as Infinity distance, so it sorts to the end without ever doing null arithmetic, per the interface contract from Plan 01"

requirements-completed: [MENU-01, MENU-06, MENU-07]

# Metrics
duration: 12min
completed: 2026-06-17
---

# Phase 05 Plan 02: Unit-selection entry point (/r/[restaurantSlug]) Summary

**Server Component branch logic (404/empty/auto-redirect/picker) plus an iFood-style Client Component picker with geolocation nearest-first sort and per-restaurant last-unit localStorage memory.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-17T16:09:00Z
- **Completed:** 2026-06-17T16:21:00Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `src/app/r/[restaurantSlug]/page.tsx` resolves the restaurant by slug (active-only via Plan 01's `getRestaurantBySlug`), 404s on invalid/inactive slugs (D-12), shows a graceful empty state for 0-unit restaurants (MENU-06, not a 404), auto-redirects when exactly 1 unit exists (D-02), and renders the picker for 2+ units (D-01)
- `src/app/r/[restaurantSlug]/unit-picker.tsx` renders the unsorted card list immediately, requests browser geolocation on mount, and re-sorts nearest-first via `haversineDistanceKm` when permission is granted (D-03/MENU-07), with units missing lat/lng sorted to the end via an `Infinity` distance guard
- Geolocation denial/unavailable/timeout falls back silently to the original unsorted list — no error banner (D-03)
- Card tap writes `boamidia:lastUnit:<restaurantSlug>` to localStorage before navigating to `/r/[restaurantSlug]/[unitSlug]` (D-04), establishing a reusable convention for a future revisit-redirect feature

## Task Commits

Each task was committed atomically:

1. **Task 1: Restaurant page Server Component (branch logic)** - `5b7124e` (feat)
2. **Task 2: UnitPicker Client Component (geolocation + sort + last-unit)** - `5651975` (feat)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified
- `src/app/r/[restaurantSlug]/page.tsx` - async Server Component; `await params`, `notFound()` on missing/inactive restaurant, 0-units empty state, 1-unit redirect, 2+-units renders `UnitPicker`
- `src/app/r/[restaurantSlug]/unit-picker.tsx` - `'use client'` component; geolocation-on-mount nearest-first re-sort via `haversineDistanceKm`, null-safe distance guard, responsive card grid (name/address/hours), `boamidia:lastUnit:` localStorage write on card selection

## Decisions Made
- Used `next/link`'s `onClick` handler (rather than `router.push`) to write the localStorage last-unit key — keeps native Next.js Link prefetch/navigation semantics intact while still recording the selection synchronously before route transition
- Distance-sort guard follows the exact `a.lat != null && a.lng != null ? haversineDistanceKm(...) : Infinity` pattern specified in the plan so units without coordinates never crash sort comparisons and always rank last

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `localStorage` key convention `boamidia:lastUnit:<restaurantSlug>` is established and documented here for reuse by any future revisit-redirect feature (not in this phase's scope, but the key format is now stable)
- Manual geolocation permission click-through (grant → re-sort order changes; deny → list stays unsorted with no error UI) still needs to be exercised in a real browser at the phase gate — this cannot be verified by `tsc`/`verify-menu` alone since it requires actual browser Geolocation API behavior
- `npm run verify-menu` re-run green after this plan (no server-side regressions to the Plan 01 query/format layer)
- Redirect target string (`/r/${restaurantSlug}/${unit.slug}`) is correct now; the destination route itself (`/r/[restaurantSlug]/[unitSlug]`) is delivered by Plan 03/04 in this same wave

---
*Phase: 05-public-customer-menu-selection-browsing-cart*
*Completed: 2026-06-17*

## Self-Check: PASSED

All created files verified present on disk (`src/app/r/[restaurantSlug]/page.tsx`, `src/app/r/[restaurantSlug]/unit-picker.tsx`); both task commit hashes (5b7124e, 5651975) verified present in git history.
