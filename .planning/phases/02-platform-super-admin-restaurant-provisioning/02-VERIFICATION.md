---
phase: 02-platform-super-admin-restaurant-provisioning
verified: 2026-06-16T08:00:00Z
status: human_needed
score: 24/24 automated must-haves verified
human_verification:
  - test: "D-06 slug-edit warning appears when editing active restaurant"
    expected: "When editing an active restaurant and changing the slug, amber warning text 'Atenção: ao alterar o link, o endereço antigo (/r/...) deixará de funcionar.' appears inline below the slug field before saving"
    why_human: "Conditional JSX render based on user interaction; cannot assert from tsx script"
  - test: "D-12 AlertDialog confirmation prevents accidental deactivation"
    expected: "Clicking 'Desativar' opens the AlertDialog; clicking 'Cancelar' leaves is_active=true; clicking 'Desativar' confirm button flips it to false"
    why_human: "Modal interaction flow; not exercisable from tsx integration script"
  - test: "D-08 one-time temp password displayed and copy button works"
    expected: "After creating a restaurant, the CreatedSuccessDialog shows the temp password under 'Senha temporária (copie agora — não será mostrada novamente)' and the copy-to-clipboard button copies it"
    why_human: "navigator.clipboard API requires browser context; display of one-time password requires live UI"
  - test: "End-to-end create flow: provisioned admin can log in with temp password"
    expected: "Log in as new restaurant admin using the temp password shown in the success dialog; reaches /painel; deactivate that restaurant; re-login attempt is denied with 'Este restaurante está desativado. Contate o administrador da plataforma.'"
    why_human: "Full browser session flow with copy-paste; requires manual execution"
---

# Phase 02: Platform Super-Admin Restaurant Provisioning — Verification Report

**Phase Goal:** The platform super-admin can fully manage the roster of restaurant tenants, including provisioning each restaurant's first admin user.
**Verified:** 2026-06-16T08:00:00Z
**Status:** human_needed (all automated checks passed; 4 UI behaviors require human verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Super admin can create a new restaurant with a unique name and slug | VERIFIED | `createRestaurant()` in actions.ts; `PLAT-01 PASS` in verify-restaurants.ts |
| 2 | Super admin can edit an existing restaurant's details | VERIFIED | `updateRestaurant()` in actions.ts; `PLAT-02 PASS` in verify-restaurants.ts |
| 3 | Super admin can activate or deactivate a restaurant | VERIFIED | `toggleRestaurantActive()` in actions.ts; `PLAT-03 PASS` in verify-restaurants.ts |
| 4 | Super admin can see a list of all restaurants on the platform | VERIFIED | `page.tsx` renders `RestaurantTable` with RLS-scoped query; 6 columns confirmed |
| 5 | When a restaurant is created, its first admin user is provisioned and can log in scoped to that restaurant | VERIFIED | `PLAT-05 PASS` — `signInWithPassword` with temp password succeeds; admin_users row has correct restaurantId |

**Score:** 5/5 ROADMAP truths verified

---

## Plan 01 Must-Haves

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | generateSlug('Pizzaria do João') returns 'pizzaria-do-joao' | VERIFIED | `npx tsx -e` test confirms return value; uses inline NFD normalization (slugify replaced — see note) |
| 2 | shadcn table, dialog, badge, alert-dialog components exist in src/components/ui/ | VERIFIED | All 4 files present; table.tsx contains TableHeader; dialog.tsx, badge.tsx, alert-dialog.tsx all present |
| 3 | createAdminClient() returns a service_role Supabase client usable in Server Actions | VERIFIED | src/lib/supabase/admin.ts exports createAdminClient; uses SUPABASE_SECRET_KEY; conditional ws shim added for Node compatibility |
| 4 | createRestaurantSchema validates name, slug, adminEmail and rejects invalid input | VERIFIED | src/lib/restaurants/schema.ts lines 5-18; adminEmail field present; updateRestaurantSchema excludes adminEmail per D-10 |
| 5 | scripts/verify-restaurants.ts runs without crashing | VERIFIED | Exits 0; prints `SMOKE PASS: restaurants table reachable, 3 rows` |

**Note on slugify:** The Plan 01 must-have says "slugify is installed." `slugify` appears in `package.json` but is NOT present in `node_modules`. During Plan 04 execution, a pre-existing `Module not found: slugify` TypeScript error was discovered and fixed by replacing the import with an inline NFD normalization function. The functional behavior (generateSlug produces correct PT-BR slugs) is fully preserved. The slugify package.json entry is a stale artifact — it can be removed in a future cleanup. This is a deviation, not a blocker.

### Required Artifacts (Plan 01)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase/admin.ts` | service_role admin client factory | VERIFIED | contains `createAdminClient`, `SUPABASE_SECRET_KEY`; 960B |
| `src/lib/restaurants/slug.ts` | PT-BR slug generation | VERIFIED | exports `generateSlug`, uses NFD normalization (not slugify) |
| `src/lib/restaurants/schema.ts` | zod schemas for create/edit | VERIFIED | exports `createRestaurantSchema`, `updateRestaurantSchema`, `CreateRestaurantInput`, `UpdateRestaurantInput`; 1.1K |
| `scripts/verify-restaurants.ts` | integration test scaffold | VERIFIED | contains `config({ path: envFile })`, dynamic imports, 7 TODO markers replaced with real assertions |
| `src/components/ui/table.tsx` | shadcn Table primitives | VERIFIED | contains `TableHeader`; 2.3K |
| `src/components/ui/dialog.tsx` | shadcn Dialog | VERIFIED | present; 4.0K |
| `src/components/ui/badge.tsx` | shadcn Badge | VERIFIED | present; 1.9K |
| `src/components/ui/alert-dialog.tsx` | shadcn AlertDialog | VERIFIED | contains `AlertDialogAction`; 5.1K |

### Key Link Verification (Plan 01)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/supabase/admin.ts` | `process.env.SUPABASE_SECRET_KEY` | createClient secret key arg | VERIFIED | line 15: `process.env.SUPABASE_SECRET_KEY!` |

---

## Plan 02 Must-Haves

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | createRestaurant() creates restaurants row + auth.users row + admin_users row, returns temp password | VERIFIED | `PLAT-01 PASS` + `PLAT-05 PASS` in verify-restaurants.ts; signInWithPassword confirms auth user creation |
| 2 | Duplicate slug returns D-05 error, no duplicate row created | VERIFIED | `PLAT-01 D-05 PASS` in verify-restaurants.ts |
| 3 | updateRestaurant() persists name/slug changes | VERIFIED | `PLAT-02 PASS` in verify-restaurants.ts |
| 4 | toggleRestaurantActive() flips restaurants.is_active | VERIFIED | `PLAT-03 PASS` in verify-restaurants.ts (false→true confirmed) |
| 5 | Partial failure leaves no orphaned auth.users row | VERIFIED | `D-07 ROLLBACK PASS` in verify-restaurants.ts |

### Required Artifacts (Plan 02)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/restaurants/actions.ts` | 3 Server Actions (min 80 lines) | VERIFIED | 209 lines; exports createRestaurant, updateRestaurant, toggleRestaurantActive; `'use server'` on line 1 |
| `scripts/verify-restaurants.ts` | PLAT-01..05 + D-07 assertions | VERIFIED | all 7 TODO markers replaced; no `TODO(02-02)` markers remain; signInWithPassword present |

### Key Link Verification (Plan 02)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `actions.ts` | `supabaseAdmin.auth.admin.createUser` | createAdminClient | VERIFIED | line 90: `supabaseAdmin.auth.admin.createUser(...)` with `email_confirm: true` |
| `actions.ts` | `db.transaction` | Drizzle transaction wrapping Postgres writes | VERIFIED | line 85: `db.transaction(async (tx) => { ... })` |
| `actions.ts` | `supabaseAdmin.auth.admin.deleteUser` | compensation/rollback path | VERIFIED | line 126: `supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)` |

### Data-Flow Trace (Plan 02 — tempPassword never persisted)

| Check | Result | Status |
|-------|--------|--------|
| tempPassword appears in db.insert/db.update calls | Not found | VERIFIED (D-08 compliant) |
| tempPassword in any console.log | Not found | VERIFIED |
| tempPassword returned in success response once | line 118: `tempPassword,` | VERIFIED — returned to caller only |

---

## Plan 03 Must-Haves

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A restaurant_admin whose restaurant has is_active=false is denied login with clear PT-BR message | VERIFIED (automated) | `D-11 PASS` in verify-auth.ts; `restaurant_inactive` key in ERROR_MESSAGES; login page line 16 |
| 2 | A super_admin can always log in regardless of any restaurant's is_active state | VERIFIED | `D-11 PASS: super_admin unaffected` in verify-auth.ts; gate wrapped in `if (adminRow.role === 'restaurant_admin')` |
| 3 | An active restaurant_admin continues to log in normally | VERIFIED | `AUTH-02 PASS` still green after Plan 03 changes |

### Required Artifacts (Plan 03)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth/actions.ts` | login() with D-11 is_active gate | VERIFIED | contains `select('role, restaurant_id')`, `from('restaurants')`, `select('is_active')`, `redirect('.../restaurant_inactive')` |
| `src/app/admin/login/page.tsx` | restaurant_inactive error message | VERIFIED | ERROR_MESSAGES contains `restaurant_inactive: 'Este restaurante está desativado. Contate o administrador da plataforma.'` |
| `scripts/verify-auth.ts` | D-11 login-gate assertions | VERIFIED | contains `D-11 PASS` assertions; hamburgueria-central restored to is_active=true after each run |

### Key Link Verification (Plan 03)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/auth/actions.ts` | `restaurants.is_active` | supabase SSR query for restaurant_admin | VERIFIED | line 35-36: `.from('restaurants').select('is_active')` inside `if (adminRow.role === 'restaurant_admin')` |
| `src/app/admin/login/page.tsx` | `login()` redirect error=restaurant_inactive | ERROR_MESSAGES map | VERIFIED | line 16: `restaurant_inactive: 'Este restaurante está desativado...'` |

---

## Plan 04 Must-Haves

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Super admin sees table with columns Nome, Link, Status, Criado em, Admins, Ações | VERIFIED | restaurant-table.tsx lines 50-55 contain all 6 headers |
| 2 | Status shows green 'ativo' badge or gray 'inativo' badge per is_active | VERIFIED | lines 65,69: `bg-green-100 text-green-800` badge for ativo; `variant="secondary"` badge for inativo |
| 3 | "Novo Restaurante" opens Dialog with name, slug (auto-filled), and admin email fields | VERIFIED (code) | restaurant-form-dialog.tsx: `Novo Restaurante` trigger button; `Nome do restaurante`, `Link (slug)`, `E-mail do administrador do restaurante` fields; `slugTouched` guard for auto-fill |
| 4 | Submitting create calls createRestaurant and shows menu link + one-time temp password | VERIFIED (code) | onSubmit calls `createRestaurant(data)`; on success opens CreatedSuccessDialog with tempPassword |
| 5 | Editing shows same Dialog in edit mode; changing slug of active restaurant shows D-06 warning | VERIFIED (code) / NEEDS HUMAN (interaction) | code: `deixará de funcionar` warning text present; conditional render logic verified; human test needed for actual UX |
| 6 | "Desativar" opens AlertDialog confirmation; "Ativar" is a direct action | VERIFIED (code) / NEEDS HUMAN (interaction) | AlertDialog present with correct copy; direct `toggleRestaurantActive(id, true)` for Ativar; human test needed for modal flow |
| 7 | Empty state shows 'Nenhum restaurante cadastrado' | VERIFIED | page.tsx line 50: `Nenhum restaurante cadastrado` |

### Required Artifacts (Plan 04)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/admin/(dashboard)/page.tsx` | restaurant listing with admin count, renders RestaurantTable | VERIFIED | imports RestaurantTable; two RLS-scoped queries (restaurants + admin_users); adminCount computed in JS Map; no Drizzle import |
| `src/app/admin/(dashboard)/restaurant-table.tsx` | client Table with row actions | VERIFIED | `'use client'` line 1; imports Table, DeactivateAlertDialog, toggleRestaurantActive; all 6 headers; ativo/inativo badges |
| `src/app/admin/(dashboard)/restaurant-form-dialog.tsx` | create/edit Dialog form | VERIFIED | `'use client'` line 1; imports createRestaurant, updateRestaurant, generateSlug, Dialog; slugTouched auto-fill guard; D-06 warning text |
| `src/app/admin/(dashboard)/deactivate-alert-dialog.tsx` | AlertDialog deactivate confirmation | VERIFIED | `'use client'`; AlertDialog with "Desativar restaurante?", "Cancelar", "Desativar" (destructive); calls toggleRestaurantActive |
| `src/app/admin/(dashboard)/created-success-dialog.tsx` | one-time temp-password + link display | VERIFIED | "Restaurante criado com sucesso"; "Senha temporária (copie agora — não será mostrada novamente)"; navigator.clipboard; no localStorage/sessionStorage/cookie |

### Key Link Verification (Plan 04)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `restaurant-form-dialog.tsx` | `createRestaurant / updateRestaurant` | import from @/lib/restaurants/actions | VERIFIED | line 7: `import { createRestaurant, updateRestaurant }` |
| `deactivate-alert-dialog.tsx` | `toggleRestaurantActive` | import from @/lib/restaurants/actions | VERIFIED | line 5: `import { toggleRestaurantActive }` |
| `page.tsx` | restaurants + admin_users count | @supabase/ssr RLS-scoped query | VERIFIED | lines 12 and 20: `from('restaurants')` and `from('admin_users')`; no `from '@/db'` import |

### Data-Flow Trace (Plan 04 — admin count rendering)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `restaurant-table.tsx` | `restaurant.adminCount` | `adminCounts.get(r.id) ?? 0` in page.tsx | Yes — aggregated from live `admin_users` RLS query | FLOWING |
| `restaurant-table.tsx` | `restaurant.isActive` | `r.is_active` from Supabase restaurants query | Yes — live DB value | FLOWING |
| `page.tsx` → `RestaurantTable` | `restaurants` prop | `(restaurants ?? []).map(...)` | Yes — live RLS query; empty array only if DB returns no rows | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| createRestaurant creates row + auth user + admin user, returns temp password | `npx tsx scripts/verify-restaurants.ts` | PLAT-01 PASS, PLAT-05 PASS | PASS |
| Duplicate slug returns D-05 error, no new row | (same script) | PLAT-01 D-05 PASS | PASS |
| updateRestaurant persists name change | (same script) | PLAT-02 PASS | PASS |
| toggleRestaurantActive flips is_active | (same script) | PLAT-03 PASS | PASS |
| D-07 rollback: no orphaned auth user after failure | (same script) | D-07 ROLLBACK PASS | PASS |
| D-11 gate: inactive restaurant_admin denied | `npx tsx scripts/verify-auth.ts` | D-11 PASS (both assertions) | PASS |
| TypeScript: no type errors across all modified files | `npx tsc --noEmit` | TypeScript: No errors found | PASS |

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| PLAT-01 | 02-01, 02-02, 02-04 | Super admin can create a new restaurant with unique name and slug | SATISFIED | createRestaurant() verified; PLAT-01 PASS in integration test; create Dialog wired |
| PLAT-02 | 02-01, 02-02, 02-04 | Super admin can edit an existing restaurant's details | SATISFIED | updateRestaurant() verified; PLAT-02 PASS in integration test; edit Dialog wired |
| PLAT-03 | 02-01, 02-02, 02-03, 02-04 | Super admin can activate or deactivate a restaurant (and deactivation blocks login) | SATISFIED | toggleRestaurantActive() verified; PLAT-03 PASS; D-11 gate verified in verify-auth.ts |
| PLAT-04 | 02-01, 02-04 | Super admin can see a list of all restaurants | SATISFIED | RestaurantTable with 6 columns, status badges, admin counts, empty state |
| PLAT-05 | 02-01, 02-02, 02-04 | First admin user provisioned on restaurant creation; can log in | SATISFIED | PLAT-05 PASS — signInWithPassword succeeds with temp password; admin_users row created |

All 5 PLAT requirements satisfied. REQUIREMENTS.md marks all 5 as "Complete."

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `package.json` | `slugify` in dependencies but NOT installed in node_modules | Info | No runtime impact — slug.ts uses inline NFD normalization instead; all slug generation works correctly. Stale entry. |

No blockers. No implementation stubs. No hardcoded empty data in rendering paths. No temp password persistence.

---

## Human Verification Required

### 1. D-06 Slug-Edit Warning (Active Restaurant)

**Test:** Run `npm run dev`. Log in as super@boamidia.dev. Click "Editar" on an active restaurant. Change the slug field. Look for the warning text below the slug input.
**Expected:** Amber text "Atenção: ao alterar o link, o endereço antigo (/r/{old-slug}) deixará de funcionar." appears inline without blocking the form.
**Why human:** Conditional JSX render triggered by controlled input change — requires browser interaction to verify rendering.

### 2. D-12 AlertDialog Confirmation Flow

**Test:** Click "Desativar" on any active restaurant. Verify modal appears. Click "Cancelar." Verify restaurant remains active. Click "Desativar" again. Click "Desativar" in the dialog. Verify status badge flips to gray "inativo."
**Expected:** AlertDialog with title "Desativar restaurante?", body "O admin deste restaurante não conseguirá mais fazer login...", "Cancelar" aborts, "Desativar" confirm deactivates.
**Why human:** Modal interaction flow; cannot simulate browser dialog interaction from tsx script.

### 3. D-08 One-Time Temp Password Display and Copy

**Test:** Create a new restaurant via "Novo Restaurante." On success, verify the CreatedSuccessDialog appears with the temp password visible and a copy-to-clipboard button. Click copy. Close the dialog. Verify the restaurant appears in the table with Admins = 1.
**Expected:** Password shown under "Senha temporária (copie agora — não será mostrada novamente)"; copy button works; dialog closes cleanly; table updates.
**Why human:** navigator.clipboard requires browser context; one-time display cannot be replicated in script.

### 4. End-to-End Create + Provisioned Admin Login + Deactivation Denial

**Test:** Note the temp password from the success dialog (step 3). Log out. Log in as the new restaurant admin with that temp password. Verify redirect to /painel. Log out. Back in super admin, deactivate that restaurant. Log in as the restaurant admin again.
**Expected:** New admin reaches /painel on first login. After deactivation, login attempt returns "Este restaurante está desativado. Contate o administrador da plataforma."
**Why human:** Full browser session flow combining D-08 (temp password copy), D-11 (login gate), and the /painel redirect.

---

## Gaps Summary

No automated gaps found. All 24 automated must-haves verified. The only items requiring human validation are UI interaction behaviors (D-06 warning, D-12 modal flow, D-08 clipboard, end-to-end provisioned admin login) that cannot be asserted from tsx integration scripts by design.

The phase goal — "the platform super-admin can fully manage the roster of restaurant tenants, including provisioning each restaurant's first admin user" — is achieved at the data layer and component level. Human verification of the 4 UI interaction behaviors will confirm the goal is complete end-to-end.

---

_Verified: 2026-06-16T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
