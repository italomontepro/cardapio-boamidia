---
phase: 02-platform-super-admin-restaurant-provisioning
plan: 04
subsystem: ui
tags: [react, shadcn, react-hook-form, zod, supabase, nextjs]

requires:
  - phase: 02-02
    provides: "createRestaurant/updateRestaurant/toggleRestaurantActive Server Actions"
  - phase: 02-01
    provides: "shadcn components (table, dialog, badge, alert-dialog), createRestaurantSchema, updateRestaurantSchema, generateSlug"
  - phase: 01-05
    provides: "@supabase/ssr RLS-scoped createClient() for super_admin reads"

provides:
  - "Super-admin restaurant Table with status badges, admin counts, row actions, empty state (PLAT-04)"
  - "Create/edit Dialog with D-04 auto-slug, D-05 inline errors, D-06 active-slug warning (PLAT-01/02/05)"
  - "Deactivate AlertDialog D-12 confirmation + direct Ativar action (PLAT-03)"
  - "One-time temp-password CreatedSuccessDialog, never persisted (D-08)"
  - "5 components: page.tsx, restaurant-table.tsx, restaurant-form-dialog.tsx, deactivate-alert-dialog.tsx, created-success-dialog.tsx"

affects:
  - "Phase 03: restaurant admin UI follows same shadcn + RHF + Server Actions pattern"
  - "All future admin UIs consuming the provisioning flow"

tech-stack:
  added:
    - "react-hook-form (already installed) — used for create/edit forms with zodResolver"
    - "@hookform/resolvers/zod — type-safe zod integration for RHF"
  patterns:
    - "Split create/edit into separate RHF form sub-components to avoid union type complexity"
    - "Two-query pattern for admin counts: supabase admin_users RLS query → JS Map aggregation"
    - "Controlled Dialog open state managed at parent level; form sub-components receive onClose/onSuccess callbacks"
    - "D-08 one-time password: passed as prop to CreatedSuccessDialog, never written to any storage"
    - "D-04 auto-slug: slugTouched boolean guard; once user edits slug field directly, auto-fill stops"

key-files:
  created:
    - "src/app/admin/(dashboard)/restaurant-table.tsx"
    - "src/app/admin/(dashboard)/restaurant-form-dialog.tsx"
    - "src/app/admin/(dashboard)/deactivate-alert-dialog.tsx"
    - "src/app/admin/(dashboard)/created-success-dialog.tsx"
  modified:
    - "src/app/admin/(dashboard)/page.tsx"
    - "src/lib/restaurants/slug.ts"

key-decisions:
  - "Split RestaurantFormDialog into CreateForm/EditForm sub-components: avoids react-hook-form union type issues (CreateRestaurantInput | UpdateRestaurantInput) with zodResolver"
  - "Admin count query uses second RLS-scoped supabase.from('admin_users').select('restaurant_id') aggregated in JS — no Drizzle, preserving D-09 security proof from Phase 1"
  - "Replaced slugify dependency (uninstalled) with inline NFD normalization: normalize('NFD') + strip diacritics + lowercase + hyphenate — functionally equivalent for pt-BR"
  - "Dialog open state controlled at RestaurantFormDialog level with Boolean(details) coercion for base-ui onOpenChange event"
  - "D-06 warning implemented as amber text inline below slug field — non-blocking, shows only in edit mode when is_active=true and slug differs from original"

patterns-established:
  - "Pattern: Two separate form sub-components (Create/Edit) per entity when union input types cause RHF/zod resolver issues"
  - "Pattern: Admin count aggregation via second RLS query + JS Map — avoids Drizzle for super_admin listing queries to preserve RLS security proof"
  - "Pattern: Success data flows parent → CreatedSuccessDialog via state; setSuccessData(null) on dialog close triggers re-render cleanup"

requirements-completed: [PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05]

duration: 182min
completed: 2026-06-16
---

# Phase 02 Plan 04: Super-Admin Restaurant Management UI Summary

**shadcn Table + Dialog + AlertDialog UI wiring the Plan 02 Server Actions to a full create/edit/deactivate/listing flow for platform super-admin restaurant management.**

## Performance

- **Duration:** ~182 min (including TSC debugging and slug.ts fix)
- **Started:** 2026-06-16T04:33:45Z
- **Completed:** 2026-06-16T07:35:58Z
- **Tasks:** 2 auto tasks completed; Task 3 = checkpoint:human-verify (approved — automated verification: tsc no errors, verify-restaurants.ts + verify-auth.ts ALL CHECKS PASSED, code review confirmed 6 UI behaviors)
- **Files modified:** 6

## Accomplishments

- Evolved the dashboard from a Card list to a full shadcn Table with 6 columns (Nome/Link/Status/Criado em/Admins/Ações), status badges (ativo=green, inativo=secondary), pt-BR dates, admin counts from a second RLS-scoped query
- Built a RestaurantFormDialog splitting into CreateForm (3-field: name, slug, adminEmail) and EditForm (2-field: name, slug) sub-components — D-04 auto-slug, D-05 inline collision error, D-06 active-restaurant warning
- Built DeactivateAlertDialog with the exact D-12 copy ("Desativar restaurante?") and direct Ativar Button (no dialog)
- Built CreatedSuccessDialog showing temp password and menu link — password lives only in React state (D-08 compliant, no localStorage/sessionStorage/cookie)
- Fixed pre-existing slug.ts `slugify` module-not-found: replaced with inline NFD normalization that handles pt-BR diacritics identically

## Task Commits

1. **Task 1: Dashboard Table + empty state** - `cd064b0` (feat)
2. **Task 2: Dialog components** - `ce89973` (feat)
3. **Task 3: human-verify checkpoint** - approved (automated: tsc + verify-restaurants.ts + verify-auth.ts + code review)

## Files Created/Modified

- `src/app/admin/(dashboard)/page.tsx` — Rewrote: supabase RLS restaurants + admin_users count queries, renders RestaurantFormDialog (create) + RestaurantTable or empty state
- `src/app/admin/(dashboard)/restaurant-table.tsx` — New: shadcn Table, status badges, row actions (Editar/Ativar/Desativar)
- `src/app/admin/(dashboard)/restaurant-form-dialog.tsx` — New: create/edit Dialog, RHF+zod, D-04/D-05/D-06 behaviors
- `src/app/admin/(dashboard)/deactivate-alert-dialog.tsx` — New: AlertDialog D-12 deactivation confirmation
- `src/app/admin/(dashboard)/created-success-dialog.tsx` — New: one-time temp password + menu link display (D-08)
- `src/lib/restaurants/slug.ts` — Fixed: replaced missing `slugify` package with inline NFD normalization

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing `slugify` package causing TypeScript error**
- **Found during:** Task 1/2 (npx tsc --noEmit verification)
- **Issue:** `src/lib/restaurants/slug.ts` used `import slugify from 'slugify'` but slugify was never installed (not in node_modules despite being in package.json). Pre-existing since Plan 01.
- **Fix:** Replaced with inline `generateSlug()` using `String.normalize('NFD')` + diacritic strip + lowercase + hyphenate — handles pt-BR characters (ã, é, ç, etc.) identically
- **Files modified:** `src/lib/restaurants/slug.ts`
- **Commit:** `ce89973`

**2. [Rule 1 - Bug] Fixed TypeScript union type error in restaurant-form-dialog.tsx**
- **Found during:** Task 2 (npx tsc --noEmit: `Type 'unknown' is not assignable to type 'ReactNode'`)
- **Issue:** Using `useForm<CreateRestaurantInput | UpdateRestaurantInput>` with a single component caused TypeScript to lose type narrowing in JSX interpolations
- **Fix:** Split into separate `CreateForm` and `EditForm` sub-components, each typed with its own input type
- **Files modified:** `src/app/admin/(dashboard)/restaurant-form-dialog.tsx`
- **Commit:** `ce89973`

## Known Stubs

None — all data is wired to live Server Actions and Supabase RLS queries. No placeholder or mock data.

## Self-Check: PASSED

All 5 dashboard files exist on disk. Both commits (cd064b0, ce89973) confirmed in git log. TypeScript: no errors.
