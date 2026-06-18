---
phase: 06-whatsapp-order-generation
verified: 2026-06-18T06:33:00Z
status: human_needed
score: 3/4 truths verified (criterion 4 requires real-device testing, already tracked)
human_verification:
  - test: "Real-device WhatsApp send flow (iOS Safari + Android Chrome)"
    expected: "On both a real iOS Safari device and a real Android Chrome device: empty cart hides the send button; a 10+ item cart with accented/emoji notes opens WhatsApp with the full, undamaged message; the post-send toast fires and the cart is preserved; clear-cart works behind the AlertDialog confirm; a unit with no whatsappNumber shows the red warning instead of the send button."
    why_human: "No CLI/API substitute exists for the native WhatsApp app rendering a wa.me deep link on real iOS Safari / Android Chrome hardware. Additionally, the live database currently has zero seeded `units` rows (4 restaurants, 0 units), so no unit has a real whatsappNumber from which to construct a test wa.me URL in this environment. This was already identified and tracked during execution — see 06-HUMAN-UAT.md for the full 8-step procedure and exact blocker."
    reference: ".planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md"
---

# Phase 6: WhatsApp Order Generation Verification Report

**Phase Goal:** A customer can review their full order and send it as a correctly formatted message via WhatsApp directly to the selected unit's number, completing the core value loop end-to-end.
**Verified:** 2026-06-18T06:33:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Customer sees an order summary (items, quantities, notes, subtotal) before sending | ✓ VERIFIED | `cart-sheet.tsx:79-132` renders item list (name, qty stepper, notes, line price) and a subtotal row; pre-existing Phase 5 behavior, footer (Task added in 06-02) is appended below it, unchanged. |
| 2 | Customer can tap "send order" and it opens WhatsApp (wa.me) pre-filled with a correctly formatted, properly encoded message addressed to the selected unit's number | ✓ VERIFIED (code-level) | `handleSendOrder` (`cart-sheet.tsx:51-63`) is synchronous, calls `buildOrderMessage` + `buildWhatsAppUrl` (`src/lib/menu/whatsapp.ts`), then `window.open(url, '_blank')` with zero awaits before it (iOS-Safari-safe pattern), then `toast.success(...)`. `whatsappNumber` is sourced from the real DB column (`src/db/schema.ts:40`) threaded through `page.tsx` → `cart-fab.tsx` → `cart-sheet.tsx` untouched (`string \| null`, not coalesced). `scripts/verify-whatsapp.ts` (13/13 assertions) proves message structure + digits-only/`encodeURIComponent` round-trip including accents and newlines at the pure-function level. Real wa.me rendering on a phone is criterion #4, tracked separately. |
| 3 | An empty cart shows an appropriate state and cannot be sent | ✓ VERIFIED | Two independent guards: `cart-fab.tsx:22` `if (count === 0) return null` — the entire FAB (including the button that opens the sheet) is unmounted, so the send button is unreachable. `cart-sheet.tsx:73-76` additionally renders "Seu carrinho está vazio" with no footer at all if the sheet is ever open with 0 items. No disabled-but-visible button anywhere. |
| 4 | Order messages with accents, emojis, and large carts (10+ items) render and send correctly on real mobile devices | ? UNCERTAIN — human_needed | Requires physical iOS Safari + Android Chrome devices. The accent/newline encoding round-trip is proven at the code level (`scripts/verify-whatsapp.ts` assertion 13), but actual WhatsApp-app rendering on real hardware was not and cannot be performed by an automated agent. Tracked in `06-HUMAN-UAT.md` (status: pending) — blocked structurally because the live DB has 0 seeded `units` rows, so no real `whatsappNumber` exists yet to build a live test URL. |

**Score:** 3/4 truths verified programmatically; 1/4 requires human/device verification (already identified, not newly discovered).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/menu/whatsapp.ts` | `buildOrderMessage` + `buildWhatsAppUrl` pure functions + `DeliveryType` type | ✓ VERIFIED | Exports match plan exactly: digits-only strip (`replace(/[^0-9]/g, '')`), `encodeURIComponent` (no `URLSearchParams`), no `libphonenumber-js` import, no `address` field referenced. |
| `scripts/verify-whatsapp.ts` | DB-free pure-function assertions for CART-04/CART-05 | ✓ VERIFIED | No `dotenv` import; imports from `../src/lib/menu/whatsapp`; `tsx scripts/verify-whatsapp.ts` exits 0, "all assertions passed", 13/13 PASS including the decode round-trip. |
| `src/components/ui/sonner.tsx` | shadcn sonner Toaster component | ✓ VERIFIED | File exists, exports `Toaster`, no `ThemeProvider` dependency required (defaults theme to "system"). |
| `src/app/.../layout.tsx` | `<Toaster />` mounted once inside `CartProvider` | ✓ VERIFIED | `layout.tsx:3,23` imports and renders `<Toaster />` alongside `{children}`. |
| `src/app/.../cart-provider.tsx` | `CLEAR` reducer action | ✓ VERIFIED | `cart-provider.tsx:11,40-41` — `{ type: 'CLEAR' }` in union, `case 'CLEAR': return { items: [] }` in exhaustive switch (no `default`). |
| `src/app/.../page.tsx` | Passes `restaurant.name`/`unit.name`/`unit.whatsappNumber` to `CartFab` | ✓ VERIFIED | `page.tsx:23-27` — all three props passed, `whatsappNumber` not coalesced. |
| `src/app/.../cart-fab.tsx` | Threads props into `CartSheet`; unchanged empty-cart guard | ✓ VERIFIED | `cart-fab.tsx:8-16,33-39` — typed props, forwarded verbatim; `if (count === 0) return null` intact. |
| `src/app/.../cart-sheet.tsx` | Order-review footer: name field, delivery Tabs (no default), send button, clear-cart AlertDialog, 3-state visibility | ✓ VERIFIED | All elements present and match plan exactly (see Key Link table below for wiring detail). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/verify-whatsapp.ts` | `src/lib/menu/whatsapp.ts` | static import | ✓ WIRED | `import { buildOrderMessage, buildWhatsAppUrl } from '../src/lib/menu/whatsapp'`; script runs and passes. |
| `layout.tsx` | `src/components/ui/sonner.tsx` | import + render | ✓ WIRED | `import { Toaster } from '@/components/ui/sonner'`; `<Toaster />` rendered inside `CartProvider`. |
| `page.tsx` | `cart-fab.tsx` | props `unitName`/`restaurantName`/`whatsappNumber` | ✓ WIRED | Real DB values (`unit.name`, `restaurant.name`, `unit.whatsappNumber`) passed, not hardcoded/empty. |
| `cart-fab.tsx` | `cart-sheet.tsx` | props forwarded | ✓ WIRED | All three props passed straight through unmodified. |
| `cart-sheet.tsx` | `src/lib/menu/whatsapp.ts` | `buildOrderMessage` + `buildWhatsAppUrl` called inside synchronous `handleSendOrder` | ✓ WIRED | Called with live `state.items`, `customerName`, `deliveryType`, `unitName`, `restaurantName`, `whatsappNumber!`. |
| `cart-sheet.tsx` | `window.open` | synchronous call, zero awaits before it | ✓ WIRED | `window.open(url, '_blank')` immediately follows URL construction; `toast.success(...)` after, cart NOT cleared (matches D-06). |
| `cart-sheet.tsx` | `dispatch({ type: 'CLEAR' })` | `AlertDialogAction onClick` | ✓ WIRED | Gated behind confirm dialog ("Limpar carrinho?" / "Limpar tudo"), not auto-fired. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `cart-sheet.tsx` send button reachability | `whatsappNumber` prop | `unit.whatsappNumber` ← `getUnitBySlug` ← `src/db/schema.ts:40` (`text('whatsapp_number')`, nullable) | Yes — real DB column, no hardcoded fallback, no coalescing to `''` | ✓ FLOWING |
| `cart-sheet.tsx` message content | `state.items` | `useCart()` ← `CartProvider` reducer state, hydrated from `localStorage` + live `ADD`/`SET_QTY` dispatches from Phase 5 UI | Yes — real cart state, not mocked | ✓ FLOWING |
| `cart-sheet.tsx` 3-state branch | `whatsappNumber === null` conditional | Same DB column above | Yes — branch genuinely depends on real (currently always-null, since 0 units seeded) data, not a stub literal | ✓ FLOWING (currently exercises the "no whatsappNumber" branch in the live environment because no unit has one seeded yet — this is a data/seeding gap, not a code gap) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pure message-builder + URL-encoder assertions (CART-04/CART-05) | `npx tsx scripts/verify-whatsapp.ts` | 13/13 `PASS`, "verify-whatsapp: all assertions passed" | ✓ PASS |
| No new TypeScript errors in touched files | `npx tsc --noEmit \| grep -E "whatsapp\|cart-sheet\|cart-fab\|cart-provider\|layout.tsx\|page.tsx"` | "NO TYPE ERRORS in touched files" (3 pre-existing unrelated `TS2307` errors in `unit-location-map.tsx` from Phase 04.1, logged in `deferred-items.md`, out of scope) | ✓ PASS |
| Live wa.me deep-link rendering on real phone hardware | N/A — requires physical device + WhatsApp app | Not run | ? SKIP (routed to human_verification, see below) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| CART-04 | 06-01, 06-02 | Order summary reviewable before sending (items, qty, notes, subtotal) + message structure | ✓ SATISFIED | Item list/subtotal pre-existing from Phase 5, footer added below it; `buildOrderMessage` produces the exact D-05 format verified by `verify-whatsapp.ts`. |
| CART-05 | 06-01, 06-02 | Send opens a correctly formatted/encoded wa.me deep link to the unit's number | ✓ SATISFIED (code-level) | `buildWhatsAppUrl` digits-only + `encodeURIComponent`, synchronous `window.open` pattern in `cart-sheet.tsx`. Real-device rendering is success criterion #4, tracked as pending in `06-HUMAN-UAT.md`. |
| CART-06 | 06-02 | Empty cart hides the send button entirely | ✓ SATISFIED | `cart-fab.tsx:22` unmounts the whole FAB at 0 items; `cart-sheet.tsx:73-76` empty-state branch has no footer. |

No orphaned requirements — ROADMAP.md Phase 6 lists exactly CART-04, CART-05, CART-06, matching the union of `requirements:` fields across both plan frontmatters (06-01: CART-04, CART-05; 06-02: CART-04, CART-05, CART-06). REQUIREMENTS.md tracks all three as "Complete" under Phase 6, consistent with code-level completion (the device-rendering portion of CART-05's success criterion is tracked separately, not silently folded into "Complete").

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | Scanned `whatsapp.ts`, `cart-sheet.tsx`, `cart-fab.tsx`, `cart-provider.tsx`, `layout.tsx`, `page.tsx` for TODO/FIXME/placeholder-comments/empty-returns/hardcoded-empty-props — only match was the legitimate `placeholder="Como podemos te chamar?"` HTML input attribute, not a stub marker. No `console.log`-only handlers, no `return null` outside the intentional empty-cart guard, no hardcoded `whatsappNumber=''`/`[]` props at any call site. |

### Human Verification Required

### 1. Real-device WhatsApp send flow (iOS Safari + Android Chrome)

**Test:** Follow the 8-step procedure already documented in `.planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md` — open a unit menu on a real iOS Safari device and a real Android Chrome device; verify empty-cart hides the send button; build a 10+ item cart including an item with an accented/emoji note (e.g. "Pão de Açúcar 🍕 sem cebola"); tap "Enviar pedido via WhatsApp"; confirm WhatsApp opens with the correct unit's chat, the full message intact (accents, line breaks, all items, subtotal, nothing truncated); confirm the post-send toast fires and the cart is preserved; confirm clear-cart works behind the AlertDialog; optionally confirm the no-whatsappNumber red-warning state.

**Expected:** WhatsApp opens pre-filled with the correct, undamaged, fully-encoded message addressed to the unit's real number, on both platforms, matching success criterion #4.

**Why human:** No CLI/API can substitute for the native WhatsApp app rendering a `wa.me` deep link on real mobile hardware. This is also currently blocked at the data level — the live database has 4 restaurants but 0 seeded `units` rows, so there is no unit with a real `whatsappNumber` to build a live test URL from yet. This is a pre-existing, already-documented gap (not newly discovered in this verification) — see `06-HUMAN-UAT.md` for full detail and the exact unblocking steps (seed a unit with a real WhatsApp number, then test on both device platforms).

### Gaps Summary

No code gaps were found. All automated/code-level aspects of the phase goal — order summary review (criterion 1), message building + wa.me URL construction + synchronous window.open + toast (criterion 2's code-level half), and empty-cart send-prevention (criterion 3) — are genuinely implemented, wired to real data (not stubs), and pass all available automated checks (`tsc --noEmit` clean, `verify-whatsapp.ts` 13/13).

The sole open item is success criterion #4 (and the device-rendering half of criterion 2), which requires real iOS Safari + Android Chrome hardware testing. This was correctly identified during plan execution (not glossed over), is already tracked in `06-HUMAN-UAT.md` with status `pending`, and is structurally blocked on seeding at least one `units` row with a real WhatsApp number in the live database before the test can even be attempted. This verification treats it as a legitimate `human_needed` outcome, not a gap to be closed with more code — fabricating a "passed" result for real-device rendering, or writing more code to "fix" a hardware-testing requirement, would both be incorrect responses here.

---

*Verified: 2026-06-18T06:33:00Z*
*Verifier: Claude (gsd-verifier)*
