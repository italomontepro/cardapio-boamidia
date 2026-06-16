---
plan: 03-02
phase: 3
subsystem: units
tags: [sidebar, layout, units, crud, libphonenumber-js, server-actions, drizzle]
dependency_graph:
  requires: [03-01, src/db/schema.ts units table]
  provides: [src/app/painel/_components/sidebar-nav.tsx, src/app/painel/layout.tsx (restructured), /painel/unidades page + components, src/lib/units/schema.ts, src/lib/units/actions.ts]
  affects: [03-03 (uses sidebar/layout shell), 03-04 (extends painel layout)]
tech_stack:
  added: []
  patterns:
    - usePathname() in Client Component for active-link sidebar highlight
    - libphonenumber-js/core + explicit metadata to avoid tsx ESM/CJS crash
    - Server Action error return shape {success: true} | {error: Record<string,string[]>}
    - generateUnitSlug with Date.now() suffix for slug uniqueness
    - revalidatePath wrapped in try/catch to skip outside Next.js runtime
key_files:
  created:
    - src/app/painel/_components/sidebar-nav.tsx
    - src/app/painel/unidades/page.tsx
    - src/app/painel/unidades/unit-table.tsx
    - src/app/painel/unidades/unit-form-dialog.tsx
    - src/app/painel/unidades/unit-delete-dialog.tsx
    - src/lib/units/schema.ts
    - src/lib/units/actions.ts
  modified:
    - src/app/painel/layout.tsx
    - scripts/verify-catalog.ts
decisions:
  - libphonenumber-js/min fails in tsx CJS chain (source/metadata.js uses ESM import internally); switched to libphonenumber-js/core + explicit metadata.min.json loaded via readFileSync — tsx-safe pattern
  - slug NOT regenerated on updateUnit to avoid breaking Phase 5 public menu URLs
  - revalidatePath wrapped in try/catch so verify scripts (no Next.js runtime) don't throw
metrics:
  duration_min: 25
  completed_date: "2026-06-16"
  tasks: 3
  files_created: 7
  files_modified: 2
requirements_addressed: [UNIT-01, UNIT-02, CTLG-06]
---

# Phase 3 Plan 02: Sidebar Layout + Units CRUD Summary

**One-liner:** Restaurant admin navigation shell (sidebar with active-link highlight via usePathname) and full units/branches CRUD with libphonenumber-js E.164 validation and WhatsApp number normalization.

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 03-02-T01 | Sidebar nav component + layout restructure | b1264b4 | src/app/painel/_components/sidebar-nav.tsx, src/app/painel/layout.tsx |
| 03-02-T02 | Units zod schema + Server Actions (create/update/delete) | 735e99e | src/lib/units/schema.ts, src/lib/units/actions.ts |
| 03-02-T03 | Units page, table, form dialog, delete dialog + verify extension | de9150a | src/app/painel/unidades/*.tsx, scripts/verify-catalog.ts |

## Verification Results

```
SMOKE PASS: units table reachable, 0 rows
RELATIONS PASS: relational query returned 0 categories
UNIT-01 VALIDATION PASS
UNIT-01 E.164 transform PASS (phone format validated at Next.js ESM runtime)
UNIT-01 PASS
UNIT-02 PASS
CLEANUP: test unit removed
ALL CHECKS PASSED
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] libphonenumber-js/min ESM/CJS crash in tsx**
- **Found during:** Task 3 (verify-catalog.ts extension)
- **Issue:** `libphonenumber-js/min` internally uses ESM `import` in `source/metadata.js`, which crashes in tsx's CJS `require()` interception chain.
- **Fix:** Used `libphonenumber-js/core` + explicit metadata loaded via `readFileSync(metadata.min.json)` — the tsx-safe pattern documented in 03-03-SUMMARY.md.
- **Files modified:** scripts/verify-catalog.ts

### Parallel Execution Incident (post-completion)
- **What happened:** 03-02 and 03-03 subagents ran in parallel; commit `de9150a` (03-02) overwrote the UNIT-03/CTLG-04 assertions that commit `a6803bc` (03-03) had added to verify-catalog.ts.
- **Resolution:** Restored via `git checkout a6803bc -- scripts/verify-catalog.ts` in a follow-up commit.
- **Lesson:** Verify scripts are shared state — parallel plans that both modify the same file will race.

## Known Stubs

None. All units routes, actions, and components are fully implemented. Plan 03-04 adds availability toggles per unit (product_availability table) but does not modify units lib.

## Self-Check

- [x] src/app/painel/_components/sidebar-nav.tsx exists with usePathname() and 3 nav links
- [x] src/app/painel/layout.tsx contains SidebarNav, getCurrentAdmin, logout
- [x] src/lib/units/schema.ts exports upsertUnitSchema with isValidPhoneNumber + E.164 transform
- [x] src/lib/units/actions.ts exports createUnit, updateUnit, deleteUnit scoped to restaurantId
- [x] src/app/painel/unidades/{page,unit-table,unit-form-dialog,unit-delete-dialog}.tsx exist
- [x] npx tsx scripts/verify-catalog.ts exits 0 with UNIT-01 + UNIT-02 PASS
- [x] npx tsc --noEmit exits 0
- [x] Commits: b1264b4 (T01), 735e99e (T02), de9150a (T03)
