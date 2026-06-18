---
phase: 05-public-customer-menu-selection-browsing-cart
verified: 2026-06-18T04:25:23Z
status: passed
score: 6/6 success criteria verified (10/10 must-haves across 4 plans verified)
human_verification:
  - test: "Geolocation-based nearest-first unit sort"
    expected: "Granting browser location permission on /r/<restaurantSlug> re-sorts the unit cards nearest-first; denying/timing out leaves the original unsorted list with no error banner"
    why_human: "Requires real browser Geolocation API permission prompt and device GPS/network location — cannot be exercised by tsc/grep/live-DB script"
  - test: "Full cart click-through (add -> adjust -> remove -> reload -> switch-unit isolation)"
    expected: "Per 05-04-SUMMARY.md's 11-step manual script: Dialog opens, qty floors at 1, notes save, FAB shows correct count, Sheet +/- updates subtotal, qty 0 removes line, Remove button removes line, reload persists cart via localStorage, switching unit shows an isolated (empty) cart"
    why_human: "No client-side test harness/browser automation in this project; requires actual browser session with localStorage and multi-page navigation"
  - test: "Visual/UX check of mobile-first responsiveness and sticky header behavior while scrolling"
    expected: "Sticky 'Você está em: {unit}' header remains visible while scrolling the product grid on a real mobile viewport; Destaques strip horizontally scrolls smoothly; category Tabs bar horizontally scrolls when many categories are present"
    why_human: "Visual layout/scroll-feel cannot be verified via static analysis"
---

# Phase 5: Public Customer Menu — Selection, Browsing & Cart Verification Report

**Phase Goal:** A customer can open a restaurant's unique link, choose their unit, browse that unit's availability-filtered menu, and assemble a cart with quantities and notes — all on a fast, mobile-first, pt-BR formatted experience.
**Verified:** 2026-06-18T04:25:23Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Customer visiting the restaurant's link sees a unit-selection page showing each unit's name, address, and hours | VERIFIED | `src/app/r/[restaurantSlug]/page.tsx` resolves restaurant, branches to `UnitPicker` for 2+ units; `unit-picker.tsx` renders `CardTitle{unit.name}`, conditional `CardDescription{unit.address}`, conditional `Horário: {unit.hours}` |
| 2 | After picking a unit, customer sees the menu organized by category in admin-defined order, with name, description, photo, and price | VERIFIED | `getMenuForUnit` orders categories `[asc(categories.sortOrder)]` and products `[asc(products.sortOrder)]`; `menu-view.tsx`'s `ProductCard` renders `product.name`, `product.description`, `<Image src={product.imageUrl}>` (with "Sem foto" placeholder), `formatBRL(Number(product.price))`. Tabs render one tab per category in received order. |
| 3 | Only products available at the selected unit are shown, and featured products are visually highlighted | VERIFIED | `getMenuForUnit` filters `cat.products.filter((p) => !unavailableIds.has(p.id))` against the `productAvailability` sparse table, drops empty categories (D-13). `menu-view.tsx` renders a `Badge variant="secondary"` reading "Destaque" for `isFeatured` products, plus a dedicated horizontally-scrollable "Destaques" strip rendered as a sibling above `<Tabs>` so it's visible regardless of active tab. |
| 4 | Prices display in pt-BR currency format (R$) and the layout is responsive/mobile-first | VERIFIED | `formatBRL` uses `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`; live-DB script confirms `12,50` / `1.234,50` formatting. Layout uses Tailwind responsive utilities (`grid-cols-2 sm:grid-cols-3`, `sm:grid-cols-2`, `overflow-x-auto`, `fixed bottom-4`). |
| 5 | Empty states are handled gracefully (no units, category with no available products) | VERIFIED | 0-units branch in `page.tsx` (restaurant page) renders a pt-BR message instead of 404 (MENU-06). `getMenuForUnit` drops categories with 0 available products (D-13) so they never render; `menu-view.tsx` renders "Cardápio em breve." when the whole `categories` array is empty after filtering. |
| 6 | Customer can add products to a cart with quantities, add per-item notes, and adjust quantities or remove items afterward | VERIFIED | `product-dialog.tsx` dispatches `ADD` with `qty` (stepper, floor 1) and `notes` (Textarea); `cart-sheet.tsx` dispatches `SET_QTY` (+/− buttons, qty<=0 removes per reducer) and `REMOVE` (explicit "Remover" button); reducer in `cart-provider.tsx` implements all four actions correctly. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/menu/queries.ts` | getRestaurantBySlug, getUnitsForRestaurant, getUnitBySlug, getMenuForUnit | VERIFIED | All 4 exported, exact signatures match plan; isActive filter, sortOrder ordering, D-13 empty-category drop, JS-derived featured all present |
| `src/lib/menu/format.ts` | formatBRL, haversineDistanceKm | VERIFIED | Both exported, pure, pass live assertions (MENU-05, MENU-07) |
| `src/components/ui/tabs.tsx` | Base UI Tabs primitive | VERIFIED | Imports `@base-ui/react/tabs`, no Radix |
| `src/components/ui/sheet.tsx` | Base UI Sheet primitive | VERIFIED | Imports `@base-ui/react/dialog`, no Radix |
| `src/app/not-found.tsx` | Generic 404 (D-12) | VERIFIED | pt-BR copy, no branding |
| `scripts/verify-menu.ts` | Wave 0 live-DB regression | VERIFIED | `npm run verify-menu` exits 0, prints `ALL CHECKS PASSED`, covers MENU-02..07 + slug-resolve |
| `src/lib/menu/cart-types.ts` | CartItem type | VERIFIED | Exact shape `{productId, name, price:number, qty, notes}` |
| `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` | CartProvider + useCart | VERIFIED | 72 lines; reducer handles HYDRATE/ADD/SET_QTY/REMOVE; hydrate-then-persist gating via `hydratedRef` (functionally equivalent deviation from plan's `useState` boolean, same hydration-safety guarantee); no `useSyncExternalStore` |
| `src/app/r/[restaurantSlug]/page.tsx` | 404/empty/redirect/picker branch logic | VERIFIED | 39 lines (min 25); all 4 branches present |
| `src/app/r/[restaurantSlug]/unit-picker.tsx` | Geolocation sort + localStorage | VERIFIED | 92 lines (min 40); geolocation success/error callbacks, null-safe Infinity guard, `boamidia:lastUnit:` key |
| `src/app/r/[restaurantSlug]/[unitSlug]/layout.tsx` | CartProvider mount + 404 gate | VERIFIED | 20 lines (min 15); double notFound() gate (restaurant + unit), exact storageKey format |
| `src/app/r/[restaurantSlug]/[unitSlug]/page.tsx` | Menu Server Component | VERIFIED | 26 lines (min 20); getMenuForUnit + renders MenuView + CartFab |
| `src/app/r/[restaurantSlug]/[unitSlug]/menu-view.tsx` | Tabs/Destaques/sticky/cards | VERIFIED | 124 lines (min 60); all required UI elements present |
| `src/app/r/[restaurantSlug]/[unitSlug]/product-dialog.tsx` | Product Dialog with stepper+notes+add | VERIFIED | 113 lines (min 40); qty floor 1, Textarea, ADD dispatch with Number() conversion |
| `src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx` | Bottom sheet with inline edit | VERIFIED | 99 lines (min 40); SET_QTY/REMOVE dispatch, subtotal via formatBRL, no WhatsApp logic |
| `src/app/r/[restaurantSlug]/[unitSlug]/cart-fab.tsx` | Floating cart button | VERIFIED | 28 lines (min 15); count computed from items, hidden when 0, opens Sheet |

All 16 artifacts across the 4 plans: VERIFIED (exists, substantive, wired). No STUB or MISSING artifacts found.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `queries.ts` | `productAvailability` table | unavailable-id Set filter | WIRED | `db.select(...).from(productAvailability).where(eq(productAvailability.unitId, unitId))` then Set-based filter |
| `verify-menu.ts` | `queries.ts` / `format.ts` | dynamic import post-dotenv | WIRED | Confirmed dynamic imports present, script runs green against live DB |
| `r/[restaurantSlug]/page.tsx` | `queries.ts` | getRestaurantBySlug + getUnitsForRestaurant | WIRED | Both imported and called |
| `unit-picker.tsx` | `format.ts` | haversineDistanceKm | WIRED | Imported, used in sort comparator with null-safe Infinity guard |
| `r/[restaurantSlug]/page.tsx` | `next/navigation` | notFound() / redirect() | WIRED | Both imported and called on correct branches |
| `cart-provider.tsx` | `localStorage` | hydrate-gated read/write, key `cart:<restaurantId>:<unitId>` | WIRED | Hydrate effect runs first, persist effect gated behind `hydratedRef.current` |
| `[unitSlug]/layout.tsx` | `cart-provider.tsx` | CartProvider storageKey | WIRED | `storageKey={\`cart:${restaurant.id}:${unit.id}\`}` exact match to D-10 convention |
| `[unitSlug]/page.tsx` | `queries.ts` | getMenuForUnit + getUnitBySlug | WIRED | Both imported and called, results passed to MenuView |
| `product-dialog.tsx` | `cart-provider.tsx` | useCart().dispatch ADD | WIRED | `dispatch({ type: 'ADD', item: {...} })` with `Number(product.price)` conversion |
| `cart-sheet.tsx` | `format.ts` | formatBRL for line prices + subtotal | WIRED | Used for both per-line totals and subtotal row |

All 10 key links: WIRED. No NOT_WIRED or PARTIAL links found.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `unit-picker.tsx` | `units` prop | `getUnitsForRestaurant(restaurant.id)` in parent Server Component | Yes — real Drizzle query against `units` table, no static fallback | FLOWING |
| `menu-view.tsx` | `categories`/`featured` props | `getMenuForUnit(restaurant.id, unit.id)` in parent Server Component | Yes — real Drizzle relational query with live availability-filter join; live-DB `verify-menu.ts` exercises this exact path and asserts non-trivial results | FLOWING |
| `cart-sheet.tsx` / `cart-fab.tsx` | `state.items` | `useCart()` → `CartProvider`'s reducer state, hydrated from `localStorage` | Yes — reducer-backed, written to by real dispatch calls from `product-dialog.tsx`; not a hardcoded empty array at any call site | FLOWING |

No HOLLOW or DISCONNECTED artifacts found — all rendered data traces back to a real DB query or a real, dispatch-driven client state store.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server-side menu/format/availability logic against live DB | `npm run verify-menu` | `MENU slug-resolve PASS`, `MENU units PASS`, `MENU-02 PASS`, `MENU-03 PASS`, `MENU-04 PASS`, `MENU-06 PASS`, `MENU-05 PASS`, `MENU-07 PASS`, `ALL CHECKS PASSED` | PASS |
| Whole-app type safety | `npx tsc --noEmit` | No output (0 errors) | PASS |
| Production build of new routes | `npx next build` | Compiled successfully; `/r/[restaurantSlug]` and `/r/[restaurantSlug]/[unitSlug]` listed as dynamic (ƒ) routes, 0 build errors | PASS |

Client-side cart/geolocation UX behavior could not be spot-checked with a one-shot command (requires a running browser session) — routed to Human Verification below, per the SUMMARY's own documented manual click-through script.

### Requirements Coverage

| Requirement | Source Plan | Description (from ROADMAP success criteria) | Status | Evidence |
|-------------|-------------|------------------------------------------------|--------|----------|
| MENU-01 | 05-02 | Unit-selection entry point (card list / auto-redirect / picker) | SATISFIED | `r/[restaurantSlug]/page.tsx` + `unit-picker.tsx` |
| MENU-02 | 05-01, 05-04 | Menu organized by category in admin sortOrder | SATISFIED | `getMenuForUnit` ordering + Tabs rendering, live-DB MENU-02 PASS |
| MENU-03 | 05-01, 05-04 | Only available products shown | SATISFIED | productAvailability filter, live-DB MENU-03 PASS |
| MENU-04 | 05-01, 05-04 | Featured products highlighted | SATISFIED | Destaques strip + Badge, live-DB MENU-04 PASS |
| MENU-05 | 05-01, 05-04 | pt-BR price formatting | SATISFIED | `formatBRL`, live-DB MENU-05 PASS |
| MENU-06 | 05-02 | 0-units graceful empty state | SATISFIED | Empty-state branch in `r/[restaurantSlug]/page.tsx`, live-DB MENU-06 PASS |
| MENU-07 | 05-01, 05-02 | Geolocation nearest-first sort (Haversine) | SATISFIED | `haversineDistanceKm` + sort logic in `unit-picker.tsx`, live-DB MENU-07 PASS; real-browser permission flow needs human check |
| CART-01 | 05-03, 05-04 | Add to cart with quantity + notes | SATISFIED | `product-dialog.tsx` ADD dispatch with qty/notes |
| CART-02 | 05-03, 05-04 | Adjust quantity / remove items | SATISFIED | `cart-sheet.tsx` SET_QTY/REMOVE dispatch |
| CART-03 | 05-03 | Per-unit cart persistence/isolation | SATISFIED | `cart:<restaurantId>:<unitId>` storageKey + hydrate/persist gating; multi-unit isolation needs human click-through to fully exercise in-browser |

All 10 phase requirement IDs are accounted for and SATISFIED. No orphaned requirements found — REQUIREMENTS.md maps exactly MENU-01..07 and CART-01..03 to Phase 5, all "Complete", matching the plans' `requirements:` frontmatter exactly. CART-04/05/06 are correctly scoped to Phase 6 (not part of this phase).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | TODO/FIXME/placeholder/empty-implementation scan across `src/app/r/` and `src/lib/menu/` returned zero stub indicators. The single "placeholder" match in `product-dialog.tsx` is a legitimate HTML `placeholder=` attribute on a Textarea, not a stub. |

No blockers, no warnings. `deferred-items.md` documents one pre-existing, unrelated `tsc` error from Phase 04.1 (`unit-location-map.tsx`) that was correctly out-of-scope for this phase and is, as of this verification, no longer reproducible (`npx tsc --noEmit` is currently clean).

### Human Verification Required

### 1. Geolocation-based nearest-first unit sort

**Test:** Open `/r/<restaurantSlug>` for a restaurant with 2+ units that have lat/lng set. Grant the browser's location permission prompt.
**Expected:** The unit card list re-sorts to show the nearest unit first. Denying or ignoring the prompt leaves the original (name-ordered) list intact with no error banner shown.
**Why human:** Requires real browser Geolocation API permission UX and actual device/network location resolution — not exercisable via static analysis, tsc, or the live-DB script.

### 2. Full cart click-through

**Test:** Follow the 11-step manual script documented in `05-04-SUMMARY.md` ("Manual cart click-through steps"): open a unit menu, confirm sticky header + Destaques strip, open a product Dialog, set qty/notes, add to cart, open the FAB/Sheet, adjust quantity to 0 (line disappears), remove a line, reload (cart persists), switch unit (cart is isolated/empty).
**Expected:** Each step behaves exactly as described; no console errors; cart state survives reload via localStorage; switching restaurant/unit shows an independent empty cart.
**Why human:** No client-side test harness exists in this project; this flow requires a real browser session with persistent localStorage across page loads and multi-route navigation.

### 3. Mobile-first visual/scroll behavior

**Test:** View `/r/<restaurantSlug>/<unitSlug>` on a real mobile viewport (or responsive dev tools). Scroll the product grid and confirm the sticky unit-name header stays pinned. Scroll the Destaques strip and category Tabs bar horizontally.
**Expected:** Sticky header remains visible at all scroll positions; horizontal scroll areas are smooth and don't clip content; product cards/grid reflow correctly at mobile widths.
**Why human:** Visual layout fidelity and scroll feel cannot be verified by grep/tsc/build checks.

### Gaps Summary

No gaps found. All 6 roadmap success criteria are verified against actual, committed, substantive, and wired code — not placeholders. All 16 artifacts across the 4 plans exist, exceed their minimum line counts, and are genuinely connected (Server Component → query layer → Client Component → cart reducer → localStorage). The live-DB `verify-menu.ts` script independently confirms the server-side availability-filtering, ordering, featured-derivation, empty-category-drop, currency formatting, and Haversine distance logic against the real Supabase Postgres instance — this is strong evidence beyond static code reading. `npx tsc --noEmit` and `npx next build` are both clean for the whole app, including the two new dynamic routes. No anti-patterns, no orphaned requirements, no WhatsApp/wa.me logic leaked in from Phase 6's scope.

The only outstanding items are three human-verification checks for browser-only behaviors (geolocation permission UX, full localStorage-backed cart click-through, and mobile visual/scroll feel) that cannot be exercised by any automated tool in this environment — these do not block phase completion but should be spot-checked by a human before considering the customer-facing experience fully signed off.

---

*Verified: 2026-06-18T04:25:23Z*
*Verifier: Claude (gsd-verifier)*
