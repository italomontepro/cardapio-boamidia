---
phase: 05-public-customer-menu-selection-browsing-cart
plan: 03
subsystem: frontend-state
tags: [react-context, useReducer, localStorage, cart]

# Dependency graph
requires:
  - phase: 05-public-customer-menu-selection-browsing-cart
    plan: 01
    provides: "src/lib/menu/ module convention (plain server module pattern, no 'use server') that cart-types.ts as a plain types module follows"
provides:
  - "src/lib/menu/cart-types.ts: CartItem (single-sourced cart line item shape)"
  - "src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx: CartProvider + useCart()"
affects: [05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cart state lives in React Context + useReducer, scoped to the [restaurantSlug]/[unitSlug] route segment — no zustand/jotai (forbidden per CONTEXT.md)"
    - "localStorage hydrate happens only inside a useEffect after mount (never read in component body) to avoid SSR hydration mismatch"
    - "Persist-to-localStorage effect is gated behind a hydrated boolean flag so the initial empty reducer state never clobbers a previously saved cart before the hydrate read completes"
    - "Per-unit cart isolation achieved purely via the storageKey prop computed by the caller as cart:<restaurantId>:<unitId> (D-10) — the provider itself has no knowledge of slugs/routing"

key-files:
  created:
    - src/lib/menu/cart-types.ts
    - src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx

key-decisions:
  - "Replicated RESEARCH.md Pattern 3 verbatim (plan's own code block) rather than introducing any variation — keeps Plan 04's expected useCart()/dispatch contract exact"

requirements-completed: [CART-01, CART-02, CART-03]

# Metrics
duration: 6min
completed: 2026-06-17
---

# Phase 05 Plan 03: Cart state layer (CartProvider + useCart) Summary

**React Context + useReducer cart store scoped per restaurant/unit route segment, with mount-gated localStorage hydrate/persist under a `cart:<restaurantId>:<unitId>` key — zero new dependencies, ready for Plan 04's menu view, product dialog, and cart sheet to consume via `useCart()`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-17T16:15:00Z (approx)
- **Completed:** 2026-06-17T16:21:43Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments

- `src/lib/menu/cart-types.ts` exports the single-sourced `CartItem` type (`productId`, `name`, `price: number`, `qty`, `notes`) that both the provider and Plan 04's consumers import — `price` is documented as the already-`Number()`-converted value from `products.price` (a string column in Drizzle), so callers must convert before constructing a `CartItem`.
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` exports `CartProvider` and `useCart()`:
  - State shape: `{ items: CartItem[] }`, managed via `useReducer`.
  - Reducer actions: `ADD` (merges into an existing line by `productId`, summing `qty` and overwriting `notes` only if the new notes are truthy), `SET_QTY` (sets the line's `qty`; `qty <= 0` removes the line entirely — supports an inline stepper hitting zero in Plan 04), `REMOVE` (drops the line by `productId`), `HYDRATE` (replaces `items` wholesale, used only by the initial localStorage read).
  - Hydration order: a `useEffect` on mount reads `localStorage.getItem(storageKey)`, dispatches `HYDRATE` if present (silently ignoring JSON parse errors), then sets a `hydrated` boolean to `true`. A second `useEffect` writes `state.items` to `localStorage` on every change, but only when `hydrated` is `true` — this prevents the initial empty-array reducer state from overwriting a previously persisted cart before the hydrate read has had a chance to run.
  - No `localStorage` access happens in the component body (only inside effects), avoiding SSR/CSR hydration mismatches.
  - `useCart()` throws `Error('useCart must be used within CartProvider')` if called outside the provider tree.
- Per-unit isolation (D-10) is achieved entirely via the `storageKey` prop (`cart:<restaurantId>:<unitId>`), computed by the Plan 04 caller — the provider has no slug/routing knowledge of its own.
- `npx tsc --noEmit`: no errors. `npm run verify-menu`: all checks still pass (no regression to the Plan 01 data layer).

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared cart-types.ts** - `4c7ac79` (feat)
2. **Task 2: CartProvider + useCart (Context + useReducer + localStorage)** - `f45015b` (feat)

## Files Created/Modified

- `src/lib/menu/cart-types.ts` - `CartItem` type, single source of truth for cart line items
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` - `CartProvider` (Context + reducer + hydrate/persist effects) and `useCart()` hook

## Exported Signatures (for downstream Plan 04)

```typescript
// src/lib/menu/cart-types.ts
export type CartItem = {
  productId: string
  name: string
  price: number   // already Number()-converted from products.price (string) by the caller
  qty: number
  notes: string
}

// src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx
export function CartProvider(props: { children: React.ReactNode; storageKey: string }): JSX.Element
// storageKey MUST be computed by the caller as `cart:${restaurantId}:${unitId}` (D-10) — provider does not resolve slugs.

export function useCart(): {
  state: { items: CartItem[] }
  dispatch: React.Dispatch<CartAction>
}
// CartAction =
//   | { type: 'ADD'; item: CartItem }       // merges by productId: sums qty, overwrites notes if new notes truthy
//   | { type: 'SET_QTY'; productId: string; qty: number }  // qty <= 0 removes the line
//   | { type: 'REMOVE'; productId: string }
//   | { type: 'HYDRATE'; items: CartItem[] } // internal use only (initial localStorage load)
```

Plan 04 must wrap the unit page tree with `<CartProvider storageKey={`cart:${restaurantId}:${unitId}`}>` and call `useCart()` inside any client component nested under it (menu view, product dialog, cart sheet). `useCart()` throws if called outside the provider — Plan 04 should ensure the provider wraps every consumer.

## Decisions Made

- Replicated RESEARCH.md "Pattern 3: Cart Context scoped to the unit route segment" exactly as specified in the plan's own code block, with no deviation — this guarantees Plan 04's expected `useCart()` contract matches byte-for-byte what was planned, eliminating any integration risk between the two parallel Wave 2 plans.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Pure client-side React state + browser localStorage, no new dependencies.

## Next Phase Readiness

- `useCart()` and `CartProvider` are stable, fully-typed contracts ready for Plan 04 to wrap the unit page and dispatch `ADD`/`SET_QTY`/`REMOVE` from the menu view, product dialog, and cart sheet.
- `CartItem` type is the single shared shape — Plan 04 must `Number()`-convert `products.price` (string) before constructing items, consistent with the Plan 01 `formatBRL` calling convention.
- No blockers identified for Plan 04.

---
*Phase: 05-public-customer-menu-selection-browsing-cart*
*Completed: 2026-06-17*

## Self-Check: PASSED

All created files verified present on disk; both task commit hashes (4c7ac79, f45015b) verified present in git history.
