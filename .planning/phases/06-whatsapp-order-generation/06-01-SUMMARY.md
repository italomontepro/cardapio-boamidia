---
phase: 06-whatsapp-order-generation
plan: 01
subsystem: ui
tags: [whatsapp, wa.me, cart, sonner, toast, pure-functions, encoding]

# Dependency graph
requires:
  - phase: 05-public-customer-menu-selection-browsing-cart
    provides: CartProvider/useCart (Context+useReducer), CartItem type, formatBRL, getUnitBySlug (whatsappNumber field)
provides:
  - "src/lib/menu/whatsapp.ts: buildOrderMessage + buildWhatsAppUrl pure functions + DeliveryType type"
  - "scripts/verify-whatsapp.ts: DB-free regression script for CART-04/CART-05, registered as npm run verify-whatsapp"
  - "CartAction CLEAR case in cart-provider.tsx (empties cart)"
  - "sonner Toaster mounted once in unit layout (no ThemeProvider needed)"
affects: [06-02 (CartSheet footer wiring — send button, name input, delivery Tabs, clear-cart button)]

# Tech tracking
tech-stack:
  added: [sonner@2.0.7, next-themes@0.4.6 (transitive via shadcn sonner block)]
  patterns:
    - "Pure helper module (no React/DOM) for testable business logic, consumed by client components — mirrors format.ts convention"
    - "DB-free tsx verify script (no dotenv/db imports) for pure-function assertions — faster Wave 0 pattern than the DB-backed verify-menu.ts"

key-files:
  created:
    - src/lib/menu/whatsapp.ts
    - scripts/verify-whatsapp.ts
    - src/components/ui/sonner.tsx
  modified:
    - "src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx"
    - "src/app/r/[restaurantSlug]/[unitSlug]/layout.tsx"
    - package.json
    - package-lock.json

key-decisions:
  - "units.address omitted from the WhatsApp message body for v1 (resolved RESEARCH Open Question #2) — message stays D-05-minimal: title/Cliente/delivery-type/items/subtotal"
  - "encodeURIComponent used for message text encoding (not URLSearchParams) — avoids space-as-plus encoding, preserves %0A newlines and UTF-8 accents losslessly"
  - "sonner mounted without a ThemeProvider — useTheme() safely defaults to 'system' per RESEARCH; no provider boilerplate added"
  - "libphonenumber-js NOT re-imported in whatsapp.ts — stored whatsappNumber is already E.164-normalized at write time, a simple digits-only regex strip is sufficient and keeps the customer bundle lighter"

patterns-established:
  - "Pattern: business-logic-as-pure-function — message/URL building lives in src/lib/menu/whatsapp.ts with zero React/DOM coupling, callable from any future UI surface (CartSheet footer in Plan 02) or test script"

requirements-completed: [CART-04, CART-05]

# Metrics
duration: 15min
completed: 2026-06-18
---

# Phase 06 Plan 01: WhatsApp Order Generation Foundation Summary

**Pure `buildOrderMessage`/`buildWhatsAppUrl` helpers + DB-free verify script + cart CLEAR action + sonner Toaster, establishing the Wave 0 foundation Plan 02's CartSheet footer will consume.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-18T05:58:00Z
- **Completed:** 2026-06-18T06:13:06Z
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `src/lib/menu/whatsapp.ts` exports `buildOrderMessage` and `buildWhatsAppUrl` as pure, side-effect-free functions matching the D-05 plain-text message format exactly (title, optional Cliente/delivery-type lines, itemized list with indented `Obs:` notes, subtotal line)
- `scripts/verify-whatsapp.ts` is a fast, DB-free regression script (no dotenv/db imports) asserting all CART-04 message-structure cases and the CART-05 digits-only/`encodeURIComponent` encoding round-trip (including accented PT-BR text and newlines); registered as `npm run verify-whatsapp`, all 13 assertions pass
- Cart reducer gained a `CLEAR` action (`{ items: [] }`) without touching existing ADD/SET_QTY/REMOVE/HYDRATE logic; the existing localStorage persist effect handles writing the cleared state automatically
- `sonner` installed via shadcn CLI and `<Toaster />` mounted once in the unit layout inside `CartProvider`, with no `ThemeProvider` required

## Task Commits

Each task was committed atomically:

1. **Task 1: Create whatsapp.ts pure helper** - `857a8b2` (feat)
2. **Task 2: Wave 0 verify-whatsapp.ts script + npm run verify-whatsapp** - `d690532` (test)
3. **Task 3: Add CLEAR reducer action + install sonner + mount Toaster** - `bb2f1c1` (feat)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `src/lib/menu/whatsapp.ts` - Pure `buildOrderMessage`/`buildWhatsAppUrl` functions + `DeliveryType` type; no React/DOM/libphonenumber-js imports
- `scripts/verify-whatsapp.ts` - DB-free verify script, 13 assertions covering CART-04 message structure and CART-05 URL encoding/round-trip
- `src/components/ui/sonner.tsx` - shadcn-generated Toaster component (theme defaults to "system", no provider needed)
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` - Added `CLEAR` to `CartAction` union and matching reducer case
- `src/app/r/[restaurantSlug]/[unitSlug]/layout.tsx` - Imports and mounts `<Toaster />` alongside `{children}` inside `CartProvider`
- `package.json` / `package-lock.json` - Added `sonner`, `next-themes` dependencies; registered `verify-whatsapp` npm script

## Decisions Made
- Address omitted from message body (RESEARCH Open Question #2 resolved in favor of the UI-SPEC's silence — keeps D-05's exact line structure unambiguous)
- `encodeURIComponent` over `URLSearchParams` for message-text encoding (RESEARCH-mandated, verified locally with accents + newlines)
- No `ThemeProvider` added for sonner (RESEARCH-confirmed safe default)
- No re-import of `libphonenumber-js` in the new pure module (RESEARCH Pitfall 4 — stored value already E.164-normalized at write time)

## Deviations from Plan

**1. [Minor — file path correction, no Rule applies] `cart-provider.tsx` actual location differs from plan frontmatter**
- **Found during:** Task 3 read-first step
- **Issue:** Plan frontmatter's `files_modified` lists `src/lib/menu/cart-provider.tsx`, but the actual `CartProvider`/`useCart` implementation lives at `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` (confirmed via STATE.md's Phase 05 decision log and a direct filesystem search). The plan's task `<action>` and `<read_first>` sections correctly describe the real file's content/behavior, so this was a stale path in the frontmatter list only — not an instruction to create a duplicate file.
- **Fix:** Modified the real file at its actual path; no new file created at the frontmatter's listed path.
- **Files modified:** `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` (not `src/lib/menu/cart-provider.tsx`)
- **Verification:** `grep` acceptance criteria for CLEAR action all pass against the real file; `tsc --noEmit` shows no errors in this file.
- **Committed in:** `bb2f1c1` (Task 3 commit)

---

**Total deviations:** 1 (path correction only, no code/behavior deviation)
**Impact on plan:** None on functionality — same component, same import path (`./cart-provider`) used by `layout.tsx` and `cart-sheet.tsx`. No scope creep.

## Issues Encountered
- Full-project `npx tsc --noEmit` surfaces 3 pre-existing `TS2307` errors in `src/app/painel/unidades/unit-location-map.tsx` (missing leaflet image module declarations from Phase 04.1). Confirmed unrelated to any file this plan touches (filtered `tsc` output for `whatsapp|cart-provider|cart-sheet|layout|sonner` returns clean). Logged in `.planning/phases/06-whatsapp-order-generation/deferred-items.md` per the SCOPE BOUNDARY rule — not fixed in this plan.

## User Setup Required

None - no external service configuration required. `sonner`/`next-themes` installed automatically via `npx shadcn@latest add sonner`.

## Next Phase Readiness
- Plan 02 can now import `buildOrderMessage`/`buildWhatsAppUrl` directly from `src/lib/menu/whatsapp.ts` to wire the CartSheet footer's send button
- `dispatch({ type: 'CLEAR' })` is available for Plan 02's "Limpar carrinho" button (D-08)
- `toast.success(...)` from `sonner` is available for the D-07 post-send confirmation toast — Toaster is already mounted, no further setup needed
- No blockers for Plan 02

---
*Phase: 06-whatsapp-order-generation*
*Completed: 2026-06-18*

## Self-Check: PASSED

All created files verified to exist on disk (`src/lib/menu/whatsapp.ts`, `scripts/verify-whatsapp.ts`,
`src/components/ui/sonner.tsx`, modified `cart-provider.tsx`/`layout.tsx`). All 3 task commits
(`857a8b2`, `d690532`, `bb2f1c1`) confirmed present in `git log`.
