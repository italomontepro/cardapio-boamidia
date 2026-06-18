---
phase: 05-public-customer-menu-selection-browsing-cart
plan: 04
subsystem: ui
tags: [nextjs, react, base-ui, tailwind, cart, menu, server-components]

# Dependency graph
requires:
  - phase: 05-public-customer-menu-selection-browsing-cart plan 01
    provides: getRestaurantBySlug/getUnitBySlug/getMenuForUnit queries + formatBRL formatter
  - phase: 05-public-customer-menu-selection-browsing-cart plan 03
    provides: CartProvider/useCart (Context+useReducer) and CartItem type, per-unit localStorage key
provides:
  - Per-unit layout mounting a scoped CartProvider (cart:<restaurantId>:<unitId>), 404 on invalid restaurant/unit slugs
  - Menu Server Component (page.tsx) fetching availability-filtered categories+products and featured list
  - MenuView client component: sticky unit indicator, always-visible Destaques strip, category Tabs, product cards (pt-BR prices)
  - ProductDialog: photo, description, qty stepper (min 1), notes textarea, dispatches ADD to cart
  - CartFab: floating "Ver carrinho — N itens" button, hidden when cart empty
  - CartSheet: bottom sheet listing cart lines with inline +/- (SET_QTY) and remove (REMOVE), running subtotal
affects: [phase-06-whatsapp-order-handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Base UI Tabs/Dialog/Sheet components used as exported from src/components/ui (no Radix prop assumptions)"
    - "Single controlled dialog pattern: one ProductDialog instance driven by selected-product state instead of one Dialog per product card"
    - "key={product.id} remount trick to reset child component state on prop change, avoiding react-hooks/set-state-in-effect lint violations (same fix family as CartProvider hydration in 05-03)"

key-files:
  created:
    - src/app/r/[restaurantSlug]/[unitSlug]/menu-view.tsx
    - src/app/r/[restaurantSlug]/[unitSlug]/product-dialog.tsx
    - src/app/r/[restaurantSlug]/[unitSlug]/cart-fab.tsx
    - src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx
  modified: []

key-decisions:
  - "ProductDialog resets qty/notes via key={product.id} remount of an inner body component rather than a reset-on-change useEffect, avoiding the react-hooks/set-state-in-effect ESLint error (mirrors the fd13615 fix applied to CartProvider in plan 05-03)"
  - "Destaques strip rendered outside the Tabs tree (sibling, above) so featured products stay visible regardless of which category tab is selected"

patterns-established:
  - "Pattern: reset child-component-local state on a changing identity prop via React key remount, not useEffect+setState"

requirements-completed: [MENU-02, MENU-03, MENU-04, MENU-05, CART-01, CART-02]

# Metrics
duration: 25min
completed: 2026-06-17
---

# Phase 05 Plan 04: Unit Menu + Cart UI Summary

**Tabs/Destaques menu browsing with sticky unit indicator, a controlled product Dialog (qty + notes), and a bottom-sheet cart with inline +/-/remove editing, wired to the per-unit CartProvider from Plan 03.**

## Performance

- **Duration:** ~25 min (this session; Task 1 was completed in a prior session)
- **Started:** 2026-06-17 (this session, continuing from prior `988a90e`)
- **Completed:** 2026-06-17
- **Tasks:** 3/3 (Task 1 verified-complete from prior session, Tasks 2-3 executed this session)
- **Files modified:** 4 created (menu-view.tsx, product-dialog.tsx, cart-fab.tsx, cart-sheet.tsx) + 1 lint fix

## Accomplishments
- Full menu browsing UI: sticky "Você está em: {unit}" header, Destaques strip above category Tabs, per-category product grids with pt-BR prices (MENU-02/03/04/05)
- ProductDialog adds items to cart with quantity (min 1) and free-text notes, converting the NUMERIC `price` string to a number before it reaches CartItem (CART-01)
- CartFab + CartSheet give the customer a floating cart button (hidden when empty) and a bottom sheet with inline qty steppers, remove, and a live subtotal (CART-02, D-08/D-11)
- Confirmed via re-read that Task 1's `layout.tsx`/`page.tsx` (committed in a prior session as `988a90e`) correctly implement the CartProvider mount + notFound() gating + getMenuForUnit wiring exactly per plan — no rework needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Unit layout (CartProvider) + menu page Server Component** - `988a90e` (feat) — completed in prior session, verified correct, no changes needed
2. **Task 2: MenuView (Tabs + Destaques + sticky indicator) + ProductDialog** - `8375ff6` (feat)
3. **Task 3: CartFab (floating button) + CartSheet (bottom sheet, inline edit)** - `7e79360` (feat)
4. **Fix: ProductDialog setState-in-effect lint violation** - `927ba7c` (fix, Rule 1 auto-fix)

**Plan metadata:** (this commit) `docs(05-04): complete unit menu + cart UI plan`

## Files Created/Modified
- `src/app/r/[restaurantSlug]/[unitSlug]/menu-view.tsx` - Client component: sticky unit header, Destaques strip, Base UI Tabs per category, product cards (photo/placeholder, name, truncated description, formatBRL price, Destaque badge), single controlled ProductDialog instance
- `src/app/r/[restaurantSlug]/[unitSlug]/product-dialog.tsx` - Client component: Dialog with photo, title/description, qty stepper (− floor 1, +), notes Textarea, "Adicionar ao carrinho" dispatching `ADD` with `Number(product.price)`; inner body keyed by `product.id` for stateless-reset on product change
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-fab.tsx` - Client component: floating `Ver carrinho — N item(ns)` Button, `return null` when count is 0, opens CartSheet
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx` - Client component: bottom Sheet (`side="bottom"`) listing items with name/notes/line total, inline `SET_QTY` +/- steppers and `REMOVE` button, subtotal via `formatBRL`; explicitly no WhatsApp/send action (Phase 6 scope)
- `.planning/phases/05-public-customer-menu-selection-browsing-cart/deferred-items.md` - Logged a pre-existing, unrelated `tsc` error in `unit-location-map.tsx` (Phase 04.1) found while running the plan's verification command

## Decisions Made
- ProductDialog's qty/notes reset uses a `key={product.id}` remount of an inner `ProductDialogBody` component instead of a `useEffect` that calls `setQty`/`setNotes` on `product?.id` change — this avoids the `react-hooks/set-state-in-effect` ESLint rule (the same pattern previously applied to `cart-provider.tsx` hydration in Plan 03, commit `fd13615`). No architectural change; purely a cleaner way to express "reset local state when this prop's identity changes."
- Destaques strip is rendered as a sibling above the `<Tabs>` tree (not inside any `TabsContent`) so it remains visible no matter which category tab is active, per D-07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed react-hooks/set-state-in-effect lint error in ProductDialog**
- **Found during:** Task 2 verification (running `npx eslint` on the newly created files, in addition to the plan's specified `grep`/`tsc` checks)
- **Issue:** The initial `product-dialog.tsx` used `useEffect(() => { setQty(1); setNotes(''); }, [product?.id])` to reset stepper/notes state when a new product opened. This trips the `react-hooks/set-state-in-effect` ESLint rule (calling a state setter directly and unconditionally inside an effect is flagged as an anti-pattern; React recommends deriving/resetting state via key-based remounts instead).
- **Fix:** Extracted the dialog body into an inner `ProductDialogBody` component and rendered it with `key={product.id}` from the parent `ProductDialog`. Mounting a fresh instance per product id resets its local `qty`/`notes` state with no effect required.
- **Files modified:** `src/app/r/[restaurantSlug]/[unitSlug]/product-dialog.tsx`
- **Verification:** `npx eslint` reports 0 issues on all 4 plan files; `npx tsc --noEmit` shows no new errors; the plan's specified grep checks (`Number(product.price)`, `ADD`, `'use client'`) still pass.
- **Committed in:** `927ba7c`

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** No scope creep — the fix only changed how local component state resets internally; all plan-specified behavior (qty floor of 1, notes default empty string, dispatch shape) is unchanged.

## Issues Encountered
- The orchestrator's handoff note claimed `menu-view.tsx` and `product-dialog.tsx` already existed on disk as uncommitted files. On inspection (`find`/`ls` on the `[unitSlug]` directory), only `layout.tsx`, `page.tsx`, and `cart-provider.tsx` existed; the two files in question did not exist at all. Treated this as a stale/inaccurate handoff note and created both files fresh per the plan's Task 2 specification — no prior work was overwritten or lost.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MENU-02/03/04/05 and CART-01/02 are implemented and committed; D-05/D-06/D-07/D-08/D-09/D-11/D-12 are all present in the shipped code.
- `npx tsc --noEmit` is clean for everything in this plan's scope (3 remaining errors are pre-existing, unrelated to `unit-location-map.tsx` from Phase 04.1 — logged in `deferred-items.md`, not fixed here per the scope-boundary rule).
- `npm run verify-menu` passes all checks (MENU-02 through MENU-07 server-side).
- `npx next build` completes with 0 errors.
- **Manual click-through required before sign-off** (no client-side test harness in this project — see exact steps below). This is the natural verification step for `/gsd:verify-work`.

### Manual cart click-through steps (run during /gsd:verify-work)

1. `npm run dev`, open a restaurant's unit menu page, e.g. `/r/<restaurantSlug>/<unitSlug>`.
2. Confirm the sticky header reads "Você está em: {unit name}" and stays visible while scrolling.
3. If any product is `isFeatured`, confirm a "Destaques" strip renders above the category Tabs and stays visible when switching tabs.
4. Tap a product card → Dialog opens with photo (or "Sem foto" placeholder), name, description, price in `R$ 0,00` format.
5. Decrease qty below 1 → stepper floors at 1. Increase qty to 3. Type a note ("sem cebola"). Tap "Adicionar ao carrinho" → Dialog closes.
6. Confirm the floating "Ver carrinho — 3 itens" button appears at the bottom of the screen.
7. Tap the FAB → bottom Sheet opens showing the line item, its note, qty 3, and a subtotal matching `price × 3`.
8. Tap `+` → qty becomes 4, subtotal updates. Tap `−` three times → qty reaches 1, then 0 (line disappears once qty hits 0 per the SET_QTY reducer). Re-add the product, then tap "Remover" → line disappears immediately, FAB disappears (cart empty).
9. Add an item again, reload the page → cart contents persist (localStorage hydration), FAB shows the correct count immediately after hydration.
10. Switch to a different unit (or restaurant) URL with items still in the first unit's cart → confirm the new unit's cart is empty (per-unit isolation via the `cart:<restaurantId>:<unitId>` storage key from Plan 03).
11. Confirm the Sheet contains no WhatsApp/wa.me/"Enviar pedido" button — that is explicitly Phase 6 scope.

---
*Phase: 05-public-customer-menu-selection-browsing-cart*
*Completed: 2026-06-17*

## Self-Check: PASSED

All 7 claimed files found on disk; all 4 claimed commit hashes (`988a90e`, `8375ff6`, `7e79360`, `927ba7c`) found in git history.
