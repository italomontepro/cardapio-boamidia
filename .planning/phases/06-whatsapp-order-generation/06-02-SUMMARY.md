---
phase: 06-whatsapp-order-generation
plan: 02
subsystem: ui
tags: [whatsapp, wa.me, cart, sonner, toast, base-ui-tabs, alert-dialog]

# Dependency graph
requires:
  - phase: 06-whatsapp-order-generation
    plan: 01
    provides: "buildOrderMessage/buildWhatsAppUrl pure helpers, DeliveryType type, CLEAR cart action, sonner Toaster mount"
provides:
  - "CartSheet 3-state footer: empty cart (no footer) / no-whatsappNumber (red warning) / full footer (name + delivery selector + send button + clear-cart)"
  - "page.tsx -> CartFab -> CartSheet prop threading for unitName/restaurantName/whatsappNumber"
  - ".planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md — tracked pending real-device verification item"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synchronous (non-async) click handler calling window.open before any toast/state work, to preserve iOS Safari's transient user-activation window for window.open (RESEARCH Pitfall 1)"
    - "base-ui controlled Tabs with `value ?? ''` / `(v || null) as T` wrapping for nullable enum-like state (mirrors availability-mobile.tsx Phase 4 pattern)"

key-files:
  created:
    - .planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md
  modified:
    - "src/app/r/[restaurantSlug]/[unitSlug]/page.tsx"
    - "src/app/r/[restaurantSlug]/[unitSlug]/cart-fab.tsx"
    - "src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx"

key-decisions:
  - "Task 3 (real-device iOS Safari + Android Chrome manual verification) explicitly SKIPPED for now per user decision, not performed and not silently marked passed — tracked as a pending human-verification item in 06-HUMAN-UAT.md rather than faked or assumed"
  - "Root blocker for Task 3: zero seeded `units` rows exist in the live DB (4 restaurants, 0 units) — no unit has a whatsappNumber from which to construct a real wa.me test URL inside this environment, let alone open it on a physical device"
  - "CART-05/CART-06 marked Complete in REQUIREMENTS.md because the automated/code-complete parts (message building, encoding, 3-state visibility logic, synchronous window.open pattern, verify-whatsapp.ts assertions) all pass; the outstanding real-device rendering check is tracked separately in 06-HUMAN-UAT.md as the source of truth for that gap, mirroring how human_needed verification results are surfaced elsewhere in this project's workflow rather than blocking the requirement checkbox indefinitely"

patterns-established:
  - "Pattern: three-state UI footer driven by two independent booleans (cart empty? / whatsappNumber present?) rendered as three mutually exclusive branches in the same component, rather than three separate components"

requirements-completed: [CART-04, CART-05, CART-06]

# Metrics
duration: 6min (Tasks 1-2; Task 3 deferred, not executed)
completed: 2026-06-18
---

# Phase 06 Plan 02: WhatsApp Order Generation — CartSheet Footer Summary

**CartSheet gains the order-review-and-send footer (name field, no-default pickup/delivery Tabs, synchronous wa.me send button, AlertDialog-gated clear-cart) with full 3-state visibility logic; real-device verification explicitly deferred as pending UAT, not faked.**

## Performance

- **Duration:** 6 min (Tasks 1-2 only)
- **Started:** 2026-06-18T06:15:01Z
- **Completed:** 2026-06-18T06:21:56Z (Tasks 1-2); Task 3 deferred 2026-06-18
- **Tasks:** 2 of 3 executed (Task 3 deferred per explicit user decision)
- **Files modified:** 3 (page.tsx, cart-fab.tsx, cart-sheet.tsx) + 1 created (06-HUMAN-UAT.md)

## Accomplishments
- `page.tsx` passes `unit.name`, `restaurant.name`, and `unit.whatsappNumber` (kept `string | null`, not coalesced) into `CartFab`, which forwards all three to `CartSheet`
- `CartSheet` renders a three-state footer after the existing item list/subtotal: empty cart shows no footer at all (CART-06); a unit with no `whatsappNumber` shows only a red warning + clear-cart button (D-09); a unit with a `whatsappNumber` shows the full footer (name field, no-default pickup/delivery Tabs, send button, clear-cart)
- `handleSendOrder` is a plain synchronous function — `buildOrderMessage` + `buildWhatsAppUrl` build the URL, then `window.open(url, '_blank')` fires with zero awaits beforehand (iOS Safari transient-activation safe per RESEARCH Pitfall 1), followed by a synchronous `toast.success('Pedido enviado! Confira o WhatsApp.')`; the cart is intentionally NOT cleared on send (D-06)
- Clear-cart is gated behind an `AlertDialog` ("Limpar carrinho?" / "Todos os itens serão removidos. Essa ação não pode ser desfeita." / Cancelar / Limpar tudo) dispatching `{ type: 'CLEAR' }` only on confirm (D-08)
- `npx tsc --noEmit` and `tsx scripts/verify-whatsapp.ts` both clean against the changed files

## Task Commits

Each executed task was committed atomically:

1. **Task 1: Thread unitName/restaurantName/whatsappNumber through CartFab** - `7a61a26` (feat)
2. **Task 2: Extend CartSheet footer (name field, delivery selector, send button, clear-cart)** - `c53642b` (feat)
3. **Task 3: Manual real-device verification** - DEFERRED (see below) — documented in `89ae8f1` (paused-position) and this summary, not executed

**Plan metadata:** (this commit — docs: complete plan with Task 3 deferred)

## Files Created/Modified
- `src/app/r/[restaurantSlug]/[unitSlug]/page.tsx` - Passes `unit.name`/`restaurant.name`/`unit.whatsappNumber` into `<CartFab>`
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-fab.tsx` - Gains typed props (`unitName: string`, `restaurantName: string`, `whatsappNumber: string | null`) and forwards them to `<CartSheet>`
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx` - Adds the order-review footer: `customerName`/`deliveryType` local state, three-state conditional rendering, synchronous `handleSendOrder`, `AlertDialog`-gated clear-cart
- `.planning/phases/06-whatsapp-order-generation/06-HUMAN-UAT.md` - New tracked human-verification file recording the deferred real-device test as `pending`, with full 8-step procedure and the exact reason it's blocked

## Decisions Made
- Task 3 (real-device manual verification) explicitly skipped for now at the user's request ("Pular o teste em dispositivo por agora"), documented as pending UAT debt rather than performed, faked, or silently marked passed
- The blocking reason is structural, not a code defect: the live Supabase DB has 4 restaurants but 0 seeded `units` rows, so no unit row has a `whatsappNumber` to build even a test wa.me URL from in this environment
- CART-05/CART-06 are marked Complete in REQUIREMENTS.md because all automated/code-complete acceptance criteria (message structure, encoding round-trip, synchronous `window.open` pattern, 3-state visibility logic, `verify-whatsapp.ts` assertions) pass; the outstanding device-rendering check is NOT silently absorbed into that "Complete" status — it is tracked as its own `pending` item in `06-HUMAN-UAT.md`, which is the source of truth for this specific gap and will surface in future `/gsd:progress` and `/gsd:audit-uat` runs

## Deviations from Plan

### Auto-fixed Issues

None during Tasks 1-2 — both executed exactly as written (already committed in `7a61a26` and `c53642b` prior to this continuation).

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** None on Tasks 1-2 functionality. Task 3 was not auto-fixed or skipped silently — it was explicitly deferred per direct user instruction, per the project's human-verification-gate handling convention (mirrors `human_needed` verification results elsewhere in this project), and is tracked in `06-HUMAN-UAT.md` rather than marked passed.

## Issues Encountered
- Task 3 (`checkpoint:human-verify`, blocking gate) could not be executed in this environment: the live database has zero seeded `units` rows, so there is no unit with a `whatsappNumber` to construct a test wa.me URL from, and the checkpoint specifically requires REAL iOS Safari and REAL Android Chrome physical devices, which this agent has no access to regardless. The user was asked how to proceed and explicitly chose to skip it for now. This is now tracked as a `pending` test in `06-HUMAN-UAT.md` (Gaps section) rather than resolved.

## Known Stubs

None — no hardcoded empty/placeholder data was introduced. The footer's three states are all real conditional logic against live `state.items` and the real `whatsappNumber` prop; nothing is mocked.

## User Setup Required

**Manual device verification is outstanding.** See [06-HUMAN-UAT.md](./06-HUMAN-UAT.md) for:
- The exact 8-step manual test procedure (empty cart, 10+ item cart with accented/emoji notes, send button, post-send toast + cart preservation, clear-cart AlertDialog, no-whatsappNumber warning)
- The precise reason it could not be run in this environment (no seeded units with a `whatsappNumber` in the live DB)
- What's needed before it can be run: seed at least one `units` row with a real/valid E.164 WhatsApp number (via `/painel/unidades` or `scripts/seed.ts`), then perform the test on a real iOS Safari device and a real Android Chrome device

## Next Phase Readiness
- Phase 6 is code-complete: `buildOrderMessage`/`buildWhatsAppUrl` (Plan 01) and the full CartSheet footer (Plan 02) implement CART-04/05/06 end-to-end, verified via `tsc --noEmit` and `tsx scripts/verify-whatsapp.ts`
- Phase-level success criterion #4 ("Order messages with accents, emojis, and large carts (10+ items) render and send correctly on real mobile devices") remains UNVERIFIED on real hardware — this is the one open item blocking a full phase close, tracked in `06-HUMAN-UAT.md`
- Before claiming full phase completion: seed at least one unit with a real WhatsApp number and perform the real-device test described in `06-HUMAN-UAT.md`

---
*Phase: 06-whatsapp-order-generation*
*Completed: 2026-06-18 (Tasks 1-2; Task 3 deferred)*

## Self-Check: PASSED

All modified files verified to exist on disk (`src/app/r/[restaurantSlug]/[unitSlug]/page.tsx`,
`cart-fab.tsx`, `cart-sheet.tsx`). `06-HUMAN-UAT.md` confirmed created. Task commits `7a61a26` and
`c53642b` confirmed present in `git log`. Task 3 correctly NOT claimed as passed — recorded as
`pending` in `06-HUMAN-UAT.md`.
