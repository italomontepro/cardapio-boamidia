---
phase: 04-per-unit-availability-management
plan: 02
subsystem: availability-management
tags: [availability, server-action, optimistic-ui, drizzle, sparse-table]
dependency_graph:
  requires: [04-01, 03-03, 03-02]
  provides: [CTLG-07, toggleAvailability, /painel/disponibilidade]
  affects: [public-menu-availability]
tech_stack:
  added: []
  patterns: [sparse-exclusion-table, useOptimistic, startTransition, innerJoin-tenant-scope]
key_files:
  created:
    - src/app/painel/disponibilidade/actions.ts
    - src/app/painel/disponibilidade/page.tsx
    - src/app/painel/disponibilidade/availability-matrix.tsx
    - src/app/painel/disponibilidade/availability-mobile.tsx
  modified: []
decisions:
  - "base-ui Select onValueChange passes string|null (not string); wrapped handler with ?? '' to preserve controlled string state"
metrics:
  duration: 15
  completed_date: "2026-06-16"
  tasks: 3
  files: 4
---

# Phase 04 Plan 02: Availability Management UI Summary

**One-liner:** Per-unit availability matrix using sparse-exclusion INSERT/DELETE semantics with React 19 useOptimistic toggles on desktop table + mobile unit-selector views.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | toggleAvailability Server Action | 11b78bc | actions.ts |
| 2 | disponibilidade page.tsx Server Component | c5476f6 | page.tsx |
| 3 | AvailabilityMatrix + AvailabilityMobile | b484608 | availability-matrix.tsx, availability-mobile.tsx |

## What Was Built

The complete `/painel/disponibilidade` feature for CTLG-07:

1. **`actions.ts`** — `toggleAvailability` Server Action. Sparse-exclusion semantics: `available=false` → `INSERT ... onConflictDoNothing()`, `available=true` → `DELETE WHERE productId AND unitId`. Guards tenant ownership via `getCurrentAdmin()` + products.restaurantId check. Returns `{ success, error? }`.

2. **`page.tsx`** — Server Component with 3 Drizzle queries: units (sorted by name), categories+products (nested with), and unavailableRows via `innerJoin(products)` to scope by restaurantId (product_availability has no restaurantId column). Builds `unavailableKeys: string[]` as serializable `productId:unitId` pairs. Handles empty states for no-units and no-products. Renders both view components.

3. **`availability-matrix.tsx`** — Desktop sticky-header table (`hidden md:block`). Products as rows grouped by category headers, units as columns, `AvailabilitySwitch` at each cell. Also exports `AvailabilitySwitch` (shared with mobile). Switch uses `useOptimistic(checked)` + `startTransition` for instant feedback.

4. **`availability-mobile.tsx`** — Mobile view (`block md:hidden`). base-ui `Select` to choose a unit, then product list per category with thumbnail, price, "Indisponível" badge when off, and `AvailabilitySwitch` per product.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Select onValueChange null type mismatch**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** base-ui `Select.Root.onValueChange` passes `string | null`, incompatible with `Dispatch<SetStateAction<string>>`
- **Fix:** Wrapped handler: `(value) => setSelectedUnitId(value ?? '')`
- **Files modified:** availability-mobile.tsx
- **Commit:** b484608

## Known Stubs

None. All data is wired from live DB queries.

## Self-Check: PASSED

- src/app/painel/disponibilidade/actions.ts — FOUND
- src/app/painel/disponibilidade/page.tsx — FOUND
- src/app/painel/disponibilidade/availability-matrix.tsx — FOUND
- src/app/painel/disponibilidade/availability-mobile.tsx — FOUND
- Commits 11b78bc, c5476f6, b484608 — FOUND
- npx tsc --noEmit — PASS
- npm run verify-availability — ALL CHECKS PASSED (6/6)
