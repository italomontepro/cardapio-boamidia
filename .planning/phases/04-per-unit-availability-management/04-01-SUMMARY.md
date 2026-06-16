---
phase: 04-per-unit-availability-management
plan: 01
subsystem: ui, database, testing
tags: [shadcn, switch, select, tooltip, sparse-table, availability, verify-script]

# Dependency graph
requires:
  - phase: 03-restaurant-admin-units-catalog-photos
    provides: units, categories, products tables + verify-catalog pattern
provides:
  - shadcn Switch, Select, Tooltip UI primitives in src/components/ui/
  - Disponibilidade nav link in painel sidebar
  - scripts/verify-availability.ts proving sparse-table INSERT/DELETE toggle semantics
  - npm run verify-availability script registered in package.json
affects:
  - 04-02-per-unit-availability-management (Wave 1 — uses all three primitives and verify script)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sparse-exclusion availability: row present in product_availability = product UNAVAILABLE at unit, row absent = AVAILABLE"
    - "Idempotent toggle via .onConflictDoNothing() for INSERT, plain DELETE for mark-available (no-error on non-existent row)"
    - "verify-*.ts scripts use dotenv walk-up + dynamic imports after config() to avoid DATABASE_URL_RUNTIME hoisting"

key-files:
  created:
    - src/components/ui/switch.tsx
    - src/components/ui/select.tsx
    - src/components/ui/tooltip.tsx
    - scripts/verify-availability.ts
  modified:
    - src/app/painel/_components/sidebar-nav.tsx
    - package.json

key-decisions:
  - "shadcn Switch/Select/Tooltip installed via npx shadcn@latest add — components owned by repo, consistent with Phase 2/3 pattern"
  - "verify-availability.ts mirrors verify-catalog.ts exactly: dotenv walk-up + dynamic imports after config(); this pattern is the canonical script structure for the project"

patterns-established:
  - "Pattern: sparse-exclusion availability — INSERT to mark unavailable, DELETE to mark available, absence = available default"
  - "Pattern: idempotent INSERT uses .onConflictDoNothing() against unique (product_id, unit_id) constraint"

requirements-completed: [CTLG-07]

# Metrics
duration: 5min
completed: 2026-06-16
---

# Phase 4 Plan 01: Wave 0 Foundation — shadcn primitives, Disponibilidade nav, verify-availability script

**Sparse-exclusion toggle semantics proven via 6 CTLG-07 assertions: INSERT=unavailable, DELETE=available, onConflictDoNothing idempotency, cross-unit isolation — all pass against live Supabase Postgres.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-16T18:00:00Z
- **Completed:** 2026-06-16T18:05:00Z
- **Tasks:** 2 completed
- **Files modified:** 6

## Accomplishments

- Installed shadcn Switch, Select, and Tooltip primitives (src/components/ui/), unblocking all Wave 1 availability UI work
- Added 4th sidebar nav link "Disponibilidade" pointing to /painel/disponibilidade
- Created scripts/verify-availability.ts (221 lines) with 6 CTLG-07 assertions proving sparse-table toggle semantics on live DB
- Registered `npm run verify-availability` in package.json; all assertions pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn switch/select/tooltip + add Disponibilidade nav link** - `83b2c34` (feat)
2. **Task 2: verify-availability.ts + npm script for CTLG-07 sparse-table semantics** - `7636503` (feat)

## Files Created/Modified

- `src/components/ui/switch.tsx` - shadcn Switch primitive (toggle UI for availability)
- `src/components/ui/select.tsx` - shadcn Select primitive (unit picker dropdown)
- `src/components/ui/tooltip.tsx` - shadcn Tooltip primitive (availability status hints)
- `src/app/painel/_components/sidebar-nav.tsx` - Added 4th navLinks entry for /painel/disponibilidade
- `scripts/verify-availability.ts` - 6 CTLG-07 integration assertions proving sparse-exclusion semantics
- `package.json` - Added "verify-availability" npm script

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/components/ui/switch.tsx` - EXISTS
- `src/components/ui/select.tsx` - EXISTS
- `src/components/ui/tooltip.tsx` - EXISTS
- `src/app/painel/_components/sidebar-nav.tsx` contains `/painel/disponibilidade` - CONFIRMED
- `scripts/verify-availability.ts` exists (221 lines, min_lines=60) - CONFIRMED
- `package.json` contains `verify-availability` - CONFIRMED
- `83b2c34` commit - EXISTS
- `7636503` commit - EXISTS
- `npm run verify-availability` exits 0 with all 6 PASS lines - CONFIRMED
